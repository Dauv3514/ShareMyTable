import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, BookingStatus } from '../bookings/booking.entity';
import { Meal, MealStatus } from '../meals/meal.entity';
import { Utilisateur } from '../users/users.entity';
import {
  MealReminderNotification,
  MealReminderType,
} from './meal-reminder-notification.entity';
import {
  PushNotificationCategory,
  PushNotificationsService,
} from './push-notifications.service';

type ReminderRecipient = {
  userId: number;
  bookingId: number | null;
  role: 'host' | 'guest';
};

@Injectable()
export class MealRemindersService {
  private readonly logger = new Logger(MealRemindersService.name);
  private readonly reminderWindowMs = 10 * 60 * 1000;
  private isRunning = false;

  constructor(
    @InjectRepository(Meal)
    private readonly mealsRepository: Repository<Meal>,
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(MealReminderNotification)
    private readonly reminderNotificationsRepository: Repository<MealReminderNotification>,
    private readonly pushNotificationsService: PushNotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async sendScheduledMealReminders(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      await this.sendReminderType(
        MealReminderType.DAY_BEFORE,
        24 * 60 * 60 * 1000,
      );
      await this.sendReminderType(
        MealReminderType.TWO_HOURS_BEFORE,
        2 * 60 * 60 * 1000,
      );
    } finally {
      this.isRunning = false;
    }
  }

  private async sendReminderType(
    reminderType: MealReminderType,
    offsetMs: number,
  ): Promise<void> {
    const now = Date.now();
    const lowerBound = new Date(now + offsetMs - this.reminderWindowMs);
    const upperBound = new Date(now + offsetMs + this.reminderWindowMs);

    const meals = await this.mealsRepository
      .createQueryBuilder('meal')
      .innerJoinAndSelect('meal.host', 'host')
      .where('meal.status = :status', { status: MealStatus.PUBLISHED })
      .andWhere('meal.dateTime BETWEEN :lowerBound AND :upperBound', {
        lowerBound,
        upperBound,
      })
      .orderBy('meal.dateTime', 'ASC')
      .getMany();

    if (meals.length === 0) {
      return;
    }

    for (const meal of meals) {
      try {
        await this.sendMealReminder(meal, reminderType);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Erreur inconnue';
        this.logger.error(
          `Échec du rappel ${reminderType} pour le repas #${meal.id}: ${message}`,
        );
      }
    }
  }

  private async sendMealReminder(
    meal: Meal,
    reminderType: MealReminderType,
  ): Promise<void> {
    const recipients = await this.findReminderRecipients(meal);

    if (recipients.length === 0) {
      return;
    }

    let sentCount = 0;

    for (const recipient of recipients) {
      const shouldSend = await this.markReminderAsSent(
        meal,
        recipient.userId,
        reminderType,
      );

      if (!shouldSend) {
        continue;
      }

      await this.pushNotificationsService.notifyUsers(
        [recipient.userId],
        this.buildReminderPayload(meal, reminderType, recipient),
        PushNotificationCategory.MEAL_REMINDERS,
      );
      sentCount += 1;
    }

    if (sentCount > 0) {
      this.logger.log(
        `${sentCount} rappel(s) ${reminderType} envoyé(s) pour le repas #${meal.id}`,
      );
    }
  }

  private async findReminderRecipients(meal: Meal): Promise<ReminderRecipient[]> {
    const recipientsByUserId = new Map<number, ReminderRecipient>();

    recipientsByUserId.set(meal.host.id, {
      userId: meal.host.id,
      bookingId: null,
      role: 'host',
    });

    const confirmedBookings = await this.bookingsRepository.find({
      where: {
        meal: { id: meal.id },
        bookingStatus: BookingStatus.CONFIRMED,
      },
      relations: ['guestUser'],
      order: { createdAt: 'DESC' },
    });

    for (const booking of confirmedBookings) {
      if (recipientsByUserId.has(booking.guestUser.id)) {
        continue;
      }

      recipientsByUserId.set(booking.guestUser.id, {
        userId: booking.guestUser.id,
        bookingId: booking.id,
        role: 'guest',
      });
    }

    return [...recipientsByUserId.values()];
  }

  private async markReminderAsSent(
    meal: Meal,
    userId: number,
    reminderType: MealReminderType,
  ): Promise<boolean> {
    const existingReminder =
      await this.reminderNotificationsRepository.findOne({
        where: {
          meal: { id: meal.id },
          user: { id: userId },
          type: reminderType,
        },
      });

    if (existingReminder) {
      return false;
    }

    try {
      await this.reminderNotificationsRepository.save(
        this.reminderNotificationsRepository.create({
          meal,
          user: { id: userId } as Utilisateur,
          type: reminderType,
          targetDateTime: meal.dateTime,
        }),
      );
      return true;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        return false;
      }

      throw error;
    }
  }

  private buildReminderPayload(
    meal: Meal,
    reminderType: MealReminderType,
    recipient: ReminderRecipient,
  ) {
    const mealTitle = meal.title ?? 'Ton repas';
    const timeLabel = this.formatMealTime(meal.dateTime);
    const isHost = recipient.role === 'host';
    const url = isHost ? '/mes-evenements' : `/reservations/${recipient.bookingId}`;

    if (reminderType === MealReminderType.DAY_BEFORE) {
      return {
        title: 'Rappel repas J-1',
        body: isHost
          ? `${mealTitle} a lieu demain à ${timeLabel}.`
          : `Ton repas ${mealTitle} a lieu demain à ${timeLabel}.`,
        url,
        tag: `meal-reminder-${reminderType}-${meal.id}`,
        data: {
          type: 'meal_reminder',
          reminderType,
          mealId: meal.id,
          bookingId: recipient.bookingId,
        },
      };
    }

    return {
      title: 'Ton repas commence bientôt',
      body: isHost
        ? `${mealTitle} commence dans environ 2 h.`
        : `Ton repas ${mealTitle} commence dans environ 2 h.`,
      url,
      tag: `meal-reminder-${reminderType}-${meal.id}`,
      data: {
        type: 'meal_reminder',
        reminderType,
        mealId: meal.id,
        bookingId: recipient.bookingId,
      },
    };
  }

  private formatMealTime(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    );
  }
}
