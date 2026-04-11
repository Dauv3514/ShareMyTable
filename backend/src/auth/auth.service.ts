import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { ChangePasswordDto, ForgotPasswordDto, InscriptionDto, ResetPasswordDto } from '../auth/auth.dto';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { AuthProvider, Utilisateur } from '../users/users.entity';

type OAuthProfile = {
  id?: string;
  emails?: Array<{ value: string }>;
  name?: { givenName?: string; familyName?: string };
  displayName?: string;
  photos?: Array<{ value: string }>;
};

type OAuthPendingPayload = {
  type: 'oauth_pending';
  provider: AuthProvider;
  providerId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profilePhotoUrl?: string;
};

type MissingFlags = { email: boolean; firstName: boolean; lastName: boolean };

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  private async sendEmailVerification(user: Utilisateur) {
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

    await this.usersService.setEmailVerificationToken(user.id, tokenHash, expiresAt);

    const baseUrl =
      process.env.BACKEND_URL ?? `http://localhost:${process.env.PORT ?? 5001}`;
    const verifyUrl = `${baseUrl}/auth/verify-email?token=${token}`;
    await this.mailService.sendVerifyEmail(user.email, verifyUrl);
  }

  async inscription(userDto: InscriptionDto) {
    const normalizedPseudo = userDto.pseudo?.trim() || undefined;
    const normalizedEmail = userDto.email.trim().toLowerCase();
    const { password_hash } = userDto;

    if (normalizedPseudo) {
      const existingUser = await this.usersService.findByPseudo(normalizedPseudo);
      if (existingUser) {
        throw new BadRequestException('Ce pseudo existe deja');
      }
    }

    const existingUserByEmail = await this.usersService.findOne(normalizedEmail);
    if (existingUserByEmail) {
      throw new BadRequestException('Cet email existe deja');
    }

    if (!password_hash) {
      throw new BadRequestException('Le mot de passe est obligatoire');
    }

    const hashedPassword = await bcrypt.hash(password_hash, 10);

    const user = await this.usersService.create({
      ...userDto,
      pseudo: normalizedPseudo,
      email: normalizedEmail,
      password_hash: hashedPassword,
    });

    await this.sendEmailVerification(user);

    return {
      success: true,
      message: 'Utilisateur cree avec succes',
      username: user.pseudo,
      userId: user.id,
    };
  }

  async connexion(email: string, pass: string) {
    const user = await this.usersService.findOne(email);
    if (!user) throw new UnauthorizedException("Cet email n'est pas enregistre");

    if (!user.passwordHash) {
      throw new UnauthorizedException('Ce compte utilise un fournisseur externe');
    }

    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException("Veuillez verifier votre adresse email");
    }

    const isValid = await bcrypt.compare(pass, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Mot de passe incorrect');

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role?.name,
      nom: user.lastName,
    };

    return { access_token: await this.jwtService.signAsync(payload) };
  }

  async oauthLogin(provider: AuthProvider, profile: OAuthProfile) {
    const providerId = profile?.id;
    if (!providerId) {
      throw new BadRequestException('Identifiant fournisseur manquant');
    }

    const normalize = (value?: string) =>
      value && value.trim().length > 0 ? value.trim() : undefined;

    const email = normalize(profile.emails?.[0]?.value);
    const displayNameParts = profile.displayName?.split(' ');
    const firstName = normalize(profile.name?.givenName ?? displayNameParts?.[0]);
    const lastName = normalize(
      profile.name?.familyName ?? displayNameParts?.slice(1).join(' '),
    );

    const missingEmail = !email;
    const missingFirstName = !firstName;
    const missingLastName = !lastName;

    const buildPending = async (overrides?: {
      email?: string;
      firstName?: string;
      lastName?: string;
      profilePhotoUrl?: string;
      missing?: Partial<MissingFlags>;
      reason?: 'missing_identity' | 'profile_incomplete' | 'not_registered';
    }) => {
      const pendingEmail = overrides?.email ?? email;
      const pendingFirstName = overrides?.firstName ?? firstName;
      const pendingLastName = overrides?.lastName ?? lastName;
      const missing: MissingFlags = {
        email: overrides?.missing?.email ?? !pendingEmail,
        firstName: overrides?.missing?.firstName ?? !pendingFirstName,
        lastName: overrides?.missing?.lastName ?? !pendingLastName,
      };

      const pendingToken = await this.jwtService.signAsync(
        {
          type: 'oauth_pending',
          provider,
          providerId,
          email: pendingEmail,
          firstName: pendingFirstName,
          lastName: pendingLastName,
          profilePhotoUrl: overrides?.profilePhotoUrl ?? profile.photos?.[0]?.value,
        } satisfies OAuthPendingPayload,
        { expiresIn: '10m' },
      );

      return {
        type: 'pending' as const,
        pendingToken,
        missing,
        reason: overrides?.reason,
      };
    };

    const issueToken = async (user: Utilisateur) => {
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role?.name,
        nom: user.lastName,
      };
      const token = await this.jwtService.signAsync(payload);
      return { type: 'complete' as const, access_token: token, isProfileComplete: user.isProfileComplete };
    };

    let user = await this.usersService.findByProvider(provider, providerId);

    if (!user) {
      if (email) {
        user = await this.usersService.findOne(email);
      }

      if (user) {
        await this.usersService.linkProvider(user.id, provider, providerId);
      }
    }

    if (user) {
      if (!user.emailVerifiedAt) {
        await this.sendEmailVerification(user);
        return { type: 'verify' as const };
      }

      if (user.isProfileComplete) {
        return issueToken(user);
      }

      return buildPending({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePhotoUrl: user.profilePhotoUrl ?? undefined,
        missing: { email: false, firstName: false, lastName: false },
        reason: 'profile_incomplete',
      });
    }

    if (missingEmail || missingFirstName || missingLastName) {
      return buildPending({ reason: 'missing_identity' });
    }

    // Profil incomplet tant que pays/ville/date de naissance ne sont pas fournis
    return buildPending({
      missing: { email: false, firstName: false, lastName: false },
      reason: 'not_registered',
    });
  }

  async completeOAuthProfile(params: {
    pendingToken: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    country: string;
    city: string;
    birthDate: Date;
    pseudo?: string;
    bio?: string;
    profilePhotoUrl?: string;
  }) {
    let payload: OAuthPendingPayload;
    try {
      payload = (await this.jwtService.verifyAsync(params.pendingToken)) as OAuthPendingPayload;
    } catch {
      throw new BadRequestException('Token OAuth invalide ou expiré');
    }

    if (payload.type !== 'oauth_pending') {
      throw new BadRequestException('Token OAuth invalide');
    }

    const normalize = (value?: string) =>
      value && value.trim().length > 0 ? value.trim() : undefined;

    const email = normalize(payload.email) ?? normalize(params.email);
    const firstName = normalize(payload.firstName) ?? normalize(params.firstName);
    const lastName = normalize(payload.lastName) ?? normalize(params.lastName);

    if (!email || !firstName || !lastName) {
      throw new BadRequestException('Informations manquantes');
    }

    if (!params.birthDate || Number.isNaN(params.birthDate.getTime())) {
      throw new BadRequestException('Date de naissance invalide');
    }

    let user = await this.usersService.findByProvider(payload.provider, payload.providerId);
    if (!user) {
      user = await this.usersService.findOne(email);
      if (user) {
        await this.usersService.linkProvider(user.id, payload.provider, payload.providerId);
      } else {
        user = await this.usersService.createOAuthUser({
          email,
          firstName,
          lastName,
          profilePhotoUrl: params.profilePhotoUrl ?? payload.profilePhotoUrl,
          provider: payload.provider,
          providerId: payload.providerId,
          country: params.country,
          city: params.city,
          birthDate: params.birthDate,
          pseudo: params.pseudo,
          bio: params.bio,
        });
        await this.sendEmailVerification(user);
        return { verification_required: true };
      }
    }

    if (!user) {
      throw new BadRequestException('Utilisateur introuvable');
    }

    if (!user.emailVerifiedAt) {
      await this.sendEmailVerification(user);
      return { verification_required: true };
    }

    await this.usersService.completeProfile(user.id, {
      country: params.country,
      city: params.city,
      birthDate: params.birthDate,
      pseudo: params.pseudo,
      bio: params.bio,
      profilePhotoUrl: params.profilePhotoUrl,
    });

    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role?.name,
      nom: user.lastName,
    });

    return { access_token: token };
  }

  buildOAuthRedirect(token: string, isProfileComplete: boolean) {
    const baseUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const redirectUrl = new URL('/auth/callback', baseUrl);
    redirectUrl.searchParams.set('token', token);
    redirectUrl.searchParams.set('profileComplete', String(isProfileComplete));
    return redirectUrl.toString();
  }

  buildOAuthPendingRedirect(params: {
    pendingToken: string;
    missing: { email: boolean; firstName: boolean; lastName: boolean };
    reason?: 'missing_identity' | 'profile_incomplete' | 'not_registered';
  }) {
    const baseUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const redirectUrl = new URL('/complete-profile', baseUrl);
    redirectUrl.searchParams.set('pending', params.pendingToken);
    if (params.missing.email) redirectUrl.searchParams.set('missingEmail', '1');
    if (params.missing.firstName) redirectUrl.searchParams.set('missingFirstName', '1');
    if (params.missing.lastName) redirectUrl.searchParams.set('missingLastName', '1');
    if (params.reason) redirectUrl.searchParams.set('reason', params.reason);
    return redirectUrl.toString();
  }

  async verifyEmail(token: string) {
    if (!token) {
      throw new BadRequestException('Token manquant');
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const user = await this.usersService.findByEmailVerificationTokenHash(tokenHash);
    if (
      !user ||
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt < new Date()
    ) {
      throw new BadRequestException('Token invalide ou expire');
    }

    await this.usersService.updateEmailVerifiedAt(user.id, new Date());
    await this.usersService.clearEmailVerificationToken(user.id);

    return { success: true, message: 'Email verifie avec succes' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findOne(dto.email);

    if (user) {
      const token = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

      await this.usersService.setPasswordResetToken(user.id, tokenHash, expiresAt);

      const baseUrl =
        process.env.FRONTEND_URL ??
        process.env.BACKEND_URL ??
        `http://localhost:${process.env.PORT ?? 5001}`;
      const resetUrl = `${baseUrl}/nouveau-mot-de-passe?token=${token}`;
      await this.mailService.sendResetPasswordEmail(user.email, resetUrl);
    }

    return {
      success: true,
      message: 'Si cet email existe, un lien de reinitialisation a ete envoye.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { token, new_password } = dto;

    if (!token) {
      throw new BadRequestException('Token manquant');
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const user = await this.usersService.findByPasswordResetTokenHash(tokenHash);
    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new BadRequestException('Token invalide ou expire');
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await this.usersService.updatePasswordHash(user.id, hashedPassword);
    await this.usersService.clearPasswordResetToken(user.id);

    return { success: true, message: 'Mot de passe mis a jour' };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.usersService.findOneUser(userId);
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    if (user.authProvider !== AuthProvider.LOCAL || !user.passwordHash) {
      throw new BadRequestException(
        'Ce compte utilise un fournisseur externe. Le mot de passe se gère aupres de ce fournisseur.',
      );
    }

    const isCurrentPasswordValid = await bcrypt.compare(dto.current_password, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }

    const isSamePassword = await bcrypt.compare(dto.new_password, user.passwordHash);
    if (isSamePassword) {
      throw new BadRequestException('Le nouveau mot de passe doit etre different de l ancien');
    }

    const hashedPassword = await bcrypt.hash(dto.new_password, 10);
    await this.usersService.updatePasswordHash(user.id, hashedPassword);

    return { success: true, message: 'Mot de passe mis a jour' };
  }
}