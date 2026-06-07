import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Utilisateur } from '../users/users.entity';
import { PushNotificationsController } from './push-notifications.controller';
import { PushNotificationPreference } from './push-notification-preference.entity';
import { PushSubscriptionEntity } from './push-subscription.entity';
import { PushNotificationsService } from './push-notifications.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      PushNotificationPreference,
      PushSubscriptionEntity,
      Utilisateur,
    ]),
    AuthModule,
  ],
  controllers: [PushNotificationsController],
  providers: [PushNotificationsService],
  exports: [PushNotificationsService],
})
export class PushNotificationsModule {}
