import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, IsNull, Repository } from 'typeorm';
import { InscriptionDto } from '../auth/auth.dto';
import { PreferenceTag, PreferenceTagCategory } from './preference-tag.entity';
import { Role, RoleName } from './role.entity';
import { UserPreferenceTag } from './user-preference-tag.entity';
import { AccountStatus, AuthProvider, Utilisateur } from './users.entity';

type UserPreferenceSummary = {
  dietaryTags: string[];
  ambianceTags: string[];
};

const DEFAULT_PREFERENCE_TAGS: Array<{
  label: string;
  category: PreferenceTagCategory;
}> = [
  { label: 'Sans gluten', category: PreferenceTagCategory.DIETARY },
  {
    label: 'Discussions enrichissantes',
    category: PreferenceTagCategory.MEAL_AMBIANCE,
  },
];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Utilisateur)
    private readonly usersRepository: Repository<Utilisateur>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(PreferenceTag)
    private readonly preferenceTagsRepository: Repository<PreferenceTag>,
    @InjectRepository(UserPreferenceTag)
    private readonly userPreferenceTagsRepository: Repository<UserPreferenceTag>,
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

    const savedUser = await this.usersRepository.save(newUser);
    await this.assignDefaultPreferenceTags(savedUser.id);
    return savedUser;
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

  async getUserPreferenceSummary(
    userId: number,
    options?: { initializeDefaults?: boolean },
  ): Promise<UserPreferenceSummary> {
    const user = await this.findOneUser(userId);
    if (!user) {
      throw new NotFoundException('Utilisateur non trouve');
    }

    let userPreferenceTags = await this.userPreferenceTagsRepository.find({
      where: { userId },
    });

    if (userPreferenceTags.length === 0 && options?.initializeDefaults) {
      await this.assignDefaultPreferenceTags(userId);
      userPreferenceTags = await this.userPreferenceTagsRepository.find({
        where: { userId },
      });
    }

    return this.buildPreferenceSummaryFromLinks(userPreferenceTags);
  }

  async updateUserPreferenceSummary(
    userId: number,
    data: UserPreferenceSummary,
  ): Promise<UserPreferenceSummary> {
    const user = await this.findOneUser(userId);
    if (!user) {
      throw new NotFoundException('Utilisateur non trouve');
    }

    const normalizedDietaryTags = this.uniqueNormalizedTags(data.dietaryTags);
    const normalizedAmbianceTags = this.uniqueNormalizedTags(data.ambianceTags);

    const desiredTags = await Promise.all([
      ...normalizedDietaryTags.map((tag) =>
        this.resolvePreferenceTag(userId, tag, PreferenceTagCategory.DIETARY),
      ),
      ...normalizedAmbianceTags.map((tag) =>
        this.resolvePreferenceTag(userId, tag, PreferenceTagCategory.MEAL_AMBIANCE),
      ),
    ]);

    const desiredTagIds = new Set(desiredTags.map((tag) => tag.id));
    const existingLinks = await this.userPreferenceTagsRepository.find({
      where: { userId },
    });

    const linksToRemove = existingLinks.filter((link) => !desiredTagIds.has(link.tagId));
    if (linksToRemove.length > 0) {
      await this.userPreferenceTagsRepository.remove(linksToRemove);
    }

    const existingTagIds = new Set(existingLinks.map((link) => link.tagId));
    const linksToCreate = desiredTags
      .filter((tag) => !existingTagIds.has(tag.id))
      .map((tag) =>
        this.userPreferenceTagsRepository.create({
          userId,
          tagId: tag.id,
        }),
      );

    if (linksToCreate.length > 0) {
      await this.userPreferenceTagsRepository.save(linksToCreate);
    }

    const updatedLinks = await this.userPreferenceTagsRepository.find({
      where: { userId },
    });

    return this.buildPreferenceSummaryFromLinks(updatedLinks);
  }

  async setRole(userId: number, roleName: RoleName): Promise<Utilisateur> {
    const user = await this.findOneUser(userId);
    if (!user) {
      throw new NotFoundException('Utilisateur non trouve');
    }

    user.role = await this.findOrCreateRole(roleName);
    return this.usersRepository.save(user);
  }

  async setRoleWithManager(
    manager: EntityManager,
    userId: number,
    roleName: RoleName,
  ): Promise<Utilisateur> {
    const userRepository = manager.getRepository(Utilisateur);
    const roleRepository = manager.getRepository(Role);

    const user = await userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouve');
    }

    let role = await roleRepository.findOne({ where: { name: roleName } });
    if (!role) {
      role = await roleRepository.save(roleRepository.create({ name: roleName }));
    }

    user.role = role;
    return userRepository.save(user);
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

  async createOAuthUser(params: {
    email: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl?: string;
    provider: AuthProvider;
    providerId: string;
    country?: string;
    city?: string;
    birthDate?: Date;
    pseudo?: string;
    bio?: string;
  }): Promise<Utilisateur> {
    const defaultRole = await this.findOrCreateRole(RoleName.USER);
    const isProfileComplete = Boolean(params.country && params.city && params.birthDate);
    const newUser = this.usersRepository.create({
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
      profilePhotoUrl: params.profilePhotoUrl,
      country: params.country ?? null,
      city: params.city ?? null,
      birthDate: params.birthDate ?? null,
      pseudo: this.normalizeNullableString(params.pseudo),
      bio: this.normalizeNullableString(params.bio),
      passwordHash: null,
      accountStatus: AccountStatus.ACTIVE,
      role: defaultRole,
      authProvider: params.provider,
      authProviderId: params.providerId,
      emailVerifiedAt: null,
      isProfileComplete,
    } as DeepPartial<Utilisateur>);

    const savedUser = await this.usersRepository.save(newUser);
    await this.assignDefaultPreferenceTags(savedUser.id);
    return savedUser;
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
    data: {
      country: string;
      city: string;
      birthDate: Date;
      pseudo?: string;
      bio?: string;
      profilePhotoUrl?: string | null;
    },
  ) {
    const updateData: DeepPartial<Utilisateur> = {
      country: data.country,
      city: data.city,
      birthDate: data.birthDate,
      pseudo: this.normalizeNullableString(data.pseudo),
      bio: this.normalizeNullableString(data.bio),
      isProfileComplete: true,
    };

    if (data.profilePhotoUrl !== undefined) {
      updateData.profilePhotoUrl = this.normalizeNullableString(data.profilePhotoUrl);
    }

    await this.usersRepository.update({ id: userId }, updateData);
    const updatedUser = await this.usersRepository.findOne({ where: { id: userId } });
    if (!updatedUser) throw new NotFoundException('Utilisateur non trouvé');
    return updatedUser;
  }

  async updateProfile(
    userId: number,
    data: {
      firstName: string;
      lastName: string;
      phone?: string;
      pseudo?: string;
      country: string;
      city: string;
      bio?: string;
      birthDate: Date;
      profilePhotoUrl?: string | null;
    },
  ) {
    const updateData: DeepPartial<Utilisateur> = {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      phone: this.normalizeNullableString(data.phone),
      pseudo: this.normalizeNullableString(data.pseudo),
      country: data.country.trim(),
      city: data.city.trim(),
      bio: this.normalizeNullableString(data.bio),
      birthDate: data.birthDate,
    };

    if (data.profilePhotoUrl !== undefined) {
      updateData.profilePhotoUrl = this.normalizeNullableString(data.profilePhotoUrl);
    }

    await this.usersRepository.update({ id: userId }, updateData);

    const updatedUser = await this.usersRepository.findOne({ where: { id: userId } });
    if (!updatedUser) throw new NotFoundException('Utilisateur non trouvé');
    return updatedUser;
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

  private normalizePreferenceTagLabel(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private toPreferenceSlug(value: string): string {
    return this.normalizePreferenceTagLabel(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);
  }

  private uniqueNormalizedTags(tags: string[]): string[] {
    const seen = new Set<string>();
    const normalizedTags: string[] = [];

    for (const tag of tags) {
      const normalizedTag = this.normalizePreferenceTagLabel(tag);
      if (!normalizedTag) {
        continue;
      }

      const key = normalizedTag
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      normalizedTags.push(normalizedTag);
    }

    return normalizedTags;
  }

  private buildPreferenceSummaryFromLinks(
    userPreferenceTags: UserPreferenceTag[],
  ): UserPreferenceSummary {
    const dietaryTags: string[] = [];
    const ambianceTags: string[] = [];

    userPreferenceTags
      .filter((link) => link.tag?.isActive)
      .sort((left, right) => left.tag.label.localeCompare(right.tag.label, 'fr'))
      .forEach((link) => {
        if (link.tag.category === PreferenceTagCategory.DIETARY) {
          dietaryTags.push(link.tag.label);
          return;
        }

        if (link.tag.category === PreferenceTagCategory.MEAL_AMBIANCE) {
          ambianceTags.push(link.tag.label);
        }
      });

    return {
      dietaryTags,
      ambianceTags,
    };
  }

  private async assignDefaultPreferenceTags(userId: number): Promise<void> {
    const existingLinks = await this.userPreferenceTagsRepository.count({
      where: { userId },
    });

    if (existingLinks > 0) {
      return;
    }

    for (const defaultTag of DEFAULT_PREFERENCE_TAGS) {
      const tag = await this.findOrCreateSystemPreferenceTag(
        defaultTag.label,
        defaultTag.category,
      );

      await this.userPreferenceTagsRepository.save(
        this.userPreferenceTagsRepository.create({
          userId,
          tagId: tag.id,
        }),
      );
    }
  }

  private async findOrCreateSystemPreferenceTag(
    label: string,
    category: PreferenceTagCategory,
  ): Promise<PreferenceTag> {
    const slug = this.toPreferenceSlug(label);

    const existingTag = await this.preferenceTagsRepository.findOne({
      where: {
        slug,
        category,
        isSystem: true,
        ownerUserId: IsNull(),
      },
    });

    if (existingTag) {
      return existingTag;
    }

    const tag = this.preferenceTagsRepository.create({
      slug,
      label: this.normalizePreferenceTagLabel(label),
      category,
      isSystem: true,
      isActive: true,
      ownerUserId: null,
    });

    return this.preferenceTagsRepository.save(tag);
  }

  private async resolvePreferenceTag(
    userId: number,
    label: string,
    category: PreferenceTagCategory,
  ): Promise<PreferenceTag> {
    const normalizedLabel = this.normalizePreferenceTagLabel(label);
    const slug = this.toPreferenceSlug(normalizedLabel);

    const systemTag = await this.preferenceTagsRepository.findOne({
      where: {
        slug,
        category,
        isSystem: true,
        ownerUserId: IsNull(),
      },
    });

    if (systemTag) {
      return systemTag;
    }

    const privateTag = await this.preferenceTagsRepository.findOne({
      where: {
        slug,
        category,
        isSystem: false,
        ownerUserId: userId,
      },
    });

    if (privateTag) {
      if (!privateTag.isActive || privateTag.label !== normalizedLabel) {
        privateTag.isActive = true;
        privateTag.label = normalizedLabel;
        return this.preferenceTagsRepository.save(privateTag);
      }

      return privateTag;
    }

    return this.preferenceTagsRepository.save(
      this.preferenceTagsRepository.create({
        slug,
        label: normalizedLabel,
        category,
        isSystem: false,
        isActive: true,
        ownerUserId: userId,
      }),
    );
  }
}