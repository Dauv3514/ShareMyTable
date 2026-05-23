import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Stripe from 'stripe';
import { Repository } from 'typeorm';
import { Booking, BookingStatus } from '../bookings/booking.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Review } from './review.entity';
import { Tip, TipStatus } from './tip.entity';

type ReviewResponse = {
  id: number;
  bookingId: number;
  rating: number;
  comment: string | null;
  createdAt: Date;
};

type PublicHostReviewResponse = {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: Date;
  mealId: number;
  mealTitle: string | null;
  author: {
    userId: number;
    pseudo: string | null;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
  };
};

type TipResponse = {
  id: number;
  bookingId: number;
  amountCents: number;
  paymentId: string | null;
  status: TipStatus;
  clientSecret: string | null;
  paidAt: Date | null;
  createdAt: Date;
};

type CreateReviewResponse = {
  review: ReviewResponse;
  tip: TipResponse | null;
};

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewsRepository: Repository<Review>,
    @InjectRepository(Tip)
    private readonly tipsRepository: Repository<Tip>,
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    private readonly configService: ConfigService,
  ) {}

  async getReviewStateForBooking(userId: number, bookingId: number) {
    const booking = await this.findOwnedBooking(userId, bookingId);
    const review = await this.reviewsRepository.findOne({
      where: { booking: { id: booking.id } },
    });

    return {
      canReview: this.canReviewBooking(booking) && !review,
      hasReview: Boolean(review),
      review: review ? this.toReviewResponse(review, booking.id) : null,
    };
  }

  async findPublicReviewsForHost(
    hostUserId: number,
    limit = 12,
  ): Promise<PublicHostReviewResponse[]> {
    const normalizedLimit = Math.min(30, Math.max(1, limit));
    const reviews = await this.reviewsRepository.find({
      where: {
        booking: {
          meal: {
            host: {
              id: hostUserId,
            },
          },
        },
      },
      relations: [
        'booking',
        'booking.guestUser',
        'booking.meal',
        'booking.meal.host',
      ],
      order: {
        createdAt: 'DESC',
      },
      take: normalizedLimit,
    });

    return reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      mealId: review.booking.meal.id,
      mealTitle: review.booking.meal.title,
      author: {
        userId: review.booking.guestUser.id,
        pseudo: review.booking.guestUser.pseudo,
        firstName: review.booking.guestUser.firstName,
        lastName: review.booking.guestUser.lastName,
        profilePhotoUrl: review.booking.guestUser.profilePhotoUrl,
      },
    }));
  }

  async createForBooking(
    userId: number,
    bookingId: number,
    dto: CreateReviewDto,
  ): Promise<CreateReviewResponse> {
    const booking = await this.findOwnedBooking(userId, bookingId);

    if (!this.canReviewBooking(booking)) {
      throw new BadRequestException(
        'Un avis peut seulement etre laisse apres un repas confirme.',
      );
    }

    const existingReview = await this.reviewsRepository.findOne({
      where: { booking: { id: booking.id } },
    });

    if (existingReview) {
      throw new BadRequestException(
        'Un avis existe deja pour cette reservation.',
      );
    }

    const review = await this.reviewsRepository.save(
      this.reviewsRepository.create({
        booking,
        rating: dto.rating,
        comment: this.normalizeNullableString(dto.comment),
      }),
    );

    if (dto.tipAmountCents <= 0) {
      return {
        review: this.toReviewResponse(review, booking.id),
        tip: null,
      };
    }

    const stripe = this.getStripeClient();
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: dto.tipAmountCents,
        currency: 'eur',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          bookingId: String(booking.id),
          reviewId: String(review.id),
          guestUserId: String(booking.guestUser.id),
          mealId: String(booking.meal.id),
          paymentKind: 'tip',
        },
      },
      {
        idempotencyKey: `booking-${booking.id}-review-${review.id}-tip`,
      },
    );

    if (!paymentIntent.client_secret) {
      throw new InternalServerErrorException(
        'Stripe n’a pas renvoyé de client secret pour ce pourboire',
      );
    }

    const tip = await this.tipsRepository.save(
      this.tipsRepository.create({
        booking,
        review,
        amountCents: dto.tipAmountCents,
        paymentId: paymentIntent.id,
        status: this.mapStripeIntentStatus(paymentIntent.status),
        paidAt: null,
      }),
    );

    return {
      review: this.toReviewResponse(review, booking.id),
      tip: this.toTipResponse(tip, booking.id, paymentIntent.client_secret),
    };
  }

  async confirmTip(userId: number, tipId: number): Promise<TipResponse> {
    const tip = await this.tipsRepository.findOne({
      where: { id: tipId, booking: { guestUser: { id: userId } } },
      relations: ['booking', 'booking.guestUser'],
    });

    if (!tip) {
      throw new NotFoundException('Pourboire introuvable');
    }

    if (!tip.paymentId) {
      throw new BadRequestException('Ce pourboire n a pas de paiement Stripe.');
    }

    const stripe = this.getStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(tip.paymentId);

    tip.status = this.mapStripeIntentStatus(paymentIntent.status);
    if (tip.status === TipStatus.SUCCEEDED && !tip.paidAt) {
      tip.paidAt = new Date();
    }

    const savedTip = await this.tipsRepository.save(tip);
    return this.toTipResponse(savedTip, tip.booking.id, null);
  }

  async updateForBooking(
    userId: number,
    bookingId: number,
    dto: UpdateReviewDto,
  ): Promise<ReviewResponse> {
    const booking = await this.findOwnedBooking(userId, bookingId);
    const review = await this.reviewsRepository.findOne({
      where: { booking: { id: booking.id } },
    });

    if (!review) {
      throw new NotFoundException('Avis introuvable pour cette reservation.');
    }

    review.rating = dto.rating;
    review.comment = this.normalizeNullableString(dto.comment);

    const savedReview = await this.reviewsRepository.save(review);
    return this.toReviewResponse(savedReview, booking.id);
  }

  private async findOwnedBooking(userId: number, bookingId: number) {
    const booking = await this.bookingsRepository.findOne({
      where: { id: bookingId, guestUser: { id: userId } },
      relations: ['guestUser', 'meal'],
    });

    if (!booking) {
      throw new NotFoundException('Reservation introuvable');
    }

    return booking;
  }

  private canReviewBooking(booking: Booking) {
    const mealIsPast = booking.meal.dateTime.getTime() <= Date.now();
    const isConfirmedOrCompleted = [
      BookingStatus.CONFIRMED,
      BookingStatus.COMPLETED,
    ].includes(booking.bookingStatus);

    return mealIsPast && isConfirmedOrCompleted;
  }

  private getStripeClient() {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!secretKey?.trim()) {
      throw new InternalServerErrorException(
        'STRIPE_SECRET_KEY est manquante dans la configuration du backend',
      );
    }

    return new Stripe(secretKey, {
      apiVersion: '2026-04-22.dahlia',
    });
  }

  private mapStripeIntentStatus(status: string) {
    if (status === 'succeeded') {
      return TipStatus.SUCCEEDED;
    }

    if (status === 'canceled') {
      return TipStatus.CANCELED;
    }

    if (status === 'requires_payment_method') {
      return TipStatus.FAILED;
    }

    return TipStatus.PENDING;
  }

  private toReviewResponse(review: Review, bookingId: number): ReviewResponse {
    return {
      id: review.id,
      bookingId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
    };
  }

  private toTipResponse(
    tip: Tip,
    bookingId: number,
    clientSecret: string | null,
  ): TipResponse {
    return {
      id: tip.id,
      bookingId,
      amountCents: tip.amountCents,
      paymentId: tip.paymentId,
      status: tip.status,
      clientSecret,
      paidAt: tip.paidAt,
      createdAt: tip.createdAt,
    };
  }

  private normalizeNullableString(value?: string | null): string | null {
    const trimmedValue = value?.trim();
    return trimmedValue ? trimmedValue : null;
  }
}