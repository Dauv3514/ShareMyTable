import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
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
import {
  MealMenuItem,
  MealMenuItemCategory,
} from './meal-menu-item.entity';
import { MealTagAssignment } from './meal-tag-assignment.entity';
import { MealTag, MealTagCategory } from './meal-tag.entity';
import { MEAL_TAG_SEEDS } from './meal-tags.seed';
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
  menuItems: Array<{
    id: number;
    category: MealMenuItemCategory;
    label: string;
    position: number;
  }>;
  dateTime: Date;
  seatsTotal: number;
  currentParticipants: number;
  pricePerSeatCents: number;
  houseRules: string | null;
  selectedTagCodes: string[];
  selectedFilterIds: string[];
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
export class MealsService implements OnModuleInit {
  constructor(
    @InjectRepository(Meal)
    private readonly mealsRepository: Repository<Meal>,
    @InjectRepository(MealMenuItem)
    private readonly mealMenuItemsRepository: Repository<MealMenuItem>,
    @InjectRepository(MealTag)
    private readonly mealTagsRepository: Repository<MealTag>,
    @InjectRepository(MealTagAssignment)
    private readonly mealTagAssignmentsRepository: Repository<MealTagAssignment>,
    @InjectRepository(Utilisateur)
    private readonly usersRepository: Repository<Utilisateur>,
    @InjectRepository(HostProfile)
    private readonly hostProfilesRepository: Repository<HostProfile>,
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedMealTags();
    await this.backfillExistingMealMenuItems();
    await this.backfillExistingMealTags();
  }

  async create(userId: number, dto: CreateMealDto): Promise<MealResponse> {
    const user = await this.ensureApprovedActiveHost(userId);

    const meal = this.mealsRepository.create({
      host: user,
      title: dto.title.trim(),
      mealType: this.normalizeNullableString(dto.mealType),
      menuDescription: this.normalizeMenuDescription(dto),
      dateTime: new Date(dto.dateTime),
      seatsTotal: dto.seatsTotal,
      pricePerSeatCents: dto.pricePerSeatCents,
      houseRules: this.normalizeNullableString(dto.houseRules),
      status: MealStatus.DRAFT,
    });

    const savedMeal = await this.mealsRepository.save(meal);
    await this.syncMealMenuItems(savedMeal.id, dto.menuItems);
    await this.syncMealTags(savedMeal.id, dto.selectedTagCodes);
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
      .leftJoinAndSelect('meal.menuItems', 'menuItems')
      .leftJoinAndSelect('meal.tagAssignments', 'tagAssignments')
      .leftJoinAndSelect('tagAssignments.tag', 'tag')
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
      relations: ['host', 'menuItems', 'tagAssignments', 'tagAssignments.tag'],
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
      relations: ['host', 'menuItems', 'tagAssignments', 'tagAssignments.tag'],
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

    if (dto.menuItems !== undefined) {
      meal.menuDescription = this.normalizeMenuDescription(dto);
      await this.syncMealMenuItems(meal.id, dto.menuItems);
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

    if (dto.selectedTagCodes !== undefined) {
      await this.syncMealTags(meal.id, dto.selectedTagCodes);
    }

    await this.mealsRepository.save(meal);
    const reloadedMeal = await this.findOwnedMealEntity(userId, meal.id);
    return this.toMealResponse(reloadedMeal);
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
      relations: ['host', 'menuItems', 'tagAssignments', 'tagAssignments.tag'],
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

    if (!this.hasMenuContent(meal)) {
      throw new BadRequestException(
        'Le menu est obligatoire pour publier un repas',
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

    const hasHouseRuleTag = this.getAssignedTags(meal).some(
      (tag) => tag.category === MealTagCategory.HOUSE_RULE,
    );

    if (
      (!meal.houseRules || meal.houseRules.trim().length === 0) &&
      !hasHouseRuleTag
    ) {
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
    const assignedTags = this.getAssignedTags(meal);
    const selectedTagCodes = assignedTags.map((tag) => tag.code);
    const selectedFilterIds = assignedTags
      .filter((tag) => tag.category !== MealTagCategory.HOUSE_RULE)
      .map((tag) => tag.code);

    return {
      id: meal.id,
      title: meal.title,
      mealType: meal.mealType,
      menuDescription: meal.menuDescription,
      menuItems: this.getMenuItems(meal).map((item) => ({
        id: item.id,
        category: item.category,
        label: item.label,
        position: item.position,
      })),
      dateTime: meal.dateTime,
      seatsTotal: meal.seatsTotal,
      currentParticipants,
      pricePerSeatCents: meal.pricePerSeatCents,
      houseRules: meal.houseRules,
      selectedTagCodes,
      selectedFilterIds,
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

  private normalizeMenuDescription(dto: {
    menuDescription?: string;
    menuItems?: Array<{
      category: MealMenuItemCategory;
      label: string;
      position?: number;
    }>;
  }): string | null {
    const normalizedMenuDescription = this.normalizeNullableString(
      dto.menuDescription,
    );

    if (normalizedMenuDescription) {
      return normalizedMenuDescription;
    }

    const itemLabels = this.normalizeMenuItems(dto.menuItems).map(
      (item) => item.label,
    );

    return itemLabels.length > 0 ? itemLabels.join('\n') : null;
  }

  private normalizeMenuItems(
    items?: Array<{
      category: MealMenuItemCategory;
      label: string;
      position?: number;
    }> | null,
  ): Array<{
    category: MealMenuItemCategory;
    label: string;
    position: number;
  }> {
    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .map((item, index) => ({
        category: item.category,
        label: item.label.trim(),
        position:
          typeof item.position === 'number' && Number.isInteger(item.position)
            ? item.position
            : index,
      }))
      .filter(
        (item) =>
          item.label.length > 0 &&
          Object.values(MealMenuItemCategory).includes(item.category),
      )
      .sort((firstItem, secondItem) => firstItem.position - secondItem.position)
      .map((item, index) => ({
        ...item,
        position: index,
      }));
  }

  private async syncMealMenuItems(
    mealId: number,
    items?: Array<{
      category: MealMenuItemCategory;
      label: string;
      position?: number;
    }> | null,
  ): Promise<void> {
    const normalizedItems = this.normalizeMenuItems(items);

    await this.mealMenuItemsRepository
      .createQueryBuilder()
      .delete()
      .where('meal_id = :mealId', { mealId })
      .execute();

    if (normalizedItems.length === 0) {
      return;
    }

    await this.mealMenuItemsRepository.save(
      normalizedItems.map((item) =>
        this.mealMenuItemsRepository.create({
          meal: { id: mealId },
          category: item.category,
          label: item.label,
          position: item.position,
        }),
      ),
    );
  }

  private getMenuItems(meal: Meal): MealMenuItem[] {
    return [...(meal.menuItems ?? [])].sort(
      (firstItem, secondItem) => firstItem.position - secondItem.position,
    );
  }

  private hasMenuContent(meal: Meal): boolean {
    return (
      this.getMenuItems(meal).length > 0 ||
      Boolean(meal.menuDescription && meal.menuDescription.trim().length > 0)
    );
  }

  private normalizeStringList(values?: string[] | null): string[] {
    if (!Array.isArray(values)) {
      return [];
    }

    return Array.from(
      new Set(
        values
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      ),
    );
  }

  private getAssignedTags(meal: Meal): MealTag[] {
    return (meal.tagAssignments ?? [])
      .map((assignment) => assignment.tag)
      .filter((tag): tag is MealTag => Boolean(tag))
      .sort((firstTag, secondTag) => {
        if (firstTag.category !== secondTag.category) {
          return firstTag.category.localeCompare(secondTag.category);
        }

        return firstTag.sortOrder - secondTag.sortOrder;
      });
  }

  private async seedMealTags(): Promise<void> {
    for (const tagSeed of MEAL_TAG_SEEDS) {
      const existingTag = await this.mealTagsRepository.findOne({
        where: { code: tagSeed.code },
      });

      if (existingTag) {
        existingTag.label = tagSeed.label;
        existingTag.category = tagSeed.category;
        existingTag.sortOrder = tagSeed.sortOrder;
        existingTag.isActive = true;
        await this.mealTagsRepository.save(existingTag);
      } else {
        await this.mealTagsRepository.save(
          this.mealTagsRepository.create({
            code: tagSeed.code,
            label: tagSeed.label,
            category: tagSeed.category,
            sortOrder: tagSeed.sortOrder,
            isActive: true,
          }),
        );
      }
    }
  }

  private async backfillExistingMealTags(): Promise<void> {
    const meals = await this.mealsRepository.find({
      relations: ['tagAssignments', 'tagAssignments.tag'],
    });

    for (const meal of meals) {
      if ((meal.tagAssignments ?? []).length > 0) {
        continue;
      }

      const inferredTagCodes = this.inferTagCodesForExistingMeal(meal);

      if (inferredTagCodes.length > 0) {
        await this.syncMealTags(meal.id, inferredTagCodes);
      }
    }
  }

  private async backfillExistingMealMenuItems(): Promise<void> {
    const meals = await this.mealsRepository.find({
      relations: ['menuItems'],
    });

    for (const meal of meals) {
      if ((meal.menuItems ?? []).length > 0 || !meal.menuDescription?.trim()) {
        continue;
      }

      const legacyItems = meal.menuDescription
        .split(/[\n.,;:]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((label, index) => ({
          category: MealMenuItemCategory.MAIN,
          label,
          position: index,
        }));

      if (legacyItems.length > 0) {
        await this.syncMealMenuItems(meal.id, legacyItems);
      }
    }
  }

  private inferTagCodesForExistingMeal(meal: Meal): string[] {
    const haystack = this.normalizeSearchText(
      [
        meal.title,
        meal.mealType,
        meal.menuDescription,
        meal.houseRules,
      ]
        .filter(Boolean)
        .join(' '),
    );
    const tagCodes = new Set<string>();

    if (
      this.containsAny(haystack, [
        'heure',
        'ponctuel',
        'ponctualite',
        'retard',
        '12h30',
        '12h45',
      ])
    ) {
      tagCodes.add('arriver_a_l_heure');
    }

    if (this.containsAny(haystack, ['allergie', 'allergies', 'contrainte'])) {
      tagCodes.add('prevenir_allergie');
    }

    if (this.containsAny(haystack, ['chaussure', 'chaussures'])) {
      tagCodes.add('retirer_ses_chaussures');
    }

    if (this.containsAny(haystack, ['calme', 'douce', 'pause dej', 'rapide'])) {
      tagCodes.add('ambiance_calme');
      tagCodes.add('repas-calme');
    }

    if (
      this.containsAny(haystack, [
        'detendue',
        'detendu',
        'convivial',
        'partage',
        'partager',
        'groupes',
        'table test',
        'parcours avis',
      ])
    ) {
      tagCodes.add('ambiance-decontractee');
    }

    if (this.containsAny(haystack, ['apero', 'boisson', 'festif'])) {
      tagCodes.add('convivial-et-festif');
    }

    if (this.containsAny(haystack, ['jeux'])) {
      tagCodes.add('soiree-jeux');
    }

    if (
      this.containsAny(haystack, [
        'couscous',
        'marocain',
        'marocaine',
        'libanais',
        'asiatique',
        'dumplings',
        'bo bun',
        'curry',
        'italienne',
        'pasta',
        'tapas',
        'mediterraneen',
      ])
    ) {
      tagCodes.add('cuisine-du-monde');
      tagCodes.add('decouverte-culinaire');
    }

    if (this.containsAny(haystack, ['balcon', 'barbecue', 'terrasse', 'ete'])) {
      tagCodes.add('repas-en-plein-air');
    }

    if (
      this.containsAny(haystack, [
        'vegetarien',
        'vegetariens',
        'veggie',
        'legumes',
        'legume',
      ])
    ) {
      tagCodes.add('vegetarien');
    }

    if (
      this.containsAny(haystack, [
        'noisette',
        'noisettes',
        'amande',
        'amandes',
        'noix',
      ])
    ) {
      tagCodes.add('allergie-aux-noix');
    }

    if (this.containsAny(haystack, ['poulet', 'boeuf', 'chawarma'])) {
      tagCodes.add('halal');
    }

    if (this.containsAny(haystack, ['pancakes', 'granola', 'brunch'])) {
      tagCodes.add('flexitarien');
    }

    if (!this.hasTagCategory(tagCodes, MealTagCategory.HOUSE_RULE)) {
      tagCodes.add('arriver_a_l_heure');
    }

    if (!this.hasTagCategory(tagCodes, MealTagCategory.MEAL_AMBIANCE)) {
      tagCodes.add('ambiance-decontractee');
    }

    if (!this.hasTagCategory(tagCodes, MealTagCategory.DIETARY_PREFERENCE)) {
      tagCodes.add('flexitarien');
    }

    return Array.from(tagCodes);
  }

  private hasTagCategory(tagCodes: Set<string>, category: MealTagCategory): boolean {
    return MEAL_TAG_SEEDS.some(
      (tagSeed) => tagSeed.category === category && tagCodes.has(tagSeed.code),
    );
  }

  private containsAny(haystack: string, needles: string[]): boolean {
    return needles.some((needle) => haystack.includes(this.normalizeSearchText(needle)));
  }

  private normalizeSearchText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private async syncMealTags(
    mealId: number,
    selectedTagCodes?: string[] | null,
  ): Promise<void> {
    const normalizedCodes = this.normalizeStringList(selectedTagCodes);

    if (normalizedCodes.length === 0) {
      await this.mealTagAssignmentsRepository.delete({ mealId });
      return;
    }

    const tags = await this.mealTagsRepository.find({
      where: {
        code: In(normalizedCodes),
        isActive: true,
      },
    });

    const foundCodes = new Set(tags.map((tag) => tag.code));
    const unknownCodes = normalizedCodes.filter((code) => !foundCodes.has(code));

    if (unknownCodes.length > 0) {
      throw new BadRequestException(
        `Tags de repas inconnus: ${unknownCodes.join(', ')}`,
      );
    }

    await this.mealTagAssignmentsRepository.delete({ mealId });

    await this.mealTagAssignmentsRepository.save(
      tags.map((tag) =>
        this.mealTagAssignmentsRepository.create({
          mealId,
          tagId: tag.id,
        }),
      ),
    );
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
