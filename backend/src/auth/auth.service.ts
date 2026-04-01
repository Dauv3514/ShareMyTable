import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import {
  ForgotPasswordDto,
  InscriptionDto,
  ResetPasswordDto,
} from '../auth/auth.dto';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

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

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

    await this.usersService.setEmailVerificationToken(user.id, tokenHash, expiresAt);

    const baseUrl = process.env.BACKEND_URL ?? 5001;
    const verifyUrl = `${baseUrl}/auth/verify-email?token=${token}`;
    await this.mailService.sendVerifyEmail(user.email, verifyUrl);

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

    const isValid = await bcrypt.compare(pass, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Mot de passe incorrect');

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
    };

    return { access_token: await this.jwtService.signAsync(payload) };
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

      const baseUrl = process.env.FRONTEND_URL ?? process.env.BACKEND_URL;
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
}
