import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MealMenuItemCategory } from '../meal-menu-item.entity';

export class MealMenuItemDto {
  @IsEnum(MealMenuItemCategory)
  category!: MealMenuItemCategory;

  @IsString()
  @MaxLength(120)
  label!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  position!: number;
}

export class CreateMealDto {
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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MealMenuItemDto)
  menuItems?: MealMenuItemDto[];

  @IsOptional()
  @IsDateString()
  dateTime?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  seatsTotal!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  pricePerSeatCents!: number;

  @IsOptional()
  @IsString()
  houseRules?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedTagCodes?: string[];
}
