import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HostProfile } from '../host-profiles/host-profile.entity';
import { Meal, MealStatus } from '../meals/meal.entity';
import { Utilisateur } from '../users/users.entity';
import {
  Booking,
  BookingPaymentState,
  BookingStatus,
} from './booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';

type BookingResponse = {
  id: number;
  guestUserId: number;
  mealId: number;
  seats: number;
  bookingStatus: BookingStatus;
  paymentMethod: Booking['paymentMethod'];
  paymentState: BookingPaymentState;
  unitPriceCents: number;
  totalPriceCents: number;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt: Date | null;
  refusedAt: Date | null;
  cancelledAt: Date | null;
  completedAt: Date | null;
  refusalReason: string | null;
  mealTitle: string | null;
  mealType: string | null;
  mealDateTime: Date;
  host: {
    userId: number;
    pseudo: string | null;
    firstName: string;
    lastName: string;
    city: string;
    country: string;
    profilePhotoUrl: string | null;
  };
  coverImageUrl: string | null;
  locationLabel: string;
  exactAddressLabel: string;
  addressReleaseLabel: string;
  cancellationPolicyLabel: string;
  houseRules: string[];
  reminderLabels: string[];
};

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(Meal)
    private readonly mealsRepository: Repository<Meal>,
    @InjectRepository(Utilisateur)
    private readonly usersRepository: Repository<Utilisateur>,
  ) {}

  async create(userId: number, dto: CreateBookingDto): Promise<BookingResponse> {
    const guestUser = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!guestUser) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const meal = await this.mealsRepository.findOne({
      where: { id: dto.mealId },
      relations: ['host', 'host.hostProfile'],
    });

    if (!meal || meal.status !== MealStatus.PUBLISHED) {
      throw new NotFoundException('Repas publie introuvable');
    }

    if (meal.host.id === userId) {
      throw new BadRequestException(
        'Un hôte ne peut pas réserver sur son propre événement',
      );
    }

    if (meal.dateTime.getTime() <= Date.now()) {
      throw new BadRequestException(
        'Ce repas est deja passe et ne peut plus etre reserve',
      );
    }

    const alreadyReservedSeats = await this.getReservedSeatsCount(meal.id);
    if (alreadyReservedSeats + dto.seats > meal.seatsTotal) {
      throw new BadRequestException(
        'Le nombre de places demande depasse les places restantes',
      );
    }

    const now = new Date();
    const bookingStatus =
      dto.seats > 2 ? BookingStatus.PENDING : BookingStatus.CONFIRMED;
    const paymentState =
      bookingStatus === BookingStatus.PENDING
        ? BookingPaymentState.AWAITING_HOST
        : BookingPaymentState.AUTHORIZED;

    const booking = this.bookingsRepository.create({
      guestUser,
      meal,
      seats: dto.seats,
      bookingStatus,
      paymentMethod: dto.paymentMethod,
      paymentState,
      unitPriceCents: meal.pricePerSeatCents,
      totalPriceCents: meal.pricePerSeatCents * dto.seats,
      confirmedAt: bookingStatus === BookingStatus.CONFIRMED ? now : null,
      refusedAt: null,
      cancelledAt: null,
      completedAt: null,
      refusalReason: null,
    });

    const savedBooking = await this.bookingsRepository.save(booking);
    const reloadedBooking = await this.findOwnedBookingEntity(userId, savedBooking.id);
    return this.toBookingResponse(reloadedBooking);
  }

  async findMine(userId: number): Promise<BookingResponse[]> {
    const bookings = await this.bookingsRepository.find({
      where: { guestUser: { id: userId } },
      relations: ['guestUser', 'meal', 'meal.host', 'meal.host.hostProfile'],
      order: { createdAt: 'DESC' },
    });

    return bookings.map((booking) => this.toBookingResponse(booking));
  }

  async findOneMine(userId: number, bookingId: number): Promise<BookingResponse> {
    const booking = await this.findOwnedBookingEntity(userId, bookingId);
    return this.toBookingResponse(booking);
  }

  private async findOwnedBookingEntity(
    userId: number,
    bookingId: number,
  ): Promise<Booking> {
    const booking = await this.bookingsRepository.findOne({
      where: { id: bookingId, guestUser: { id: userId } },
      relations: ['guestUser', 'meal', 'meal.host', 'meal.host.hostProfile'],
    });

    if (!booking) {
      throw new NotFoundException('Reservation introuvable');
    }

    return booking;
  }

  private async getReservedSeatsCount(mealId: number): Promise<number> {
    const activeStatuses = [
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
      BookingStatus.COMPLETED,
    ];

    const result = await this.bookingsRepository
      .createQueryBuilder('booking')
      .select('COALESCE(SUM(booking.seats), 0)', 'reservedSeats')
      .innerJoin('booking.meal', 'meal')
      .where('meal.id = :mealId', { mealId })
      .andWhere('booking.bookingStatus IN (:...activeStatuses)', {
        activeStatuses,
      })
      .getRawOne<{ reservedSeats: string }>();

    return Number(result?.reservedSeats ?? 0);
  }

  private toBookingResponse(booking: Booking): BookingResponse {
    const host = booking.meal.host;
    const hostProfile = host.hostProfile ?? null;
    const locationLabel =
      this.normalizeNullableString(hostProfile?.districtLabel) ??
      this.normalizeNullableString(hostProfile?.address) ??
      host.city;
    const exactAddressLabel = this.buildExactAddressLabel(host, hostProfile);

    return {
      id: booking.id,
      guestUserId: booking.guestUser.id,
      mealId: booking.meal.id,
      seats: booking.seats,
      bookingStatus: booking.bookingStatus,
      paymentMethod: booking.paymentMethod,
      paymentState: booking.paymentState,
      unitPriceCents: booking.unitPriceCents,
      totalPriceCents: booking.totalPriceCents,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      confirmedAt: booking.confirmedAt,
      refusedAt: booking.refusedAt,
      cancelledAt: booking.cancelledAt,
      completedAt: booking.completedAt,
      refusalReason: booking.refusalReason,
      mealTitle: booking.meal.title,
      mealType: booking.meal.mealType,
      mealDateTime: booking.meal.dateTime,
      host: {
        userId: host.id,
        pseudo: host.pseudo,
        firstName: host.firstName,
        lastName: host.lastName,
        city: host.city,
        country: host.country,
        profilePhotoUrl: host.profilePhotoUrl,
      },
      coverImageUrl: hostProfile?.homePhotoUrl ?? null,
      locationLabel,
      exactAddressLabel,
      addressReleaseLabel:
        'Adresse exacte partagée dans le détail de la réservation 24h avant le repas',
      cancellationPolicyLabel:
        "Annulation gratuite jusqu'a 48h avant, puis retenue partielle.",
      houseRules: this.buildHouseRules(booking.meal, hostProfile),
      reminderLabels: ['Rappel automatique J-3', 'Rappel automatique J-1'],
    };
  }

  private buildHouseRules(meal: Meal, hostProfile: HostProfile | null): string[] {
    const rules = [
      'Adresse exacte partagée 24h avant le repas.',
      "Paiement bloqué jusqu'à la tenue du repas.",
    ];

    if (this.normalizeNullableString(meal.houseRules)) {
      rules.push(meal.houseRules!.trim());
    } else if (hostProfile?.address) {
      rules.push(
        `Annulation gratuite jusqu'à 48h avant le repas prévu à ${hostProfile.city}.`,
      );
    } else {
      rules.push("Annulation gratuite jusqu'à 48h avant le repas.");
    }

    return rules;
  }

  private buildExactAddressLabel(
    host: Utilisateur,
    hostProfile: HostProfile | null,
  ): string {
    const address = this.normalizeNullableString(hostProfile?.address);
    if (address) {
      return `${address}, ${host.city}`;
    }

    return host.city;
  }

  private normalizeNullableString(value?: string | null): string | null {
    const trimmedValue = value?.trim();
    return trimmedValue ? trimmedValue : null;
  }
}