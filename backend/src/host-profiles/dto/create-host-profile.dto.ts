import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

// Données demandées lors de la première candidature hote.
export class CreateHostProfileDto {
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsUrl()
  homePhotoUrl?: string | null;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @ArrayMaxSize(5)
  @IsUrl({}, { each: true })
  homePhotoUrls?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;

  @IsString()
  @MaxLength(50)
  country: string;

  @IsString()
  @MaxLength(50)
  city: string;

  @IsString()
  @MaxLength(50)
  districtLabel: string;

  @IsString()
  @MaxLength(255)
  address: string;
}
