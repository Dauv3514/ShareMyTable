import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HostProfile } from '../host-profiles/host-profile.entity';
import { Meal, MealStatus } from '../meals/meal.entity';
import { MessagingService } from '../messaging/messaging.service';
import { PaymentsService } from '../payments/payments.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
import { Utilisateur } from '../users/users.entity';
import {
  Booking,
  BookingPaymentState,
  BookingStatus,
} from './booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RefuseBookingDto } from './dto/refuse-booking.dto';

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
  exactLocationLat: number | null;
  exactLocationLng: number | null;
  addressReleaseLabel: string;
  cancellationPolicyLabel: string;
  houseRules: string[];
  reminderLabels: string[];
  canReview: boolean;
  hasReview: boolean;
  review: {
    id: number;
    bookingId: number;
    rating: number;
    comment: string | null;
    createdAt: Date;
    tip: {
      id: number;
      amountCents: number;
      paymentId: string | null;
      status: string;
      paidAt: Date | null;
      createdAt: Date;
    } | null;
  } | null;
};

type HostBookingGuestResponse = {
  userId: number;
  pseudo: string | null;
  firstName: string;
  lastName: string;
  city: string;
  country: string;
  profilePhotoUrl: string | null;
};

type HostBookingResponse = {
  id: number;
  mealId: number;
  seats: number;
  bookingStatus: BookingStatus;
  paymentState: BookingPaymentState;
  totalPriceCents: number;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt: Date | null;
  refusedAt: Date | null;
  cancelledAt: Date | null;
  completedAt: Date | null;
  refusalReason: string | null;
  guest: HostBookingGuestResponse;
};

type HostMealBookingSummaryResponse = {
  mealId: number;
  mealTitle: string | null;
  mealStatus: MealStatus;
  mealDateTime: Date;
  seatsTotal: number;
  pendingBookingsCount: number;
  pendingSeatsCount: number;
  confirmedBookingsCount: number;
  confirmedSeatsCount: number;
  refusedBookingsCount: number;
  cancelledBookingsCount: number;
  totalActiveSeatsCount: number;
};

type HostMealBookingsResponse = HostMealBookingSummaryResponse & {
  bookings: HostBookingResponse[];
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
    private readonly messagingService: MessagingService,
    private readonly paymentsService: PaymentsService,
    private readonly pushNotificationsService: PushNotificationsService,
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
      throw new NotFoundException('Événement publie introuvable');
    }

    if (meal.host.id === userId) {
      throw new BadRequestException(
        'Un hôte ne peut pas réserver sur son propre événement',
      );
    }

    if (meal.dateTime.getTime() <= Date.now()) {
      throw new BadRequestException(
        'Cet événement est deja passe et ne peut plus etre reserve',
      );
    }

    const existingActiveBooking =
      await this.findActiveBookingForMealAndGuest(meal.id, userId);

    if (existingActiveBooking) {
      await this.messagingService.openReservationDirectConversation(meal.id, userId);
      return this.toBookingResponse(existingActiveBooking);
    }

    const alreadyReservedSeats = await this.getReservedSeatsCount(meal.id);
    if (alreadyReservedSeats + dto.seats > meal.seatsTotal) {
      throw new BadRequestException(
        'Le nombre de places demande depasse les places restantes',
      );
    }

    const booking = this.bookingsRepository.create({
      guestUser,
      meal,
      seats: dto.seats,
      bookingStatus: BookingStatus.PENDING,
      paymentMethod: dto.paymentMethod,
      paymentState: BookingPaymentState.AWAITING_HOST,
      unitPriceCents: meal.pricePerSeatCents,
      totalPriceCents: meal.pricePerSeatCents * dto.seats,
      confirmedAt: null,
      refusedAt: null,
      cancelledAt: null,
      completedAt: null,
      refusalReason: null,
    });

    const savedBooking = await this.bookingsRepository.save(booking);
    await this.messagingService.openReservationDirectConversation(meal.id, userId);
    await this.notifyHostNewBooking(savedBooking);
    const reloadedBooking = await this.findOwnedBookingEntity(userId, savedBooking.id);
    return this.toBookingResponse(reloadedBooking);
  }

  async findMine(userId: number): Promise<BookingResponse[]> {
    const bookings = await this.bookingsRepository.find({
      where: { guestUser: { id: userId } },
      relations: [
        'guestUser',
        'meal',
        'meal.host',
        'meal.host.hostProfile',
        'review',
        'review.tip',
      ],
      order: { createdAt: 'DESC' },
    });

    return bookings.map((booking) => this.toBookingResponse(booking));
  }

  async findOneMine(userId: number, bookingId: number): Promise<BookingResponse> {
    const booking = await this.findOwnedBookingEntity(userId, bookingId);
    return this.toBookingResponse(booking);
  }

  async cancelMine(userId: number, bookingId: number): Promise<BookingResponse> {
    const booking = await this.findOwnedBookingEntity(userId, bookingId);

    if (
      [BookingStatus.CANCELLED, BookingStatus.REFUSED, BookingStatus.COMPLETED].includes(
        booking.bookingStatus,
      )
    ) {
      throw new BadRequestException(
        'Cette reservation ne peut plus etre annulee',
      );
    }

    if (booking.meal.dateTime.getTime() <= Date.now()) {
      throw new BadRequestException(
        'Cet événement est deja passe et ne peut plus etre annule',
      );
    }

    const refundAmountCents = this.getCancellationRefundAmountCents(booking);
    const paymentResult =
      await this.paymentsService.cancelOrRefundPaymentForBooking(
        booking.id,
        refundAmountCents,
      );

    booking.bookingStatus = BookingStatus.CANCELLED;
    booking.paymentState = paymentResult.paymentState;
    booking.cancelledAt = new Date();

    const savedBooking = await this.bookingsRepository.save(booking);
    await this.syncAcceptedMealConversations(savedBooking.meal.id);
    await this.notifyHostBookingCancelled(savedBooking);
    return this.toBookingResponse(savedBooking);
  }

  async findHostMealSummaries(
    hostUserId: number,
  ): Promise<HostMealBookingSummaryResponse[]> {
    const meals = await this.mealsRepository.find({
      where: { host: { id: hostUserId } },
      relations: ['host'],
      order: { dateTime: 'ASC' },
    });

    if (meals.length === 0) {
      return [];
    }

    const bookings = await this.bookingsRepository.find({
      where: { meal: { host: { id: hostUserId } } },
      relations: ['meal', 'meal.host', 'guestUser'],
      order: { createdAt: 'DESC' },
    });

    return meals.map((meal) => {
      const mealBookings = this.dedupeBookingsByGuest(
        bookings.filter((booking) => booking.meal.id === meal.id),
      );
      return this.toHostMealBookingSummaryResponse(meal, mealBookings);
    });
  }

  async findHostMealBookings(
    hostUserId: number,
    mealId: number,
  ): Promise<HostMealBookingsResponse> {
    const meal = await this.findHostedMealEntity(hostUserId, mealId);

    const bookings = await this.bookingsRepository.find({
      where: { meal: { id: meal.id, host: { id: hostUserId } } },
      relations: ['meal', 'meal.host', 'guestUser'],
      order: { createdAt: 'DESC' },
    });

    const visibleBookings = this.dedupeBookingsByGuest(bookings);

    return {
      ...this.toHostMealBookingSummaryResponse(meal, visibleBookings),
      bookings: visibleBookings.map((booking) => this.toHostBookingResponse(booking)),
    };
  }

  async acceptHostBooking(
    hostUserId: number,
    bookingId: number,
  ): Promise<HostBookingResponse> {
    const booking = await this.findHostedBookingEntity(hostUserId, bookingId);

    const canBeAccepted = [
      BookingStatus.PENDING,
      BookingStatus.REFUSED,
    ].includes(booking.bookingStatus);

    if (!canBeAccepted) {
      throw new BadRequestException(
        'Seules les demandes en attente ou declinees peuvent etre acceptees',
      );
    }

    booking.bookingStatus = BookingStatus.CONFIRMED;
    booking.paymentState = BookingPaymentState.AUTHORIZED;
    booking.confirmedAt = new Date();
    booking.refusedAt = null;
    booking.refusalReason = null;

    const savedBooking = await this.bookingsRepository.save(booking);
    await this.syncAcceptedMealConversations(savedBooking.meal.id);
    await this.notifyGuestBookingAccepted(savedBooking);
    return this.toHostBookingResponse(savedBooking);
  }

  async refuseHostBooking(
    hostUserId: number,
    bookingId: number,
    dto: RefuseBookingDto,
  ): Promise<HostBookingResponse> {
    const booking = await this.findHostedBookingEntity(hostUserId, bookingId);

    if (booking.bookingStatus !== BookingStatus.PENDING) {
      throw new BadRequestException(
        'Seules les demandes en attente peuvent etre refusees',
      );
    }

    await this.paymentsService.cancelPaymentForBooking(booking.id);

    booking.bookingStatus = BookingStatus.REFUSED;
    booking.paymentState = BookingPaymentState.REFUNDED;
    booking.refusedAt = new Date();
    booking.confirmedAt = null;
    booking.refusalReason = this.normalizeNullableString(dto.reason);

    const savedBooking = await this.bookingsRepository.save(booking);
    await this.syncAcceptedMealConversations(savedBooking.meal.id);
    await this.notifyGuestBookingRefused(savedBooking);
    return this.toHostBookingResponse(savedBooking);
  }

  private async notifyHostNewBooking(booking: Booking): Promise<void> {
    await this.pushNotificationsService.notifyUsers([booking.meal.host.id], {
      title: 'Nouvelle demande de réservation',
      body: `${this.getUserDisplayName(booking.guestUser)} souhaite réserver ${booking.seats} place${booking.seats > 1 ? 's' : ''} pour ${booking.meal.title ?? 'ton repas'}.`,
      url: '/mes-evenements',
      tag: `booking-request-${booking.id}`,
      data: {
        type: 'booking_request',
        bookingId: booking.id,
        mealId: booking.meal.id,
      },
    });
  }

  private async notifyGuestBookingAccepted(booking: Booking): Promise<void> {
    await this.pushNotificationsService.notifyUsers([booking.guestUser.id], {
      title: 'Réservation acceptée',
      body: `Ta réservation pour ${booking.meal.title ?? 'le repas'} a été acceptée.`,
      url: `/reservation/${booking.meal.id}/confirmation?reservationId=${booking.id}`,
      tag: `booking-${booking.id}`,
      data: {
        type: 'booking_accepted',
        bookingId: booking.id,
        mealId: booking.meal.id,
      },
    });
  }

  private async notifyGuestBookingRefused(booking: Booking): Promise<void> {
    await this.pushNotificationsService.notifyUsers([booking.guestUser.id], {
      title: 'Réservation refusée',
      body: `Ta demande pour ${booking.meal.title ?? 'le repas'} n'a pas été acceptée.`,
      url: `/reservation/${booking.meal.id}/confirmation?reservationId=${booking.id}`,
      tag: `booking-${booking.id}`,
      data: {
        type: 'booking_refused',
        bookingId: booking.id,
        mealId: booking.meal.id,
      },
    });
  }

  private async notifyHostBookingCancelled(booking: Booking): Promise<void> {
    await this.pushNotificationsService.notifyUsers([booking.meal.host.id], {
      title: 'Réservation annulée',
      body: `${this.getUserDisplayName(booking.guestUser)} a annulé sa réservation pour ${booking.meal.title ?? 'ton repas'}.`,
      url: '/mes-evenements',
      tag: `booking-${booking.id}`,
      data: {
        type: 'booking_cancelled',
        bookingId: booking.id,
        mealId: booking.meal.id,
      },
    });
  }

  private getUserDisplayName(user: Utilisateur): string {
    return (
      user.pseudo ||
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
      'Un invité'
    );
  }

  private async syncAcceptedMealConversations(mealId: number): Promise<void> {
    const participantUserIds = await this.findConfirmedParticipantUserIds(mealId);
    await this.messagingService.syncAcceptedMealConversations(
      mealId,
      participantUserIds,
    );
  }

  private async findConfirmedParticipantUserIds(mealId: number): Promise<number[]> {
    const confirmedBookings = await this.bookingsRepository.find({
      where: {
        meal: { id: mealId },
        bookingStatus: BookingStatus.CONFIRMED,
      },
      relations: ['guestUser'],
      order: { createdAt: 'DESC' },
    });

    return this.dedupeBookingsByGuest(confirmedBookings).map(
      (booking) => booking.guestUser.id,
    );
  }

  private async findOwnedBookingEntity(
    userId: number,
    bookingId: number,
  ): Promise<Booking> {
    const booking = await this.bookingsRepository.findOne({
      where: { id: bookingId, guestUser: { id: userId } },
      relations: [
        'guestUser',
        'meal',
        'meal.host',
        'meal.host.hostProfile',
        'review',
        'review.tip',
      ],
    });

    if (!booking) {
      throw new NotFoundException('Reservation introuvable');
    }

    return booking;
  }

  private async findHostedMealEntity(
    hostUserId: number,
    mealId: number,
  ): Promise<Meal> {
    const meal = await this.mealsRepository.findOne({
      where: { id: mealId, host: { id: hostUserId } },
      relations: ['host'],
    });

    if (!meal) {
      throw new NotFoundException('Événements hote introuvable');
    }

    return meal;
  }

  private async findHostedBookingEntity(
    hostUserId: number,
    bookingId: number,
  ): Promise<Booking> {
    const booking = await this.bookingsRepository.findOne({
      where: { id: bookingId, meal: { host: { id: hostUserId } } },
      relations: ['guestUser', 'meal', 'meal.host'],
    });

    if (!booking) {
      throw new NotFoundException('Demande de reservation introuvable');
    }

    return booking;
  }

  private async findActiveBookingForMealAndGuest(
    mealId: number,
    guestUserId: number,
  ): Promise<Booking | null> {
    return this.bookingsRepository.findOne({
      where: [
        {
          meal: { id: mealId },
          guestUser: { id: guestUserId },
          bookingStatus: BookingStatus.PENDING,
        },
        {
          meal: { id: mealId },
          guestUser: { id: guestUserId },
          bookingStatus: BookingStatus.CONFIRMED,
        },
        {
          meal: { id: mealId },
          guestUser: { id: guestUserId },
          bookingStatus: BookingStatus.COMPLETED,
        },
      ],
      relations: [
        'guestUser',
        'meal',
        'meal.host',
        'meal.host.hostProfile',
        'review',
        'review.tip',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  private async getReservedSeatsCount(mealId: number): Promise<number> {
    const activeStatuses = [
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
      BookingStatus.COMPLETED,
    ];

    const bookings = await this.bookingsRepository
      .createQueryBuilder('booking')
      .innerJoinAndSelect('booking.meal', 'meal')
      .innerJoinAndSelect('booking.guestUser', 'guestUser')
      .where('meal.id = :mealId', { mealId })
      .andWhere('booking.bookingStatus IN (:...activeStatuses)', {
        activeStatuses,
      })
      .orderBy('booking.createdAt', 'DESC')
      .getMany();

    return this.sumBookingSeats(this.dedupeBookingsByGuest(bookings));
  }

  private getCancellationRefundAmountCents(booking: Booking): number {
    const millisecondsUntilMeal = booking.meal.dateTime.getTime() - Date.now();
    const hoursUntilMeal = millisecondsUntilMeal / (1000 * 60 * 60);

    if (hoursUntilMeal >= 48) {
      return booking.totalPriceCents;
    }

    if (hoursUntilMeal >= 24) {
      return Math.round(booking.totalPriceCents / 2);
    }

    return 0;
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
      exactLocationLat: hostProfile?.lat ?? null,
      exactLocationLng: hostProfile?.lng ?? null,
      addressReleaseLabel:
        'Adresse exacte partagée 24h avant l événement',
      cancellationPolicyLabel:
        "Annulation gratuite jusqu'a 48h avant, puis retenue partielle.",
      houseRules: this.buildHouseRules(booking.meal, hostProfile),
      reminderLabels: ['Rappel automatique J-3', 'Rappel automatique J-1'],
      canReview: this.canReviewBooking(booking) && !booking.review,
      hasReview: Boolean(booking.review),
      review: this.toReviewResponse(booking),
    };
  }

  private toReviewResponse(booking: Booking): BookingResponse['review'] {
    const review = booking.review ?? null;

    if (!review) {
      return null;
    }

    const tip = review.tip ?? null;

    return {
      id: review.id,
      bookingId: booking.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      tip: tip
        ? {
            id: tip.id,
            amountCents: tip.amountCents,
            paymentId: tip.paymentId,
            status: tip.status,
            paidAt: tip.paidAt,
            createdAt: tip.createdAt,
          }
        : null,
    };
  }

  private canReviewBooking(booking: Booking): boolean {
    const mealIsPast = booking.meal.dateTime.getTime() <= Date.now();
    const isConfirmedOrCompleted = [
      BookingStatus.CONFIRMED,
      BookingStatus.COMPLETED,
    ].includes(booking.bookingStatus);

    return mealIsPast && isConfirmedOrCompleted;
  }

  private toHostMealBookingSummaryResponse(
    meal: Meal,
    bookings: Booking[],
  ): HostMealBookingSummaryResponse {
    const pendingBookings = bookings.filter(
      (booking) => booking.bookingStatus === BookingStatus.PENDING,
    );
    const confirmedBookings = bookings.filter(
      (booking) => booking.bookingStatus === BookingStatus.CONFIRMED,
    );
    const refusedBookings = bookings.filter(
      (booking) => booking.bookingStatus === BookingStatus.REFUSED,
    );
    const cancelledBookings = bookings.filter(
      (booking) => booking.bookingStatus === BookingStatus.CANCELLED,
    );

    return {
      mealId: meal.id,
      mealTitle: meal.title,
      mealStatus: meal.status,
      mealDateTime: meal.dateTime,
      seatsTotal: meal.seatsTotal,
      pendingBookingsCount: pendingBookings.length,
      pendingSeatsCount: this.sumBookingSeats(pendingBookings),
      confirmedBookingsCount: confirmedBookings.length,
      confirmedSeatsCount: this.sumBookingSeats(confirmedBookings),
      refusedBookingsCount: refusedBookings.length,
      cancelledBookingsCount: cancelledBookings.length,
      totalActiveSeatsCount: this.sumBookingSeats([
        ...pendingBookings,
        ...confirmedBookings,
      ]),
    };
  }

  private toHostBookingResponse(booking: Booking): HostBookingResponse {
    return {
      id: booking.id,
      mealId: booking.meal.id,
      seats: booking.seats,
      bookingStatus: booking.bookingStatus,
      paymentState: booking.paymentState,
      totalPriceCents: booking.totalPriceCents,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      confirmedAt: booking.confirmedAt,
      refusedAt: booking.refusedAt,
      cancelledAt: booking.cancelledAt,
      completedAt: booking.completedAt,
      refusalReason: booking.refusalReason,
      guest: {
        userId: booking.guestUser.id,
        pseudo: booking.guestUser.pseudo,
        firstName: booking.guestUser.firstName,
        lastName: booking.guestUser.lastName,
        city: booking.guestUser.city,
        country: booking.guestUser.country,
        profilePhotoUrl: booking.guestUser.profilePhotoUrl,
      },
    };
  }

  private sumBookingSeats(bookings: Booking[]): number {
    return bookings.reduce((total, booking) => total + booking.seats, 0);
  }

  private dedupeBookingsByGuest(bookings: Booking[]): Booking[] {
    const bookingsByGuest = new Map<number, Booking>();

    for (const booking of bookings) {
      const existingBooking = bookingsByGuest.get(booking.guestUser.id);

      if (
        !existingBooking ||
        this.compareBookingVisibilityPriority(booking, existingBooking) > 0
      ) {
        bookingsByGuest.set(booking.guestUser.id, booking);
      }
    }

    return [...bookingsByGuest.values()].sort(
      (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
    );
  }

  private compareBookingVisibilityPriority(left: Booking, right: Booking): number {
    const priorityDifference =
      this.getBookingVisibilityPriority(left.bookingStatus) -
      this.getBookingVisibilityPriority(right.bookingStatus);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return left.createdAt.getTime() - right.createdAt.getTime();
  }

  private getBookingVisibilityPriority(status: BookingStatus): number {
    if (status === BookingStatus.COMPLETED) {
      return 5;
    }

    if (status === BookingStatus.CONFIRMED) {
      return 4;
    }

    if (status === BookingStatus.PENDING) {
      return 3;
    }

    if (status === BookingStatus.REFUSED) {
      return 2;
    }

    return 1;
  }

  private buildHouseRules(meal: Meal, hostProfile: HostProfile | null): string[] {
    const rules = [
      "Adresse exacte partagée 24h avant l'événement.",
      "Paiement bloqué jusqu'à la tenue de l'événement.",
    ];

    if (this.normalizeNullableString(meal.houseRules)) {
      rules.push(meal.houseRules!.trim());
    } else if (hostProfile?.address) {
      rules.push(
        `Annulation gratuite jusqu'à 48h avant l'événement prévu à ${hostProfile.city}.`,
      );
    } else {
      rules.push("Annulation gratuite jusqu'à 48h avant l'événement.");
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
