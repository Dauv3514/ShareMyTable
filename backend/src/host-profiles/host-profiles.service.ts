import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Meal, MealStatus } from '../meals/meal.entity';
import { RoleName } from '../users/role.entity';
import { UsersService } from '../users/users.service';
import { Utilisateur } from '../users/users.entity';
import { CreateHostProfileDto } from './dto/create-host-profile.dto';
import { UpdateHostProfileDto } from './dto/update-host-profile.dto';
import {
  HostPhotoSafeSearch,
  HostPhotoVisionLabel,
  HostProfile,
  HostValidationStatus,
} from './host-profile.entity';
import {
  HostProfileReviewDecision,
  HostProfileReviewLog,
} from './host-profile-review-log.entity';
import { HostProfileVerificationService } from './host-profile-verification.service';

type HostProfileUserSummary = {
  userId: number;
  pseudo: string | null;
  email: string;
};

type HostProfileResponse = {
  id: number;
  isActive: boolean;
  homePhotoUrl: string | null;
  homePhotoUrls: string[];
  validationStatus: HostValidationStatus;
  hostLevel: number;
  activatedAt: Date | null;
  lat: number | null;
  lng: number | null;
  country: string;
  city: string;
  districtLabel: string;
  address: string;
  addressVerified: boolean;
  homePhotoVerified: boolean;
  verificationScore: number;
  autoReviewNotes: string | null;
  rejectionReason: string | null;
  lastAutoReviewedAt: Date | null;
  homePhotoVisionLabels: HostPhotoVisionLabel[];
  homePhotoSafeSearch: HostPhotoSafeSearch;
  verificationRiskFlags: string[];
  manualReviewRequired: boolean;
};

type HostProfileAdminResponse = HostProfileResponse & {
  user: HostProfileUserSummary;
};

type PublicHostProfileResponse = HostProfileResponse & {
  user: {
    userId: number;
    pseudo: string | null;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
    bio: string | null;
    createdAt: Date;
  };
  stats: {
    publishedMealsCount: number;
    completedMealsCount: number;
    organizedMealsCount: number;
  };
};

type HostProfileReviewHistoryResponse = {
  id: number;
  decision: HostProfileReviewDecision;
  rejectionReason: string | null;
  reviewedAt: Date;
  admin: {
    userId: number;
    pseudo: string | null;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  applicant: HostProfileUserSummary;
  hostProfile: {
    id: number;
    country: string;
    city: string;
    districtLabel: string;
    address: string;
  };
};

// Service metier du parcours de candidature hote.
// Il orchestre la creation, la moderation admin et l'auto-review niveau 1.
@Injectable()
export class HostProfilesService {
  private static readonly MIN_HOME_PHOTOS = 2;
  private static readonly MAX_HOME_PHOTOS = 5;
  private static readonly AUTO_INVALID_ADDRESS_REJECTION_REASON =
    "Adresse non valide ou non verifiable. Merci de corriger l'adresse avant de renvoyer votre demande hote.";

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(HostProfile)
    private readonly hostProfilesRepository: Repository<HostProfile>,
    @InjectRepository(HostProfileReviewLog)
    private readonly hostProfileReviewLogsRepository: Repository<HostProfileReviewLog>,
    @InjectRepository(Utilisateur)
    private readonly usersRepository: Repository<Utilisateur>,
    @InjectRepository(Meal)
    private readonly mealsRepository: Repository<Meal>,
    private readonly usersService: UsersService,
    private readonly hostProfileVerificationService: HostProfileVerificationService,
  ) {}

  // Cree la premiere demande hote d'un utilisateur.
  // Un seul host_profile est autorise par user.
  async requestHostProfile(
    userId: number,
    createHostProfileDto: CreateHostProfileDto,
  ): Promise<HostProfileResponse> {
    const existingProfile = await this.hostProfilesRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (existingProfile) {
      throw new ConflictException(
        'Un profil hote existe deja pour cet utilisateur',
      );
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouve');
    }

    const homePhotoUrls = this.normalizeHomePhotoUrls(
      createHostProfileDto.homePhotoUrls,
      createHostProfileDto.homePhotoUrl,
    );
    this.assertHomePhotosRange(homePhotoUrls);

    const hostProfile = this.hostProfilesRepository.create({
      homePhotoUrl: homePhotoUrls[0] ?? null,
      homePhotoUrls,
      lat: createHostProfileDto.lat ?? null,
      lng: createHostProfileDto.lng ?? null,
      country: createHostProfileDto.country.trim(),
      city: createHostProfileDto.city.trim(),
      districtLabel: createHostProfileDto.districtLabel.trim(),
      address: createHostProfileDto.address.trim(),
      user,
      isActive: false,
      validationStatus: HostValidationStatus.PENDING,
      hostLevel: 1,
      activatedAt: null,
      addressVerified: false,
      homePhotoVerified: false,
      verificationScore: 0,
      autoReviewNotes: null,
      rejectionReason: null,
      lastAutoReviewedAt: null,
      homePhotoVisionLabels: [],
      homePhotoSafeSearch: null,
      verificationRiskFlags: [],
      manualReviewRequired: false,
    });

    await this.hostProfileVerificationService.runAutoReview(hostProfile);
    this.applyAutomaticAddressDecision(hostProfile);

    const savedHostProfile = await this.hostProfilesRepository.save(hostProfile);
    return this.toHostProfileResponse(savedHostProfile);
  }

  // Retourne le profil hote du user connecte.
  async findMine(userId: number): Promise<HostProfileResponse> {
    const hostProfile = await this.findEntityByUserId(userId);
    return this.toHostProfileResponse(hostProfile);
  }

  // Les profils pending et rejected peuvent etre modifies.
  // Un profil approved est fige cote user.
  async updateMine(
    userId: number,
    updateHostProfileDto: UpdateHostProfileDto,
  ): Promise<HostProfileResponse> {
    const hostProfile = await this.findEntityByUserId(userId);

    if (
      hostProfile.validationStatus === HostValidationStatus.APPROVED &&
      this.hasNonPhotoUpdate(updateHostProfileDto)
    ) {
      throw new BadRequestException(
        'Un profil hote approuve ne peut pas etre modifie',
      );
    }

    this.applyUpdatableFields(hostProfile, updateHostProfileDto);
    this.assertHomePhotosRange(
      this.normalizeHomePhotoUrls(
        hostProfile.homePhotoUrls,
        hostProfile.homePhotoUrl,
      ),
    );

    if (hostProfile.validationStatus !== HostValidationStatus.APPROVED) {
      await this.hostProfileVerificationService.runAutoReview(hostProfile);
      this.applyAutomaticAddressDecision(hostProfile);
    }

    const updatedHostProfile = await this.hostProfilesRepository.save(hostProfile);
    return this.toHostProfileResponse(updatedHostProfile);
  }

  // Permet a un user de renvoyer un dossier apres refus sans ressaisir toutes les donnees.
  async resubmitMine(userId: number): Promise<HostProfileResponse> {
    const hostProfile = await this.findEntityByUserId(userId);

    if (hostProfile.validationStatus !== HostValidationStatus.REJECTED) {
      throw new BadRequestException(
        'Seul un profil hote rejete peut etre resoumis',
      );
    }

    this.assertHomePhotosRange(
      this.normalizeHomePhotoUrls(
        hostProfile.homePhotoUrls,
        hostProfile.homePhotoUrl,
      ),
    );

    hostProfile.validationStatus = HostValidationStatus.PENDING;
    hostProfile.isActive = false;
    hostProfile.activatedAt = null;
    hostProfile.rejectionReason = null;

    await this.hostProfileVerificationService.runAutoReview(hostProfile);
    this.applyAutomaticAddressDecision(hostProfile);

    const updatedHostProfile = await this.hostProfilesRepository.save(hostProfile);
    return this.toHostProfileResponse(updatedHostProfile);
  }

  // Validation admin :
  // le profil devient actif et le role principal du user passe a HOST.
  async approve(
    id: number,
    adminUserId: number,
  ): Promise<HostProfileAdminResponse> {
    const savedHostProfile = await this.dataSource.transaction(async (manager) => {
      const hostProfilesRepository = manager.getRepository(HostProfile);
      const reviewLogsRepository = manager.getRepository(HostProfileReviewLog);
      const usersRepository = manager.getRepository(Utilisateur);

      const hostProfile = await hostProfilesRepository.findOne({
        where: { id },
        relations: ['user'],
      });

      if (!hostProfile) {
        throw new NotFoundException('Profil hote introuvable');
      }

      if (hostProfile.validationStatus === HostValidationStatus.APPROVED) {
        throw new BadRequestException('La demande hote est deja approuvee');
      }

      hostProfile.validationStatus = HostValidationStatus.APPROVED;
      hostProfile.isActive = true;
      hostProfile.activatedAt = new Date();
      hostProfile.rejectionReason = null;

      const updatedHostProfile = await hostProfilesRepository.save(hostProfile);
      updatedHostProfile.user = await this.usersService.setRoleWithManager(
        manager,
        updatedHostProfile.user.id,
        RoleName.HOST,
      );

      const admin = await usersRepository.findOne({
        where: { id: adminUserId },
      });

      await reviewLogsRepository.save(
        reviewLogsRepository.create({
          hostProfile: updatedHostProfile,
          admin,
          decision: HostProfileReviewDecision.APPROVED,
          rejectionReason: null,
        }),
      );

      return updatedHostProfile;
    });

    return this.toAdminHostProfileResponse(savedHostProfile);
  }

  // Choix metier retenu :
  // un profil deja approuve ne peut pas etre rejete pour eviter un downgrade implicite.
  async reject(
    id: number,
    adminUserId: number,
    rejectionReason?: string,
  ): Promise<HostProfileAdminResponse> {
    const savedHostProfile = await this.dataSource.transaction(async (manager) => {
      const hostProfilesRepository = manager.getRepository(HostProfile);
      const reviewLogsRepository = manager.getRepository(HostProfileReviewLog);
      const usersRepository = manager.getRepository(Utilisateur);

      const hostProfile = await hostProfilesRepository.findOne({
        where: { id },
        relations: ['user'],
      });

      if (!hostProfile) {
        throw new NotFoundException('Profil hote introuvable');
      }

      if (hostProfile.validationStatus === HostValidationStatus.REJECTED) {
        throw new BadRequestException('La demande hote est deja rejetee');
      }

      if (hostProfile.validationStatus === HostValidationStatus.APPROVED) {
        throw new BadRequestException(
          'Un profil hote approuve ne peut pas etre rejete',
        );
      }

      hostProfile.validationStatus = HostValidationStatus.REJECTED;
      hostProfile.isActive = false;
      hostProfile.activatedAt = null;
      hostProfile.rejectionReason = this.normalizeNullableString(rejectionReason);

      const updatedHostProfile = await hostProfilesRepository.save(hostProfile);
      const admin = await usersRepository.findOne({
        where: { id: adminUserId },
      });

      await reviewLogsRepository.save(
        reviewLogsRepository.create({
          hostProfile: updatedHostProfile,
          admin,
          decision: HostProfileReviewDecision.REJECTED,
          rejectionReason: updatedHostProfile.rejectionReason,
        }),
      );

      return updatedHostProfile;
    });

    return this.toAdminHostProfileResponse(savedHostProfile);
  }

  // Liste complete pour la moderation admin.
  async findAll(): Promise<HostProfileAdminResponse[]> {
    const hostProfiles = await this.hostProfilesRepository.find({
      relations: ['user'],
      order: { id: 'DESC' },
    });

    return hostProfiles.map((hostProfile) =>
      this.toAdminHostProfileResponse(hostProfile),
    );
  }

  // Liste ciblee des demandes en attente de moderation.
  async findPending(): Promise<HostProfileAdminResponse[]> {
    const hostProfiles = await this.hostProfilesRepository.find({
      where: { validationStatus: HostValidationStatus.PENDING },
      relations: ['user'],
      order: { id: 'DESC' },
    });

    return hostProfiles.map((hostProfile) =>
      this.toAdminHostProfileResponse(hostProfile),
    );
  }

  // Detail admin d'un profil hote precis.
  async findById(id: number): Promise<HostProfileAdminResponse> {
    const hostProfile = await this.findEntityById(id);
    return this.toAdminHostProfileResponse(hostProfile);
  }

  async findHistory(): Promise<HostProfileReviewHistoryResponse[]> {
    const reviewLogs = await this.hostProfileReviewLogsRepository.find({
      relations: ['hostProfile', 'hostProfile.user', 'admin'],
      order: { createdAt: 'DESC' },
    });

    return reviewLogs.map((reviewLog) => this.toReviewHistoryResponse(reviewLog));
  }

  async findPublicByUserId(userId: number): Promise<PublicHostProfileResponse> {
    const hostProfile = await this.hostProfilesRepository.findOne({
      where: {
        user: { id: userId },
        validationStatus: HostValidationStatus.APPROVED,
        isActive: true,
      },
      relations: ['user'],
    });

    if (!hostProfile) {
      throw new NotFoundException('Profil hote public introuvable');
    }

    const [publishedMealsCount, completedMealsCount, organizedMealsCount] =
      await Promise.all([
      this.mealsRepository.count({
        where: {
          host: { id: userId },
          status: MealStatus.PUBLISHED,
        },
      }),
      this.mealsRepository.count({
        where: {
          host: { id: userId },
          status: MealStatus.DONE,
        },
      }),
      this.mealsRepository.count({
        where: {
          host: { id: userId },
        },
      }),
    ]);

    return {
      ...this.toHostProfileResponse(hostProfile),
      user: {
        userId: hostProfile.user.id,
        pseudo: hostProfile.user.pseudo,
        firstName: hostProfile.user.firstName,
        lastName: hostProfile.user.lastName,
        profilePhotoUrl: hostProfile.user.profilePhotoUrl,
        bio: hostProfile.user.bio,
        createdAt: hostProfile.user.createdAt,
      },
      stats: {
        publishedMealsCount,
        completedMealsCount,
        organizedMealsCount,
      },
    };
  }

  // Resolution interne par user_id pour les routes "me".
  private async findEntityByUserId(userId: number): Promise<HostProfile> {
    const hostProfile = await this.hostProfilesRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!hostProfile) {
      throw new NotFoundException(
        'Aucun profil hote trouve pour cet utilisateur',
      );
    }

    return hostProfile;
  }

  // Resolution interne par id pour les usages admin.
  private async findEntityById(id: number): Promise<HostProfile> {
    const hostProfile = await this.hostProfilesRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!hostProfile) {
      throw new NotFoundException('Profil hote introuvable');
    }

    return hostProfile;
  }

  // N'autorise que les champs explicitement modifiables par le user.
  private applyUpdatableFields(
    hostProfile: HostProfile,
    updateHostProfileDto: UpdateHostProfileDto,
  ): void {
    if (updateHostProfileDto.homePhotoUrl !== undefined) {
      const homePhotoUrl = this.normalizeNullableString(
        updateHostProfileDto.homePhotoUrl,
      );
      hostProfile.homePhotoUrl = homePhotoUrl;
      hostProfile.homePhotoUrls = homePhotoUrl ? [homePhotoUrl] : [];
    }

    if (updateHostProfileDto.homePhotoUrls !== undefined) {
      const homePhotoUrls = this.normalizeHomePhotoUrls(
        updateHostProfileDto.homePhotoUrls,
        updateHostProfileDto.homePhotoUrl,
      );
      hostProfile.homePhotoUrl = homePhotoUrls[0] ?? null;
      hostProfile.homePhotoUrls = homePhotoUrls;
    }

    if (updateHostProfileDto.lat !== undefined) {
      hostProfile.lat = updateHostProfileDto.lat;
    }

    if (updateHostProfileDto.lng !== undefined) {
      hostProfile.lng = updateHostProfileDto.lng;
    }

    if (updateHostProfileDto.country !== undefined) {
      hostProfile.country = updateHostProfileDto.country.trim();
    }

    if (updateHostProfileDto.city !== undefined) {
      hostProfile.city = updateHostProfileDto.city.trim();
    }

    if (updateHostProfileDto.districtLabel !== undefined) {
      hostProfile.districtLabel = updateHostProfileDto.districtLabel.trim();
    }

    if (updateHostProfileDto.address !== undefined) {
      hostProfile.address = updateHostProfileDto.address.trim();
    }
  }

  private applyAutomaticAddressDecision(hostProfile: HostProfile): void {
    if (!hostProfile.verificationRiskFlags.includes('address_invalid')) {
      return;
    }

    hostProfile.validationStatus = HostValidationStatus.REJECTED;
    hostProfile.isActive = false;
    hostProfile.activatedAt = null;
    hostProfile.rejectionReason =
      HostProfilesService.AUTO_INVALID_ADDRESS_REJECTION_REASON;
  }

  // Format public des routes "me".
  private toHostProfileResponse(hostProfile: HostProfile): HostProfileResponse {
    return {
      id: hostProfile.id,
      isActive: hostProfile.isActive,
      homePhotoUrl: hostProfile.homePhotoUrl,
      homePhotoUrls: this.normalizeHomePhotoUrls(
        hostProfile.homePhotoUrls,
        hostProfile.homePhotoUrl,
      ),
      validationStatus: hostProfile.validationStatus,
      hostLevel: hostProfile.hostLevel,
      activatedAt: hostProfile.activatedAt,
      lat: hostProfile.lat,
      lng: hostProfile.lng,
      country: hostProfile.country,
      city: hostProfile.city,
      districtLabel: hostProfile.districtLabel,
      address: hostProfile.address,
      addressVerified: hostProfile.addressVerified,
      homePhotoVerified: hostProfile.homePhotoVerified,
      verificationScore: hostProfile.verificationScore,
      autoReviewNotes: hostProfile.autoReviewNotes,
      rejectionReason: hostProfile.rejectionReason,
      lastAutoReviewedAt: hostProfile.lastAutoReviewedAt,
      homePhotoVisionLabels: hostProfile.homePhotoVisionLabels,
      homePhotoSafeSearch: hostProfile.homePhotoSafeSearch,
      verificationRiskFlags: hostProfile.verificationRiskFlags,
      manualReviewRequired: hostProfile.manualReviewRequired,
    };
  }

  // Format admin avec un sous-ensemble non sensible des infos user.
  private toAdminHostProfileResponse(
    hostProfile: HostProfile,
  ): HostProfileAdminResponse {
    return {
      ...this.toHostProfileResponse(hostProfile),
      user: {
        userId: hostProfile.user.id,
        pseudo: hostProfile.user.pseudo,
        email: hostProfile.user.email,
      },
    };
  }

  private toReviewHistoryResponse(
    reviewLog: HostProfileReviewLog,
  ): HostProfileReviewHistoryResponse {
    return {
      id: reviewLog.id,
      decision: reviewLog.decision,
      rejectionReason: reviewLog.rejectionReason,
      reviewedAt: reviewLog.createdAt,
      admin: reviewLog.admin
        ? {
            userId: reviewLog.admin.id,
            pseudo: reviewLog.admin.pseudo,
            email: reviewLog.admin.email,
            firstName: reviewLog.admin.firstName,
            lastName: reviewLog.admin.lastName,
          }
        : null,
      applicant: {
        userId: reviewLog.hostProfile.user.id,
        pseudo: reviewLog.hostProfile.user.pseudo,
        email: reviewLog.hostProfile.user.email,
      },
      hostProfile: {
        id: reviewLog.hostProfile.id,
        country: reviewLog.hostProfile.country,
        city: reviewLog.hostProfile.city,
        districtLabel: reviewLog.hostProfile.districtLabel,
        address: reviewLog.hostProfile.address,
      },
    };
  }

  // Convertit les chaines vides en null pour rester coherent avec la base.
  private normalizeNullableString(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
  }

  private normalizeHomePhotoUrls(
    values?: string[] | null,
    fallbackValue?: string | null,
  ): string[] {
    const rawValues = Array.isArray(values) ? values : [];
    const normalizedValues = rawValues
      .map((value) => this.normalizeNullableString(value))
      .filter((value): value is string => Boolean(value));
    const fallback = this.normalizeNullableString(fallbackValue);
    const uniqueValues = fallback
      ? [fallback, ...normalizedValues]
      : normalizedValues;

    return Array.from(new Set(uniqueValues)).slice(0, 5);
  }

  private hasNonPhotoUpdate(updateHostProfileDto: UpdateHostProfileDto): boolean {
    return (
      updateHostProfileDto.lat !== undefined ||
      updateHostProfileDto.lng !== undefined ||
      updateHostProfileDto.country !== undefined ||
      updateHostProfileDto.city !== undefined ||
      updateHostProfileDto.districtLabel !== undefined ||
      updateHostProfileDto.address !== undefined
    );
  }

  private assertHomePhotosRange(homePhotoUrls: string[]): void {
    if (homePhotoUrls.length < HostProfilesService.MIN_HOME_PHOTOS) {
      throw new BadRequestException(
        `Au moins ${HostProfilesService.MIN_HOME_PHOTOS} photos du logement sont obligatoires pour une demande hote`,
      );
    }

    if (homePhotoUrls.length > HostProfilesService.MAX_HOME_PHOTOS) {
      throw new BadRequestException(
        `Tu peux ajouter au maximum ${HostProfilesService.MAX_HOME_PHOTOS} photos du logement`,
      );
    }
  }
}
