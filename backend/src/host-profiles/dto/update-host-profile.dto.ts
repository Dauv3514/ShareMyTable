import { Type } from 'class-transformer';
import {
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
  @IsUrl()
  homePhotoUrl?: string;

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
