import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as webPush from 'web-push';
import { Utilisateur } from '../users/users.entity';
import { SavePushSubscriptionDto } from './dto/save-push-subscription.dto';
import { UpdatePushNotificationPreferencesDto } from './dto/update-push-notification-preferences.dto';
import { PushNotificationPreference } from './push-notification-preference.entity';
import { PushSubscriptionEntity } from './push-subscription.entity';

export type PushNotificationPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
};

export enum PushNotificationCategory {
  MESSAGES = 'messages',
  RESERVATIONS = 'reservations',
  MEAL_REMINDERS = 'mealReminders',
  HOST_STATUS = 'hostStatus',
}

export type PushNotificationPreferencesResponse = {
  messages: boolean;
  reservations: boolean;
  mealReminders: boolean;
  hostStatus: boolean;
};

@Injectable()
export class PushNotificationsService {
  private readonly logger = new Logger(PushNotificationsService.name);
  private readonly publicKey: string | null;
  private readonly privateKey: string | null;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(PushNotificationPreference)
    private readonly preferencesRepository: Repository<PushNotificationPreference>,
    @InjectRepository(PushSubscriptionEntity)
    private readonly subscriptionsRepository: Repository<PushSubscriptionEntity>,
    @InjectRepository(Utilisateur)
    private readonly usersRepository: Repository<Utilisateur>,
  ) {
    this.publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY') ?? null;
    this.privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY') ?? null;

    if (this.isConfigured()) {
      webPush.setVapidDetails(
        this.configService.get<string>('VAPID_SUBJECT') ??
          'mailto:contact@ramenetapoire.fr',
        this.publicKey!,
        this.privateKey!,
      );
    } else {
      this.logger.warn(
        'Notifications push désactivées: VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY sont manquantes.',
      );
    }
  }

  getPublicKey() {
    return {
      configured: this.isConfigured(),
      publicKey: this.publicKey,
    };
  }

  async saveSubscription(
    userId: number,
    dto: SavePushSubscriptionDto,
    userAgent?: string,
  ) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const existingSubscription = await this.subscriptionsRepository.findOne({
      where: { endpoint: dto.endpoint },
      relations: ['user'],
    });

    const subscription =
      existingSubscription ??
      this.subscriptionsRepository.create({
        endpoint: dto.endpoint,
      });

    subscription.user = user;
    subscription.p256dhKey = dto.keys.p256dh;
    subscription.authKey = dto.keys.auth;
    subscription.expirationTime =
      typeof dto.expirationTime === 'number'
        ? new Date(dto.expirationTime)
        : null;
    subscription.userAgent = userAgent?.slice(0, 600) ?? null;

    const savedSubscription =
      await this.subscriptionsRepository.save(subscription);

    return {
      id: savedSubscription.id,
      endpoint: savedSubscription.endpoint,
      createdAt: savedSubscription.createdAt,
      updatedAt: savedSubscription.updatedAt,
    };
  }

  async deleteSubscription(userId: number, endpoint: string) {
    await this.subscriptionsRepository
      .createQueryBuilder()
      .delete()
      .where('endpoint = :endpoint', { endpoint })
      .andWhere('user_id = :userId', { userId })
      .execute();

    return { success: true };
  }

  async getPreferences(
    userId: number,
  ): Promise<PushNotificationPreferencesResponse> {
    const preferences = await this.getOrCreatePreferences(userId);

    return this.toPreferencesResponse(preferences);
  }

  async updatePreferences(
    userId: number,
    dto: UpdatePushNotificationPreferencesDto,
  ): Promise<PushNotificationPreferencesResponse> {
    const preferences = await this.getOrCreatePreferences(userId);

    if (typeof dto.messages === 'boolean') {
      preferences.messagesEnabled = dto.messages;
    }

    if (typeof dto.reservations === 'boolean') {
      preferences.reservationsEnabled = dto.reservations;
    }

    if (typeof dto.mealReminders === 'boolean') {
      preferences.mealRemindersEnabled = dto.mealReminders;
    }

    if (typeof dto.hostStatus === 'boolean') {
      preferences.hostStatusEnabled = dto.hostStatus;
    }

    const savedPreferences =
      await this.preferencesRepository.save(preferences);

    return this.toPreferencesResponse(savedPreferences);
  }

  async notifyUsers(
    userIds: number[],
    payload: PushNotificationPayload,
    category?: PushNotificationCategory,
  ) {
    const uniqueUserIds = Array.from(
      new Set(
        userIds
          .map((userId) => Number(userId))
          .filter((userId) => Number.isInteger(userId) && userId > 0),
      ),
    );

    if (!this.isConfigured() || uniqueUserIds.length === 0) {
      return;
    }

    const eligibleUserIds = await this.findEnabledUserIdsForCategory(
      uniqueUserIds,
      category,
    );

    if (eligibleUserIds.length === 0) {
      return;
    }

    const subscriptions = await this.subscriptionsRepository.find({
      where: { user: { id: In(eligibleUserIds) } },
    });

    await Promise.all(
      subscriptions.map((subscription) =>
        this.sendToSubscription(subscription, payload),
      ),
    );
  }

  private async getOrCreatePreferences(
    userId: number,
  ): Promise<PushNotificationPreference> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const existingPreferences = await this.preferencesRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (existingPreferences) {
      return existingPreferences;
    }

    return this.preferencesRepository.save(
      this.preferencesRepository.create({
        user,
        messagesEnabled: true,
        reservationsEnabled: true,
        mealRemindersEnabled: true,
        hostStatusEnabled: true,
      }),
    );
  }

  private toPreferencesResponse(
    preferences: PushNotificationPreference,
  ): PushNotificationPreferencesResponse {
    return {
      messages: preferences.messagesEnabled,
      reservations: preferences.reservationsEnabled,
      mealReminders: preferences.mealRemindersEnabled,
      hostStatus: preferences.hostStatusEnabled,
    };
  }

  private async findEnabledUserIdsForCategory(
    userIds: number[],
    category?: PushNotificationCategory,
  ): Promise<number[]> {
    if (!category) {
      return userIds;
    }

    const preferences = await this.preferencesRepository.find({
      where: { user: { id: In(userIds) } },
      relations: ['user'],
    });
    const disabledUserIds = new Set<number>();

    for (const preference of preferences) {
      if (!this.isCategoryEnabled(preference, category)) {
        disabledUserIds.add(preference.user.id);
      }
    }

    return userIds.filter((userId) => !disabledUserIds.has(userId));
  }

  private isCategoryEnabled(
    preferences: PushNotificationPreference,
    category: PushNotificationCategory,
  ): boolean {
    switch (category) {
      case PushNotificationCategory.MESSAGES:
        return preferences.messagesEnabled;
      case PushNotificationCategory.RESERVATIONS:
        return preferences.reservationsEnabled;
      case PushNotificationCategory.MEAL_REMINDERS:
        return preferences.mealRemindersEnabled;
      case PushNotificationCategory.HOST_STATUS:
        return preferences.hostStatusEnabled;
      default:
        return true;
    }
  }

  private async sendToSubscription(
    subscription: PushSubscriptionEntity,
    payload: PushNotificationPayload,
  ) {
    try {
      await webPush.sendNotification(
        {
          endpoint: subscription.endpoint,
          expirationTime: subscription.expirationTime
            ? subscription.expirationTime.getTime()
            : null,
          keys: {
            p256dh: subscription.p256dhKey,
            auth: subscription.authKey,
          },
        },
        JSON.stringify(payload),
      );
    } catch (error) {
      const statusCode =
        typeof error === 'object' && error && 'statusCode' in error
          ? Number((error as { statusCode?: number }).statusCode)
          : null;

      if (statusCode === 404 || statusCode === 410) {
        await this.subscriptionsRepository.delete({ id: subscription.id });
        return;
      }

      const message = error instanceof Error ? error.message : 'erreur inconnue';
      this.logger.warn(
        `Notification push non envoyée pour subscription ${subscription.id}: ${message}`,
      );
    }
  }

  private isConfigured() {
    return Boolean(this.publicKey && this.privateKey);
  }
}
