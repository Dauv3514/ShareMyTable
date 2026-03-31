import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Utilisateur, AccountStatus, UserRole } from './users.entity';
import { InscriptionDto } from '../auth/auth.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Utilisateur)
    private usersRepository: Repository<Utilisateur>,
  ) {}

  async create(userDto: InscriptionDto) {
    const newUser = this.usersRepository.create({
      pseudo: userDto.pseudo,
      email: userDto.email,
      firstName: userDto.first_name,
      lastName: userDto.last_name,
      profilePhotoUrl: userDto.profile_photo_url,
      passwordHash: userDto.password_hash,
      city: userDto.city,
      country: userDto.country,
      bio: userDto.bio,
      birthDate: userDto.birth_date ? new Date(userDto.birth_date) : undefined,
      accountStatus: AccountStatus.ACTIVE,
      roles: UserRole.USER,
    });
    return this.usersRepository.save(newUser);
  }

  async findAll(): Promise<Utilisateur[]> {
    return this.usersRepository.find();
  }

  async findOne(email: string): Promise<Utilisateur | undefined> {
    const user = await this.usersRepository.findOne({ where: { email } });
    return user ?? undefined;
  }

  async findByPseudo(pseudo: string): Promise<Utilisateur | undefined> {
    const user = await this.usersRepository.findOne({ where: { pseudo } });
    return user ?? undefined;
  }

  async findOneUser(id: number): Promise<Utilisateur | undefined> {
    const user = await this.usersRepository.findOne({ where: { id } });
    return user ?? undefined;
  }

  // fonctions de vérification de l'email lors de l'inscription

  async updateEmailVerifiedAt(userId: number, verifiedAt: Date) {
    await this.usersRepository.update({ id: userId }, { emailVerifiedAt: verifiedAt });
  }

  async setEmailVerificationToken(userId: number, tokenHash: string, expiresAt: Date) {
    await this.usersRepository.update(
      { id: userId },
      { emailVerificationTokenHash: tokenHash, emailVerificationExpiresAt: expiresAt },
    );
  }

  async findByEmailVerificationTokenHash(tokenHash: string): Promise<Utilisateur | undefined> {
    const user = await this.usersRepository.findOne({
      where: { emailVerificationTokenHash: tokenHash },
    });
    return user ?? undefined;
  }

  async clearEmailVerificationToken(userId: number) {
    await this.usersRepository.update(
      { id: userId },
      { emailVerificationTokenHash: null, emailVerificationExpiresAt: null },
    );
  }

  // fonctions de réinitialisation du mot de passe

  async setPasswordResetToken(userId: number, tokenHash: string, expiresAt: Date) {
    await this.usersRepository.update(
      { id: userId },
      { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt },
    );
  }

  async findByPasswordResetTokenHash(tokenHash: string): Promise<Utilisateur | undefined> {
    const user = await this.usersRepository.findOne({
      where: { passwordResetTokenHash: tokenHash },
    });
    return user ?? undefined;
  }

  async clearPasswordResetToken(userId: number) {
    await this.usersRepository.update(
      { id: userId },
      { passwordResetTokenHash: null, passwordResetExpiresAt: null },
    );
  }

  async updatePasswordHash(userId: number, passwordHash: string) {
    await this.usersRepository.update({ id: userId }, { passwordHash });
  }
}