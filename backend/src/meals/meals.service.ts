import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  HostProfile,
  HostValidationStatus,
} from '../host-profiles/host-profile.entity';
import { RoleName } from '../users/role.entity';
import { Utilisateur } from '../users/users.entity';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';
import { Meal, MealStatus } from './meal.entity';

type MealHostSummary = {
  userId: number;
  pseudo: string | null;
  city: string;
  country: string;
};

type MealResponse = {
  id: number;
  title: string | null;
  mealType: string | null;
  menuDescription: string | null;
  dateTime: Date;
  seatsTotal: number;
  pricePerSeatCents: number;
  houseRules: string | null;
  status: MealStatus;
  createdAt: Date;
  updatedAt: Date;
  host: MealHostSummary;
};

// Service metier de gestion des repas.
// Il verifie qu'un user est bien host actif et approuve avant toute action privee.
@Injectable()
export class MealsService {
  constructor(
    @InjectRepository(Meal)
    private readonly mealsRepository: Repository<Meal>,
    @InjectRepository(Utilisateur)
    private readonly usersRepository: Repository<Utilisateur>,
    @InjectRepository(HostProfile)
    private readonly hostProfilesRepository: Repository<HostProfile>,
  ) {}

  async create(userId: number, dto: CreateMealDto): Promise<MealResponse> {
    const user = await this.ensureApprovedActiveHost(userId);

    const meal = this.mealsRepository.create({
      host: user,
      title: dto.title.trim(),
      mealType: this.normalizeNullableString(dto.mealType),
      menuDescription: this.normalizeNullableString(dto.menuDescription),
      dateTime: new Date(dto.dateTime),
      seatsTotal: dto.seatsTotal,
      pricePerSeatCents: dto.pricePerSeatCents,
      houseRules: this.normalizeNullableString(dto.houseRules),
      status: MealStatus.DRAFT,
    });

    const savedMeal = await this.mealsRepository.save(meal);
    const reloadedMeal = await this.findOwnedMealEntity(userId, savedMeal.id);
    return this.toMealResponse(reloadedMeal);
  }

  async findAllPublished(): Promise<MealResponse[]> {
    const meals = await this.mealsRepository.find({
      where: { status: MealStatus.PUBLISHED },
      relations: ['host'],
      order: { dateTime: 'ASC' },
    });

    return meals.map((meal) => this.toMealResponse(meal));
  }

  async findOnePublished(id: number): Promise<MealResponse> {
    const meal = await this.mealsRepository.findOne({
      where: { id, status: MealStatus.PUBLISHED },
      relations: ['host'],
    });

    if (!meal) {
      throw new NotFoundException('Repas publie introuvable');
    }

    return this.toMealResponse(meal);
  }

  async findMine(userId: number): Promise<MealResponse[]> {
    await this.ensureApprovedActiveHost(userId);

    const meals = await this.mealsRepository.find({
      where: { host: { id: userId } },
      relations: ['host'],
      order: { createdAt: 'DESC' },
    });

    return meals.map((meal) => this.toMealResponse(meal));
  }

  async findOneMine(userId: number, mealId: number): Promise<MealResponse> {
    await this.ensureApprovedActiveHost(userId);
    const meal = await this.findOwnedMealEntity(userId, mealId);
    return this.toMealResponse(meal);
  }

  async updateMine(
    userId: number,
    mealId: number,
    dto: UpdateMealDto,
  ): Promise<MealResponse> {
    await this.ensureApprovedActiveHost(userId);
    const meal = await this.findOwnedMealEntity(userId, mealId);

    if (meal.status === MealStatus.DONE) {
      throw new BadRequestException(
        'Un repas termine ne peut plus etre modifie',
      );
    }

    if (dto.title !== undefined) {
      meal.title = dto.title.trim();
    }

    if (dto.mealType !== undefined) {
      meal.mealType = this.normalizeNullableString(dto.mealType);
    }

    if (dto.menuDescription !== undefined) {
      meal.menuDescription = this.normalizeNullableString(dto.menuDescription);
    }

    if (dto.dateTime !== undefined) {
      meal.dateTime = new Date(dto.dateTime);
    }

    if (dto.seatsTotal !== undefined) {
      meal.seatsTotal = dto.seatsTotal;
    }

    if (dto.pricePerSeatCents !== undefined) {
      meal.pricePerSeatCents = dto.pricePerSeatCents;
    }

    if (dto.houseRules !== undefined) {
      meal.houseRules = this.normalizeNullableString(dto.houseRules);
    }

    const updatedMeal = await this.mealsRepository.save(meal);
    return this.toMealResponse(updatedMeal);
  }

  async publishMine(userId: number, mealId: number): Promise<MealResponse> {
    await this.ensureApprovedActiveHost(userId);
    const meal = await this.findOwnedMealEntity(userId, mealId);

    if (meal.status === MealStatus.CANCELLED) {
      throw new BadRequestException(
        'Un repas annule ne peut pas etre republie',
      );
    }

    if (meal.status !== MealStatus.DRAFT) {
      throw new BadRequestException(
        'Seul un repas en brouillon peut etre publie',
      );
    }

    this.ensureMealCanBePublished(meal);
    meal.status = MealStatus.PUBLISHED;

    const updatedMeal = await this.mealsRepository.save(meal);
    return this.toMealResponse(updatedMeal);
  }

  async cancelMine(userId: number, mealId: number): Promise<MealResponse> {
    await this.ensureApprovedActiveHost(userId);
    const meal = await this.findOwnedMealEntity(userId, mealId);

    if (meal.status === MealStatus.CANCELLED) {
      throw new BadRequestException('Ce repas est deja annule');
    }

    if (meal.status === MealStatus.DONE) {
      throw new BadRequestException(
        'Un repas termine ne peut pas etre annule',
      );
    }

    meal.status = MealStatus.CANCELLED;

    const updatedMeal = await this.mealsRepository.save(meal);
    return this.toMealResponse(updatedMeal);
  }

  async markDoneMine(userId: number, mealId: number): Promise<MealResponse> {
    await this.ensureApprovedActiveHost(userId);
    const meal = await this.findOwnedMealEntity(userId, mealId);

    if (meal.status === MealStatus.DONE) {
      throw new BadRequestException('Ce repas est deja termine');
    }

    if (meal.status === MealStatus.CANCELLED) {
      throw new BadRequestException(
        'Un repas annule ne peut pas etre marque comme termine',
      );
    }

    if (meal.dateTime.getTime() > Date.now()) {
      throw new BadRequestException(
        'Un repas ne peut etre marque comme termine que lorsque sa date est passee',
      );
    }

    meal.status = MealStatus.DONE;

    const updatedMeal = await this.mealsRepository.save(meal);
    return this.toMealResponse(updatedMeal);
  }

  private async ensureApprovedActiveHost(userId: number): Promise<Utilisateur> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['role', 'hostProfile'],
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    if (user.role.name !== RoleName.HOST) {
      throw new ForbiddenException(
        'Seul un host peut creer ou gerer des repas',
      );
    }

    const hostProfile =
      user.hostProfile ??
      (await this.hostProfilesRepository.findOne({
        where: { user: { id: userId } },
        relations: ['user'],
      }));

    if (!hostProfile) {
      throw new ForbiddenException('Profil host introuvable');
    }

    if (
      hostProfile.validationStatus !== HostValidationStatus.APPROVED ||
      !hostProfile.isActive
    ) {
      throw new ForbiddenException(
        'Le profil host doit etre approuve et actif pour gerer des repas',
      );
    }

    return user;
  }

  private async findOwnedMealEntity(
    userId: number,
    mealId: number,
  ): Promise<Meal> {
    const meal = await this.mealsRepository.findOne({
      where: { id: mealId, host: { id: userId } },
      relations: ['host'],
    });

    if (!meal) {
      throw new NotFoundException('Repas introuvable');
    }

    return meal;
  }

  private ensureMealCanBePublished(meal: Meal): void {
    if (!meal.title || meal.title.trim().length === 0) {
      throw new BadRequestException(
        'Le titre est obligatoire pour publier un repas',
      );
    }

    if (!meal.dateTime) {
      throw new BadRequestException(
        'La date du repas est obligatoire pour publier',
      );
    }

    if (meal.seatsTotal <= 0) {
      throw new BadRequestException(
        'Le nombre de places doit etre superieur a zero',
      );
    }

    if (meal.pricePerSeatCents < 0) {
      throw new BadRequestException(
        'Le prix par place ne peut pas etre negatif',
      );
    }
  }

  private toMealResponse(meal: Meal): MealResponse {
    return {
      id: meal.id,
      title: meal.title,
      mealType: meal.mealType,
      menuDescription: meal.menuDescription,
      dateTime: meal.dateTime,
      seatsTotal: meal.seatsTotal,
      pricePerSeatCents: meal.pricePerSeatCents,
      houseRules: meal.houseRules,
      status: meal.status,
      createdAt: meal.createdAt,
      updatedAt: meal.updatedAt,
      host: {
        userId: meal.host.id,
        pseudo: meal.host.pseudo,
        city: meal.host.city,
        country: meal.host.country,
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
