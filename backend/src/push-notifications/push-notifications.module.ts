import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Booking } from '../bookings/booking.entity';
import { Meal } from '../meals/meal.entity';
import { Utilisateur } from '../users/users.entity';
import { MealReminderNotification } from './meal-reminder-notification.entity';
import { MealRemindersService } from './meal-reminders.service';
import { PushNotificationsController } from './push-notifications.controller';
import { PushNotificationPreference } from './push-notification-preference.entity';
import { PushSubscriptionEntity } from './push-subscription.entity';
import { PushNotificationsService } from './push-notifications.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Booking,
      Meal,
      MealReminderNotification,
      PushNotificationPreference,
      PushSubscriptionEntity,
      Utilisateur,
    ]),
    AuthModule,
  ],
  controllers: [PushNotificationsController],
  providers: [MealRemindersService, PushNotificationsService],
  exports: [PushNotificationsService],
})
export class PushNotificationsModule {}
