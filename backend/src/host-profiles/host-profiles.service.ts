import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Utilisateur } from '../users/users.entity';
import { CreateHostProfileDto } from './dto/create-host-profile.dto';
import { UpdateHostProfileDto } from './dto/update-host-profile.dto';
import {
  HostProfile,
  HostValidationStatus,
} from './host-profile.entity';

@Injectable()
export class HostProfilesService {
  constructor(
    @InjectRepository(HostProfile)
    private readonly hostProfilesRepository: Repository<HostProfile>,
    @InjectRepository(Utilisateur)
    private readonly usersRepository: Repository<Utilisateur>,
  ) {}

  async requestHostProfile(
    userId: number,
    createHostProfileDto: CreateHostProfileDto,
  ): Promise<HostProfile> {
    const existingProfile = await this.hostProfilesRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (existingProfile) {
      throw new ConflictException(
        'Une demande hote existe deja pour cet utilisateur',
      );
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouve');
    }

    const hostProfile = this.hostProfilesRepository.create({
      ...createHostProfileDto,
      user,
      isActive: false,
      validationStatus: HostValidationStatus.PENDING,
      hostLevel: 1,
      activatedAt: null,
    });

    return this.hostProfilesRepository.save(hostProfile);
  }

  async findMine(userId: number): Promise<HostProfile> {
    const hostProfile = await this.hostProfilesRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!hostProfile) {
      throw new NotFoundException('Profil hote introuvable');
    }

    return hostProfile;
  }

  async updateMine(
    userId: number,
    updateHostProfileDto: UpdateHostProfileDto,
  ): Promise<HostProfile> {
    const hostProfile = await this.findMine(userId);

    if (hostProfile.validationStatus === HostValidationStatus.REJECTED) {
      throw new BadRequestException(
        'Impossible de modifier un profil hote rejete',
      );
    }

    Object.assign(hostProfile, updateHostProfileDto);

    return this.hostProfilesRepository.save(hostProfile);
  }

  async approve(id: number): Promise<HostProfile> {
    const hostProfile = await this.findById(id);

    if (hostProfile.validationStatus === HostValidationStatus.APPROVED) {
      throw new BadRequestException('La demande hote est deja approuvee');
    }

    hostProfile.validationStatus = HostValidationStatus.APPROVED;
    hostProfile.isActive = true;
    hostProfile.activatedAt = new Date();

    return this.hostProfilesRepository.save(hostProfile);
  }

  async reject(id: number): Promise<HostProfile> {
    const hostProfile = await this.findById(id);

    if (hostProfile.validationStatus === HostValidationStatus.REJECTED) {
      throw new BadRequestException('La demande hote est deja rejetee');
    }

    hostProfile.validationStatus = HostValidationStatus.REJECTED;
    hostProfile.isActive = false;
    hostProfile.activatedAt = null;

    return this.hostProfilesRepository.save(hostProfile);
  }

  private async findById(id: number): Promise<HostProfile> {
    const hostProfile = await this.hostProfilesRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!hostProfile) {
      throw new NotFoundException('Profil hote introuvable');
    }

    return hostProfile;
  }
}
