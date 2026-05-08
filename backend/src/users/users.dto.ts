import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

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
  @IsString({ message: "La photo de profil est invalide" })
  profile_photo_url?: string;

  @IsOptional()
  remove_profile_photo?: string;
}

export class UpdateProfileDto {
  @IsNotEmpty({ message: 'Le prénom est obligatoire' })
  @Length(1, 80, { message: 'Le prénom ne peut pas dépasser 80 caractères' })
  first_name: string;

  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  @Length(1, 80, { message: 'Le nom ne peut pas dépasser 80 caractères' })
  last_name: string;

  @IsOptional()
  @Length(1, 30, { message: 'Le numéro de téléphone ne peut pas dépasser 30 caractères' })
  phone?: string;

  @IsOptional()
  @Length(1, 50, { message: 'Le pseudo ne peut pas dépasser 50 caractères' })
  pseudo?: string;

  @IsNotEmpty({ message: 'Le pays est obligatoire' })
  @Length(1, 50, { message: 'Le pays ne peut pas dépasser 50 caractères' })
  country: string;

  @IsNotEmpty({ message: 'La ville est obligatoire' })
  @Length(1, 120, { message: 'La ville ne peut pas dépasser 120 caractères' })
  city: string;

  @IsOptional()
  @Length(1, 500, { message: 'La bio ne peut pas dépasser 500 caractères' })
  bio?: string;

  @IsNotEmpty({ message: 'La date de naissance est obligatoire' })
  @IsDateString({}, { message: 'La date de naissance est invalide' })
  birth_date: string;

  @IsOptional()
  @IsString({ message: 'La photo de profil est invalide' })
  profile_photo_url?: string;

  @IsOptional()
  remove_profile_photo?: string;
}

export class UpdateUserPreferencesDto {
  @IsArray({ message: 'Les préférences alimentaires doivent être une liste.' })
  @IsString({ each: true, message: 'Chaque préférence alimentaire doit être un texte.' })
  @ArrayMaxSize(50, {
    message: 'Tu ne peux pas enregistrer plus de 50 tags alimentaires.',
  })
  dietary_tags!: string[];

  @IsArray({ message: "Les préférences d'ambiance doivent être une liste." })
  @IsString({ each: true, message: "Chaque préférence d'ambiance doit être un texte." })
  @ArrayMaxSize(50, {
    message: "Tu ne peux pas enregistrer plus de 50 tags d'ambiance.",
  })
  ambiance_tags!: string[];
}
