import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InscriptionDto } from '../auth/auth.dto';
import { Role, RoleName } from './role.entity';
import { AccountStatus, Utilisateur, AuthProvider } from './users.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Utilisateur)
    private readonly usersRepository: Repository<Utilisateur>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  async create(userDto: InscriptionDto): Promise<Utilisateur> {
    const defaultRole = await this.findOrCreateRole(RoleName.USER);

    const newUser = this.usersRepository.create({
      pseudo: this.normalizeNullableString(userDto.pseudo),
      email: userDto.email.trim().toLowerCase(),
      firstName: userDto.first_name.trim(),
      lastName: userDto.last_name.trim(),
      profilePhotoUrl: this.normalizeNullableString(userDto.profile_photo_url),
      passwordHash: userDto.password_hash,
      city: userDto.city.trim(),
      country: userDto.country.trim(),
      bio: this.normalizeNullableString(userDto.bio),
      birthDate: userDto.birth_date ? new Date(userDto.birth_date) : undefined,
      accountStatus: AccountStatus.ACTIVE,
      role: defaultRole,
      authProvider: AuthProvider.LOCAL,
      isProfileComplete: true,
    });

    return this.usersRepository.save(newUser);
  }

  async findAll(): Promise<Utilisateur[]> {
    return this.usersRepository.find();
  }

  async findOne(email: string): Promise<Utilisateur | undefined> {
    const user = await this.usersRepository.findOne({
      where: { email: email.trim().toLowerCase() },
    });
    return user ?? undefined;
  }

  async findByPseudo(pseudo: string): Promise<Utilisateur | undefined> {
    const normalizedPseudo = this.normalizeNullableString(pseudo);
    if (!normalizedPseudo) {
      return undefined;
    }

    const user = await this.usersRepository.findOne({
      where: { pseudo: normalizedPseudo },
    });
    return user ?? undefined;
  }

  async findOneUser(id: number): Promise<Utilisateur | undefined> {
    const user = await this.usersRepository.findOne({ where: { id } });
    return user ?? undefined;
  }

  async setRole(userId: number, roleName: RoleName): Promise<Utilisateur> {
    const user = await this.findOneUser(userId);
    if (!user) {
      throw new NotFoundException('Utilisateur non trouve');
    }

    user.role = await this.findOrCreateRole(roleName);
    return this.usersRepository.save(user);
  }

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

  private async findOrCreateRole(roleName: RoleName): Promise<Role> {
    const existingRole = await this.rolesRepository.findOne({
      where: { name: roleName },
    });

    if (existingRole) {
      return existingRole;
    }

    const role = this.rolesRepository.create({ name: roleName });
    return this.rolesRepository.save(role);
  }

  private normalizeNullableString(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
  }
  // fonctions authentification OAuth (google / apple)

  async createOAuthUser(params: {
    email: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl?: string;
    provider: AuthProvider;
    providerId: string;
  }): Promise<Utilisateur> {
    const defaultRole = await this.findOrCreateRole(RoleName.USER);
    const newUser = this.usersRepository.create({
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
      profilePhotoUrl: params.profilePhotoUrl,
      passwordHash: null,
      accountStatus: AccountStatus.ACTIVE,
      role: defaultRole,
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
