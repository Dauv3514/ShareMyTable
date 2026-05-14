import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { HostProfile } from '../host-profiles/host-profile.entity';
import { Meal } from '../meals/meal.entity';
import { PaymentsModule } from '../payments/payments.module';
import { Utilisateur } from '../users/users.entity';
import { Booking } from './booking.entity';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Meal, Utilisateur, HostProfile]),
    AuthModule,
    PaymentsModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}