import {
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateHostProfileDto {
  @IsOptional()
  @IsUrl()
  homePhotoUrl?: string;

  @IsOptional()
  @IsLatitude()
  lat?: number;

  @IsOptional()
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
