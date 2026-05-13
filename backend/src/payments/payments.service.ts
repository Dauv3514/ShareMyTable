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
import { Booking } from '../bookings/booking.entity';
import {
  Payment,
  PaymentProvider,
  PaymentStatus,
} from './payment.entity';

type CreatePaymentIntentResponse = {
  paymentId: number;
  bookingId: number;
  provider: PaymentProvider;
  providerIntentId: string;
  clientSecret: string;
  amountTotalCents: number;
  platformFeeCents: number;
  hostAmountCents: number;
  status: PaymentStatus;
};

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    private readonly configService: ConfigService,
  ) {}

  async createIntent(
    userId: number,
    bookingId: number,
  ): Promise<CreatePaymentIntentResponse> {
    const booking = await this.bookingsRepository.findOne({
      where: { id: bookingId, guestUser: { id: userId } },
      relations: ['guestUser', 'meal', 'payment'],
    });

    if (!booking) {
      throw new NotFoundException('Reservation introuvable');
    }

    if (booking.totalPriceCents <= 0) {
      throw new BadRequestException(
        'Le montant de la reservation est invalide',
      );
    }

    const stripe = this.getStripeClient();
    const existingPayment = booking.payment ?? null;

    if (existingPayment?.status === PaymentStatus.SUCCEEDED) {
      throw new BadRequestException(
        'Un paiement a deja ete confirme pour cette reservation',
      );
    }

    if (
      existingPayment?.providerIntentId &&
      [PaymentStatus.PENDING, PaymentStatus.AUTHORIZED].includes(
        existingPayment.status,
      )
    ) {
      const existingIntent = await stripe.paymentIntents.retrieve(
        existingPayment.providerIntentId,
      );

      if (!existingIntent.client_secret) {
        throw new InternalServerErrorException(
          'Stripe n’a pas renvoyé de client secret pour le paiement existant',
        );
      }

      const normalizedExistingStatus = this.mapStripeIntentStatus(
        existingIntent.status,
      );

      if (existingPayment.status !== normalizedExistingStatus) {
        existingPayment.status = normalizedExistingStatus;
        await this.paymentsRepository.save(existingPayment);
      }

      return this.toCreateIntentResponse(
        existingPayment,
        existingIntent.client_secret,
      );
    }

    const platformFeeCents = 0;
    const hostAmountCents = Math.max(
      0,
      booking.totalPriceCents - platformFeeCents,
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount: booking.totalPriceCents,
      currency: 'eur',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        bookingId: String(booking.id),
        guestUserId: String(booking.guestUser.id),
        mealId: String(booking.meal.id),
      },
    });

    if (!paymentIntent.client_secret) {
      throw new InternalServerErrorException(
        'Stripe n’a pas renvoyé de client secret pour ce paiement',
      );
    }

    const payment = existingPayment ?? this.paymentsRepository.create();
    payment.booking = booking;
    payment.provider = PaymentProvider.STRIPE;
    payment.providerIntentId = paymentIntent.id;
    payment.amountTotalCents = booking.totalPriceCents;
    payment.platformFeeCents = platformFeeCents;
    payment.hostAmountCents = hostAmountCents;
    payment.status = this.mapStripeIntentStatus(paymentIntent.status);
    payment.paidAt = null;
    payment.releasedAt = null;
    payment.refundedAt = null;

    const savedPayment = await this.paymentsRepository.save(payment);

    return this.toCreateIntentResponse(
      savedPayment,
      paymentIntent.client_secret,
    );
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
      return PaymentStatus.SUCCEEDED;
    }

    if (status === 'requires_capture') {
      return PaymentStatus.AUTHORIZED;
    }

    if (status === 'canceled') {
      return PaymentStatus.CANCELED;
    }

    return PaymentStatus.PENDING;
  }

  private toCreateIntentResponse(
    payment: Payment,
    clientSecret: string,
  ): CreatePaymentIntentResponse {
    return {
      paymentId: payment.id,
      bookingId: payment.booking.id,
      provider: payment.provider,
      providerIntentId: payment.providerIntentId,
      clientSecret,
      amountTotalCents: payment.amountTotalCents,
      platformFeeCents: payment.platformFeeCents,
      hostAmountCents: payment.hostAmountCents,
      status: payment.status,
    };
  }
}