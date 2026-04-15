import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateMealDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  mealType?: string;

  @IsOptional()
  @IsString()
  menuDescription?: string;

  @IsOptional()
  @IsDateString()
  dateTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seatsTotal?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  pricePerSeatCents?: number;

  @IsOptional()
  @IsString()
  houseRules?: string;
}
