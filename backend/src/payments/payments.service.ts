import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import Stripe from 'stripe';
import { Repository } from 'typeorm';
import {
  Booking,
  BookingPaymentState,
  BookingStatus,
} from '../bookings/booking.entity';
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

type HandleWebhookResponse = {
  received: true;
  type: string;
};

type CapturePaymentResponse = {
  paymentId: number;
  bookingId: number;
  provider: PaymentProvider;
  providerIntentId: string;
  amountTotalCents: number;
  platformFeeCents: number;
  hostAmountCents: number;
  status: PaymentStatus;
  paidAt: Date | null;
};

export type CancelOrRefundPaymentResult = {
  paymentState: BookingPaymentState;
  releasedAmountCents: number;
  refundedAmountCents: number;
  retainedAmountCents: number;
};

type StripeIntentLike = {
  id: string;
  status: string;
};

type StripeChargeLike = {
  payment_intent?: string | { id: string } | null;
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

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
        booking.id,
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
      capture_method: 'manual',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        bookingId: String(booking.id),
        guestUserId: String(booking.guestUser.id),
        mealId: String(booking.meal.id),
      },
    }, {
      idempotencyKey: `booking-${booking.id}-payment-intent`,
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

    let savedPayment: Payment;

    try {
      savedPayment = await this.paymentsRepository.save(payment);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        const concurrentPayment = await this.findPaymentByBookingId(booking.id);

        if (concurrentPayment?.providerIntentId) {
          const concurrentIntent = await stripe.paymentIntents.retrieve(
            concurrentPayment.providerIntentId,
          );

          if (!concurrentIntent.client_secret) {
            throw new InternalServerErrorException(
              'Stripe n’a pas renvoyé de client secret pour le paiement existant',
            );
          }

          return this.toCreateIntentResponse(
            concurrentPayment,
            concurrentIntent.client_secret,
            booking.id,
          );
        }
      }

      throw error;
    }

    return this.toCreateIntentResponse(
      savedPayment,
      paymentIntent.client_secret,
      booking.id,
    );
  }

  async handleWebhook(
    signature: string | undefined,
    rawBody: Buffer | undefined,
  ): Promise<HandleWebhookResponse> {
    if (!signature?.trim()) {
      throw new BadRequestException(
        'L’en-tête stripe-signature est manquante',
      );
    }

    if (!rawBody) {
      throw new BadRequestException(
        'Le corps brut de la requête webhook est manquant',
      );
    }

    const stripe = this.getStripeClient();
    const webhookSecret = this.getStripeWebhookSecret();

    let event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Signature Stripe invalide');
    }

    switch (event.type) {
      case 'payment_intent.amount_capturable_updated':
        await this.markPaymentIntentAuthorized(
          event.data.object as StripeIntentLike,
        );
        break;
      case 'payment_intent.succeeded':
        await this.markPaymentIntentSucceeded(
          event.data.object as StripeIntentLike,
        );
        break;
      case 'payment_intent.payment_failed':
        await this.markPaymentIntentFailed(
          event.data.object as StripeIntentLike,
        );
        break;
      case 'payment_intent.canceled':
        await this.markPaymentIntentCanceled(
          event.data.object as StripeIntentLike,
        );
        break;
      case 'charge.refunded':
        await this.markChargeRefunded(event.data.object as StripeChargeLike);
        break;
      default:
        break;
    }

    return {
      received: true,
      type: event.type,
    };
  }

  async cancelPaymentForBooking(bookingId: number): Promise<void> {
    await this.cancelOrRefundPaymentForBooking(bookingId, Number.MAX_SAFE_INTEGER);
  }

  async capturePayment(
    hostUserId: number,
    paymentId: number,
  ): Promise<CapturePaymentResponse> {
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
      relations: ['booking', 'booking.meal', 'booking.meal.host'],
    });

    if (!payment) {
      throw new NotFoundException('Paiement introuvable');
    }

    const booking = payment.booking;

    if (booking.meal.host.id !== hostUserId) {
      throw new NotFoundException('Paiement introuvable pour cet hôte');
    }

    if (booking.meal.dateTime.getTime() > Date.now()) {
      throw new BadRequestException(
        'Le paiement ne peut etre capturé qu apres la date du repas',
      );
    }

    if (booking.bookingStatus !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        'Seule une reservation confirmee peut etre capturee',
      );
    }

    if (payment.status === PaymentStatus.SUCCEEDED) {
      return this.toCapturePaymentResponse(payment);
    }

    if (payment.status !== PaymentStatus.AUTHORIZED) {
      throw new BadRequestException(
        'Seul un paiement autorise peut etre capture',
      );
    }

    const savedPayment = await this.captureAuthorizedPayment(payment);

    return this.toCapturePaymentResponse(savedPayment);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async captureEligiblePaymentsAfterMeals(): Promise<void> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const eligiblePayments = await this.paymentsRepository
      .createQueryBuilder('payment')
      .innerJoinAndSelect('payment.booking', 'booking')
      .innerJoinAndSelect('booking.meal', 'meal')
      .where('payment.status = :paymentStatus', {
        paymentStatus: PaymentStatus.AUTHORIZED,
      })
      .andWhere('booking.bookingStatus = :bookingStatus', {
        bookingStatus: BookingStatus.CONFIRMED,
      })
      .andWhere('meal.dateTime <= :twentyFourHoursAgo', {
        twentyFourHoursAgo,
      })
      .getMany();

    if (eligiblePayments.length === 0) {
      return;
    }

    this.logger.log(
      `${eligiblePayments.length} paiement(s) eligible(s) a capturer automatiquement`,
    );

    for (const payment of eligiblePayments) {
      try {
        await this.captureAuthorizedPayment(payment);
        this.logger.log(
          `Paiement #${payment.id} capture automatiquement pour la reservation #${payment.booking.id}`,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Erreur inconnue';
        this.logger.error(
          `Echec de capture automatique du paiement #${payment.id}: ${message}`,
        );
      }
    }
  }

  async cancelOrRefundPaymentForBooking(
    bookingId: number,
    requestedRefundAmountCents: number,
  ): Promise<CancelOrRefundPaymentResult> {
    const payment = await this.findPaymentByBookingId(bookingId);

    if (!payment) {
      return {
        paymentState: BookingPaymentState.REFUNDED,
        releasedAmountCents: 0,
        refundedAmountCents: 0,
        retainedAmountCents: 0,
      };
    }

    const safeRefundAmountCents = Math.min(
      payment.amountTotalCents,
      Math.max(0, requestedRefundAmountCents),
    );

    if (
      [PaymentStatus.PENDING, PaymentStatus.AUTHORIZED].includes(payment.status)
    ) {
      const stripe = this.getStripeClient();

      await stripe.paymentIntents.cancel(payment.providerIntentId, {
        cancellation_reason: 'requested_by_customer',
      });

      payment.status = PaymentStatus.CANCELED;
      payment.refundedAt = new Date();
      await this.paymentsRepository.save(payment);

      return {
        paymentState: BookingPaymentState.REFUNDED,
        releasedAmountCents: payment.amountTotalCents,
        refundedAmountCents: payment.amountTotalCents,
        retainedAmountCents: 0,
      };
    }

    if (payment.status === PaymentStatus.SUCCEEDED) {
      if (safeRefundAmountCents > 0) {
        const stripe = this.getStripeClient();

        await stripe.refunds.create({
          payment_intent: payment.providerIntentId,
          amount: safeRefundAmountCents,
        });

        payment.status =
          safeRefundAmountCents >= payment.amountTotalCents
            ? PaymentStatus.REFUNDED
            : PaymentStatus.SUCCEEDED;
        payment.refundedAt = new Date();
        await this.paymentsRepository.save(payment);
      }

      return {
        paymentState:
          safeRefundAmountCents > 0
            ? BookingPaymentState.REFUNDED
            : BookingPaymentState.AUTHORIZED,
        releasedAmountCents: 0,
        refundedAmountCents: safeRefundAmountCents,
        retainedAmountCents: payment.amountTotalCents - safeRefundAmountCents,
      };
    }

    if (payment.status === PaymentStatus.REFUNDED) {
      return {
        paymentState: BookingPaymentState.REFUNDED,
        releasedAmountCents: 0,
        refundedAmountCents: payment.amountTotalCents,
        retainedAmountCents: 0,
      };
    }

    return {
      paymentState: BookingPaymentState.REFUNDED,
      releasedAmountCents: 0,
      refundedAmountCents: 0,
      retainedAmountCents: 0,
    };
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

  private getStripeWebhookSecret() {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (!webhookSecret?.trim()) {
      throw new InternalServerErrorException(
        'STRIPE_WEBHOOK_SECRET est manquante dans la configuration du backend',
      );
    }

    return webhookSecret;
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

  private async captureAuthorizedPayment(payment: Payment) {
    const stripe = this.getStripeClient();
    const capturedIntent = await stripe.paymentIntents.capture(
      payment.providerIntentId,
    );

    payment.status = this.mapStripeIntentStatus(capturedIntent.status);

    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new InternalServerErrorException(
        'Stripe n a pas confirme la capture du paiement',
      );
    }

    payment.paidAt = new Date();
    payment.booking.completedAt = new Date();
    payment.booking.bookingStatus = BookingStatus.COMPLETED;
    payment.booking.paymentState = BookingPaymentState.AUTHORIZED;

    await this.bookingsRepository.save(payment.booking);
    return this.paymentsRepository.save(payment);
  }

  private async markPaymentIntentAuthorized(paymentIntent: StripeIntentLike) {
    const payment = await this.findPaymentByIntentId(paymentIntent.id);

    if (!payment) {
      return;
    }

    payment.status = PaymentStatus.AUTHORIZED;
    payment.booking.paymentState = BookingPaymentState.AUTHORIZED;

    await this.paymentsRepository.save(payment);
    await this.bookingsRepository.save(payment.booking);
  }

  private async markPaymentIntentSucceeded(paymentIntent: StripeIntentLike) {
    const payment = await this.findPaymentByIntentId(paymentIntent.id);

    if (!payment) {
      return;
    }

    payment.status = PaymentStatus.SUCCEEDED;
    payment.paidAt = new Date();

    payment.booking.paymentState = BookingPaymentState.AUTHORIZED;

    await this.paymentsRepository.save(payment);
    await this.bookingsRepository.save(payment.booking);
  }

  private async markPaymentIntentFailed(paymentIntent: StripeIntentLike) {
    const payment = await this.findPaymentByIntentId(paymentIntent.id);

    if (!payment) {
      return;
    }

    payment.status = PaymentStatus.FAILED;
    await this.paymentsRepository.save(payment);
  }

  private async markPaymentIntentCanceled(paymentIntent: StripeIntentLike) {
    const payment = await this.findPaymentByIntentId(paymentIntent.id);

    if (!payment) {
      return;
    }

    payment.status = PaymentStatus.CANCELED;
    await this.paymentsRepository.save(payment);
  }

  private async markChargeRefunded(charge: StripeChargeLike) {
    const intentId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id;

    if (!intentId) {
      return;
    }

    const payment = await this.findPaymentByIntentId(intentId);

    if (!payment) {
      return;
    }

    payment.status = PaymentStatus.REFUNDED;
    payment.refundedAt = new Date();

    payment.booking.paymentState = BookingPaymentState.REFUNDED;

    await this.paymentsRepository.save(payment);
    await this.bookingsRepository.save(payment.booking);
  }

  private async findPaymentByIntentId(providerIntentId: string) {
    return this.paymentsRepository.findOne({
      where: { providerIntentId },
      relations: ['booking'],
    });
  }

  private async findPaymentByBookingId(bookingId: number) {
    return this.paymentsRepository.findOne({
      where: { booking: { id: bookingId } },
      relations: ['booking'],
    });
  }

  private isUniqueConstraintError(error: unknown) {
    const driverError = (error as { driverError?: { code?: string; errno?: number } })
      ?.driverError;

    return (
      driverError?.code === 'ER_DUP_ENTRY' ||
      driverError?.errno === 1062 ||
      driverError?.code === '23505' ||
      driverError?.code === 'SQLITE_CONSTRAINT'
    );
  }

  private toCreateIntentResponse(
    payment: Payment,
    clientSecret: string,
    fallbackBookingId?: number,
  ): CreatePaymentIntentResponse {
    return {
      paymentId: payment.id,
      bookingId: payment.booking?.id ?? fallbackBookingId ?? 0,
      provider: payment.provider,
      providerIntentId: payment.providerIntentId,
      clientSecret,
      amountTotalCents: payment.amountTotalCents,
      platformFeeCents: payment.platformFeeCents,
      hostAmountCents: payment.hostAmountCents,
      status: payment.status,
    };
  }

  private toCapturePaymentResponse(payment: Payment): CapturePaymentResponse {
    return {
      paymentId: payment.id,
      bookingId: payment.booking.id,
      provider: payment.provider,
      providerIntentId: payment.providerIntentId,
      amountTotalCents: payment.amountTotalCents,
      platformFeeCents: payment.platformFeeCents,
      hostAmountCents: payment.hostAmountCents,
      status: payment.status,
      paidAt: payment.paidAt,
    };
  }
}