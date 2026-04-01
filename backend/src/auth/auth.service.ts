import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { InscriptionDto, ForgotPasswordDto, ResetPasswordDto } from '../auth/auth.dto';
import { MailService } from '../mail/mail.service';
import { AuthProvider } from '../users/users.entity';

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

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private mailService: MailService,
    ) { }

    async inscription(userDto: InscriptionDto) {
        const {
            pseudo,
            password_hash,
        } = userDto;

        // Vérification du pseudo existant
        if (pseudo) {
            const existingUser = await this.usersService.findByPseudo(pseudo);
            if (existingUser) {
                throw new BadRequestException('Ce pseudo existe déjà');
            }
        }

        if (!password_hash) {
            throw new BadRequestException('Le mot de passe est obligatoire');
        }

        // Hash du mot de passe
        const hashedPassword = await bcrypt.hash(password_hash, 10);

        const user = await this.usersService.create({
            ...userDto,
            password_hash: hashedPassword,
        });

        const token = randomBytes(32).toString('hex');
        const tokenHash = createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

        await this.usersService.setEmailVerificationToken(user.id, tokenHash, expiresAt);

        const baseUrl =
            process.env.BACKEND_URL ?? 5001;
        const verifyUrl = `${baseUrl}/auth/verify-email?token=${token}`;
        await this.mailService.sendVerifyEmail(user.email, verifyUrl);

        return {
            success: true,
            message: "Utilisateur créé avec succès",
            username: user.pseudo,
            userId: user.id,
        };
    }

    async connexion(email: string, pass: string) {
        const user = await this.usersService.findOne(email);
        if (!user) throw new UnauthorizedException('Cet email n\'est pas enregistré');

        if (!user.passwordHash) {
            throw new UnauthorizedException('Ce compte utilise un fournisseur externe');
        }

        const isValid = await bcrypt.compare(pass, user.passwordHash);
        if (!isValid) throw new UnauthorizedException('Mot de passe incorrect');

        const payload = {
            sub: user.id,
            email: user.email,
            roles: user.roles,
            nom: user.lastName
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

        if (missingEmail || missingFirstName || missingLastName) {
            const pendingToken = await this.jwtService.signAsync(
                {
                    type: 'oauth_pending',
                    provider,
                    providerId,
                    email,
                    firstName,
                    lastName,
                    profilePhotoUrl: profile.photos?.[0]?.value,
                } satisfies OAuthPendingPayload,
                { expiresIn: '10m' },
            );

            return {
                type: 'pending' as const,
                pendingToken,
                missing: {
                    email: missingEmail,
                    firstName: missingFirstName,
                    lastName: missingLastName,
                },
            };
        }

        let user = await this.usersService.findByProvider(provider, providerId);

        if (!user) {
            user = await this.usersService.findOne(email);

            if (user) {
                await this.usersService.linkProvider(user.id, provider, providerId);
            } else {
                user = await this.usersService.createOAuthUser({
                    email,
                    firstName,
                    lastName,
                    profilePhotoUrl: profile.photos?.[0]?.value,
                    provider,
                    providerId,
                });
            }
        }

        const payload = {
            sub: user.id,
            email: user.email,
            roles: user.roles,
            nom: user.lastName,
        };
        const token = await this.jwtService.signAsync(payload);
        return { type: 'complete' as const, access_token: token, isProfileComplete: user.isProfileComplete };
    }

    async completeOAuthProfile(params: {
        pendingToken: string;
        email?: string;
        firstName?: string;
        lastName?: string;
        country: string;
        city: string;
        birthDate: Date;
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
                    profilePhotoUrl: payload.profilePhotoUrl,
                    provider: payload.provider,
                    providerId: payload.providerId,
                });
            }
        }

        await this.usersService.completeProfile(user.id, {
            country: params.country,
            city: params.city,
            birthDate: params.birthDate,
        });

        const token = await this.jwtService.signAsync({
            sub: user.id,
            email: user.email,
            roles: user.roles,
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
    }) {
        const baseUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
        const redirectUrl = new URL('/complete-profile', baseUrl);
        redirectUrl.searchParams.set('pending', params.pendingToken);
        if (params.missing.email) redirectUrl.searchParams.set('missingEmail', '1');
        if (params.missing.firstName) redirectUrl.searchParams.set('missingFirstName', '1');
        if (params.missing.lastName) redirectUrl.searchParams.set('missingLastName', '1');
        return redirectUrl.toString();
    }

    // fonction de vérification de l'email lors de l'inscription

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
            throw new BadRequestException('Token invalide ou expiré');
        }

        await this.usersService.updateEmailVerifiedAt(user.id, new Date());
        await this.usersService.clearEmailVerificationToken(user.id);

        return { success: true, message: 'Email vérifié avec succès' };
    }

    // fonctions de réinitialisation du mot de passe

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
            message: 'Si cet email existe, un lien de réinitialisation a été envoyé.',
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
            throw new BadRequestException('Token invalide ou expiré');
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);
        await this.usersService.updatePasswordHash(user.id, hashedPassword);
        await this.usersService.clearPasswordResetToken(user.id);

        return { success: true, message: 'Mot de passe mis à jour' };
    }
}
