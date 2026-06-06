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

// Données modifiables par le user tant que son profil n'est pas approuvé.
export class UpdateHostProfileDto {
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

  @IsOptional()
  @IsString()
  @MaxLength(50)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  districtLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;
}
