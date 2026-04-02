import { IsNotEmpty, Length, IsDateString, IsOptional } from 'class-validator';

export class CompleteProfileDto {
  @IsNotEmpty({ message: "Le pays est obligatoire" })
  @Length(1, 100, { message: "Le pays ne peut pas dépasser 100 caractères" })
  country: string;

  @IsNotEmpty({ message: "La ville est obligatoire" })
  @Length(1, 100, { message: "La ville ne peut pas dépasser 100 caractères" })
  city: string;

  @IsNotEmpty({ message: "La date de naissance est obligatoire" })
  @IsDateString({}, { message: "La date de naissance est invalide" })
  birth_date: string;

  @IsOptional()
  @Length(1, 50, { message: "Le pseudo ne peut pas dépasser 50 caractères" })
  pseudo?: string;

  @IsOptional()
  @Length(1, 500, { message: "La bio ne peut pas dépasser 500 caractères" })
  bio?: string;

  @IsOptional()
  @Length(1, 255, { message: "La photo ne peut pas dépasser 255 caractères" })
  profile_photo_url?: string;
}
