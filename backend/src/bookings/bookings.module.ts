import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { HostProfile } from '../host-profiles/host-profile.entity';
import { Meal } from '../meals/meal.entity';
import { MessagingModule } from '../messaging/messaging.module';
import { PaymentsModule } from '../payments/payments.module';
import { PushNotificationsModule } from '../push-notifications/push-notifications.module';
import { Utilisateur } from '../users/users.entity';
import { Booking } from './booking.entity';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Meal, Utilisateur, HostProfile]),
    AuthModule,
    MessagingModule,
    PaymentsModule,
    PushNotificationsModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
