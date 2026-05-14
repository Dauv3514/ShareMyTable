import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Booking, BookingStatus } from '../bookings/booking.entity';
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
  currentParticipants: number;
  pricePerSeatCents: number;
  houseRules: string | null;
  status: MealStatus;
  createdAt: Date;
  updatedAt: Date;
  host: MealHostSummary;
};

type PublishedMealsQuery = {
  page?: number;
  limit?: number;
  hostId?: number;
  mealType?: string;
  city?: string;
  country?: string;
  dateFrom?: string;
  dateTo?: string;
};

type PaginatedMealsResponse = {
  items: MealResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
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

  async findAllPublished(
    query: PublishedMealsQuery,
  ): Promise<PaginatedMealsResponse> {
    const page = this.normalizePositiveInteger(query.page, 1);
    const limit = Math.min(this.normalizePositiveInteger(query.limit, 10), 50);

    const queryBuilder = this.mealsRepository
      .createQueryBuilder('meal')
      .leftJoinAndSelect('meal.host', 'host')
      .where('meal.status = :status', { status: MealStatus.PUBLISHED });

    if (query.mealType?.trim()) {
      queryBuilder.andWhere('LOWER(meal.mealType) = LOWER(:mealType)', {
        mealType: query.mealType.trim(),
      });
    }

    if (query.hostId) {
      queryBuilder.andWhere('host.id = :hostId', {
        hostId: query.hostId,
      });
    }

    if (query.city?.trim()) {
      queryBuilder.andWhere('LOWER(host.city) = LOWER(:city)', {
        city: query.city.trim(),
      });
    }

    if (query.country?.trim()) {
      queryBuilder.andWhere('LOWER(host.country) = LOWER(:country)', {
        country: query.country.trim(),
      });
    }

    const dateFrom = this.parseOptionalQueryDate(query.dateFrom, 'dateFrom');
    if (dateFrom) {
      queryBuilder.andWhere('meal.dateTime >= :dateFrom', { dateFrom });
    }

    const dateTo = this.parseOptionalQueryDate(query.dateTo, 'dateTo');
    if (dateTo) {
      queryBuilder.andWhere('meal.dateTime <= :dateTo', { dateTo });
    }

    queryBuilder
      .orderBy('meal.dateTime', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [meals, total] = await queryBuilder.getManyAndCount();

    const participantCounts = await this.getCurrentParticipantCounts(
      meals.map((meal) => meal.id),
    );

    return {
      items: meals.map((meal) =>
        this.toMealResponse(meal, participantCounts.get(meal.id) ?? 0),
      ),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOnePublished(id: number): Promise<MealResponse> {
    const meal = await this.mealsRepository.findOne({
      where: { id, status: MealStatus.PUBLISHED },
      relations: ['host'],
    });

    if (!meal) {
      throw new NotFoundException('Repas publie introuvable');
    }

    const participantCounts = await this.getCurrentParticipantCounts([meal.id]);

    return this.toMealResponse(meal, participantCounts.get(meal.id) ?? 0);
  }

  async findMine(userId: number): Promise<MealResponse[]> {
    await this.ensureApprovedActiveHost(userId);

    const meals = await this.mealsRepository.find({
      where: { host: { id: userId } },
      relations: ['host'],
      order: { createdAt: 'DESC' },
    });

    const participantCounts = await this.getCurrentParticipantCounts(
      meals.map((meal) => meal.id),
    );

    return meals.map((meal) =>
      this.toMealResponse(meal, participantCounts.get(meal.id) ?? 0),
    );
  }

  async findOneMine(userId: number, mealId: number): Promise<MealResponse> {
    await this.ensureApprovedActiveHost(userId);
    const meal = await this.findOwnedMealEntity(userId, mealId);
    const participantCounts = await this.getCurrentParticipantCounts([meal.id]);

    return this.toMealResponse(meal, participantCounts.get(meal.id) ?? 0);
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

    if (!meal.mealType || meal.mealType.trim().length === 0) {
      throw new BadRequestException(
        'Le type de repas est obligatoire pour publier un repas',
      );
    }

    if (!meal.menuDescription || meal.menuDescription.trim().length === 0) {
      throw new BadRequestException(
        'La description du menu est obligatoire pour publier un repas',
      );
    }

    if (!meal.dateTime) {
      throw new BadRequestException(
        'La date du repas est obligatoire pour publier',
      );
    }

    if (meal.dateTime.getTime() <= Date.now()) {
      throw new BadRequestException(
        'Un repas dans le passe ne peut pas etre publie',
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

    if (!meal.houseRules || meal.houseRules.trim().length === 0) {
      throw new BadRequestException(
        'Les regles de la maison sont obligatoires pour publier un repas',
      );
    }
  }

  private async getCurrentParticipantCounts(
    mealIds: number[],
  ): Promise<Map<number, number>> {
    if (mealIds.length === 0) {
      return new Map();
    }

    const activeStatuses = [
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
      BookingStatus.COMPLETED,
    ];

    const bookings = await this.bookingsRepository.find({
      where: {
        meal: { id: In(mealIds) },
        bookingStatus: In(activeStatuses),
      },
      relations: ['meal', 'guestUser'],
      order: { createdAt: 'DESC' },
    });

    const bookingsByMealAndGuest = new Map<string, Booking>();

    for (const booking of bookings) {
      const key = `${booking.meal.id}:${booking.guestUser.id}`;
      const existingBooking = bookingsByMealAndGuest.get(key);

      if (
        !existingBooking ||
        booking.createdAt.getTime() > existingBooking.createdAt.getTime()
      ) {
        bookingsByMealAndGuest.set(key, booking);
      }
    }

    const participantCounts = new Map<number, number>();

    for (const booking of bookingsByMealAndGuest.values()) {
      participantCounts.set(
        booking.meal.id,
        (participantCounts.get(booking.meal.id) ?? 0) + booking.seats,
      );
    }

    return participantCounts;
  }

  private toMealResponse(meal: Meal, currentParticipants = 0): MealResponse {
    return {
      id: meal.id,
      title: meal.title,
      mealType: meal.mealType,
      menuDescription: meal.menuDescription,
      dateTime: meal.dateTime,
      seatsTotal: meal.seatsTotal,
      currentParticipants,
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

  private normalizePositiveInteger(
    value: number | undefined,
    fallback: number,
  ): number {
    if (value === undefined || !Number.isFinite(value) || value <= 0) {
      return fallback;
    }

    return Math.floor(value);
  }

  private parseOptionalQueryDate(
    value: string | undefined,
    fieldName: string,
  ): Date | null {
    if (!value) {
      return null;
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(
        `${fieldName} doit etre une date ISO valide`,
      );
    }

    return parsedDate;
  }
}
