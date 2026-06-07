import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as webPush from 'web-push';
import { Utilisateur } from '../users/users.entity';
import { SavePushSubscriptionDto } from './dto/save-push-subscription.dto';
import { PushSubscriptionEntity } from './push-subscription.entity';

export type PushNotificationPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
};

@Injectable()
export class PushNotificationsService {
  private readonly logger = new Logger(PushNotificationsService.name);
  private readonly publicKey: string | null;
  private readonly privateKey: string | null;

  constructor(
    private readonly configService: ConfigService,
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

  async notifyUsers(userIds: number[], payload: PushNotificationPayload) {
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

    const subscriptions = await this.subscriptionsRepository.find({
      where: { user: { id: In(uniqueUserIds) } },
    });

    await Promise.all(
      subscriptions.map((subscription) =>
        this.sendToSubscription(subscription, payload),
      ),
    );
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
