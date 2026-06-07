import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Utilisateur } from '../users/users.entity';
import { PushNotificationsController } from './push-notifications.controller';
import { PushSubscriptionEntity } from './push-subscription.entity';
import { PushNotificationsService } from './push-notifications.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([PushSubscriptionEntity, Utilisateur]),
    AuthModule,
  ],
  controllers: [PushNotificationsController],
  providers: [PushNotificationsService],
  exports: [PushNotificationsService],
})
export class PushNotificationsModule {}
