import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Utilisateur, AccountStatus, UserRole, AuthProvider } from './users.entity';
import { InscriptionDto } from '../auth/auth.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Utilisateur)
    private usersRepository: Repository<Utilisateur>,
  ) { }

  async create(userDto: InscriptionDto): Promise<Utilisateur> {
    const pseudo = userDto.pseudo?.trim();
    const newUser = this.usersRepository.create({
      pseudo: pseudo ? pseudo : undefined,
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
      authProvider: AuthProvider.LOCAL,
      isProfileComplete: true,
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

  // fonctions authentification OAuth (google / apple)

  async createOAuthUser(params: {
    email: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl?: string;
    provider: AuthProvider;
    providerId: string;
  }) {
    const newUser = this.usersRepository.create({
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
      profilePhotoUrl: params.profilePhotoUrl,
      passwordHash: null,
      accountStatus: AccountStatus.ACTIVE,
      roles: UserRole.USER,
      authProvider: params.provider,
      authProviderId: params.providerId,
      emailVerifiedAt: new Date(),
      isProfileComplete: false,
    });
    return this.usersRepository.save(newUser);
  }

  async findByProvider(provider: AuthProvider, providerId: string): Promise<Utilisateur | undefined> {
    const user = await this.usersRepository.findOne({
      where: { authProvider: provider, authProviderId: providerId },
    });
    return user ?? undefined;
  }

  async linkProvider(userId: number, provider: AuthProvider, providerId: string) {
    await this.usersRepository.update(
      { id: userId },
      { authProvider: provider, authProviderId: providerId },
    );
  }

  async completeProfile(
    userId: number,
    data: { country: string; city: string; birthDate: Date },
  ) {
    await this.usersRepository.update(
      { id: userId },
      {
        country: data.country,
        city: data.city,
        birthDate: data.birthDate,
        isProfileComplete: true,
      },
    );
    const updatedUser = await this.usersRepository.findOne({ where: { id: userId } });
    if (!updatedUser) throw new NotFoundException('Utilisateur non trouvé');
    return updatedUser;
  }
}
