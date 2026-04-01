import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleName } from '../users/role.entity';
import { UsersService } from '../users/users.service';
import { Utilisateur } from '../users/users.entity';
import { CreateHostProfileDto } from './dto/create-host-profile.dto';
import { UpdateHostProfileDto } from './dto/update-host-profile.dto';
import {
  HostProfile,
  HostValidationStatus,
} from './host-profile.entity';

type HostProfileUserSummary = {
  userId: number;
  pseudo: string | null;
  email: string;
};

type HostProfileResponse = {
  id: number;
  isActive: boolean;
  homePhotoUrl: string | null;
  validationStatus: HostValidationStatus;
  hostLevel: number;
  activatedAt: Date | null;
  lat: number | null;
  lng: number | null;
  country: string;
  city: string;
  districtLabel: string;
  address: string;
};

type HostProfileAdminResponse = HostProfileResponse & {
  user: HostProfileUserSummary;
};

@Injectable()
export class HostProfilesService {
  constructor(
    @InjectRepository(HostProfile)
    private readonly hostProfilesRepository: Repository<HostProfile>,
    @InjectRepository(Utilisateur)
    private readonly usersRepository: Repository<Utilisateur>,
    private readonly usersService: UsersService,
  ) {}

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

    const hostProfile = this.hostProfilesRepository.create({
      homePhotoUrl: this.normalizeNullableString(createHostProfileDto.homePhotoUrl),
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
    });

    const savedHostProfile = await this.hostProfilesRepository.save(hostProfile);
    return this.toHostProfileResponse(savedHostProfile);
  }

  async findMine(userId: number): Promise<HostProfileResponse> {
    const hostProfile = await this.findEntityByUserId(userId);
    return this.toHostProfileResponse(hostProfile);
  }

  async updateMine(
    userId: number,
    updateHostProfileDto: UpdateHostProfileDto,
  ): Promise<HostProfileResponse> {
    const hostProfile = await this.findEntityByUserId(userId);

    if (hostProfile.validationStatus === HostValidationStatus.APPROVED) {
      throw new BadRequestException(
        'Un profil hote approuve ne peut pas etre modifie',
      );
    }

    this.applyUpdatableFields(hostProfile, updateHostProfileDto);

    const updatedHostProfile = await this.hostProfilesRepository.save(hostProfile);
    return this.toHostProfileResponse(updatedHostProfile);
  }

  async resubmitMine(userId: number): Promise<HostProfileResponse> {
    const hostProfile = await this.findEntityByUserId(userId);

    if (hostProfile.validationStatus !== HostValidationStatus.REJECTED) {
      throw new BadRequestException(
        'Seul un profil hote rejete peut etre resoumis',
      );
    }

    hostProfile.validationStatus = HostValidationStatus.PENDING;
    hostProfile.isActive = false;
    hostProfile.activatedAt = null;

    const updatedHostProfile = await this.hostProfilesRepository.save(hostProfile);
    return this.toHostProfileResponse(updatedHostProfile);
  }

  async approve(id: number): Promise<HostProfileAdminResponse> {
    const hostProfile = await this.findEntityById(id);

    if (hostProfile.validationStatus === HostValidationStatus.APPROVED) {
      throw new BadRequestException('La demande hote est deja approuvee');
    }

    hostProfile.validationStatus = HostValidationStatus.APPROVED;
    hostProfile.isActive = true;
    hostProfile.activatedAt = new Date();

    const savedHostProfile = await this.hostProfilesRepository.save(hostProfile);
    savedHostProfile.user = await this.usersService.setRole(
      savedHostProfile.user.id,
      RoleName.HOST,
    );

    return this.toAdminHostProfileResponse(savedHostProfile);
  }

  async reject(id: number): Promise<HostProfileAdminResponse> {
    const hostProfile = await this.findEntityById(id);

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

    const savedHostProfile = await this.hostProfilesRepository.save(hostProfile);
    return this.toAdminHostProfileResponse(savedHostProfile);
  }

  async findAll(): Promise<HostProfileAdminResponse[]> {
    const hostProfiles = await this.hostProfilesRepository.find({
      relations: ['user'],
      order: { id: 'DESC' },
    });

    return hostProfiles.map((hostProfile) =>
      this.toAdminHostProfileResponse(hostProfile),
    );
  }

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

  async findById(id: number): Promise<HostProfileAdminResponse> {
    const hostProfile = await this.findEntityById(id);
    return this.toAdminHostProfileResponse(hostProfile);
  }

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

  private applyUpdatableFields(
    hostProfile: HostProfile,
    updateHostProfileDto: UpdateHostProfileDto,
  ): void {
    if (updateHostProfileDto.homePhotoUrl !== undefined) {
      hostProfile.homePhotoUrl = this.normalizeNullableString(
        updateHostProfileDto.homePhotoUrl,
      );
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

  private toHostProfileResponse(hostProfile: HostProfile): HostProfileResponse {
    return {
      id: hostProfile.id,
      isActive: hostProfile.isActive,
      homePhotoUrl: hostProfile.homePhotoUrl,
      validationStatus: hostProfile.validationStatus,
      hostLevel: hostProfile.hostLevel,
      activatedAt: hostProfile.activatedAt,
      lat: hostProfile.lat,
      lng: hostProfile.lng,
      country: hostProfile.country,
      city: hostProfile.city,
      districtLabel: hostProfile.districtLabel,
      address: hostProfile.address,
    };
  }

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

  private normalizeNullableString(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
  }
}
