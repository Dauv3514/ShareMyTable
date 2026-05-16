import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Booking } from '../bookings/booking.entity';
import { PaymentsController } from './payments.controller';
import { Payment } from './payment.entity';
import { PaymentsService } from './payments.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Payment, Booking]), AuthModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}