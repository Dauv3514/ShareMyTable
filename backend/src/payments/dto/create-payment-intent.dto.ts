import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreatePaymentIntentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bookingId!: number;
}