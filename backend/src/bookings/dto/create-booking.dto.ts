import { Type } from 'class-transformer';
import { IsEnum, IsInt, Min } from 'class-validator';
import { BookingPaymentMethod } from '../booking.entity';

export class CreateBookingDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  mealId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  seats!: number;

  @IsEnum(BookingPaymentMethod)
  paymentMethod!: BookingPaymentMethod;
}
