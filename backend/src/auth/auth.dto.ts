import { IsDateString, IsEmail, IsNotEmpty, IsOptional, Length } from 'class-validator';

export class InscriptionDto {
  @IsOptional()
  @Length(0, 50, { message: 'Le pseudo ne peut pas dÃ©passer 50 caractÃ¨res' })
  pseudo?: string;

  @IsNotEmpty({ message: 'Le prÃ©nom est obligatoire' })
  @Length(1, 50, { message: 'Le prÃ©nom doit contenir entre 1 et 50 caractÃ¨res' })
  first_name: string;

  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  @Length(1, 50, { message: 'Le nom doit contenir entre 1 et 50 caractÃ¨res' })
  last_name: string;

  @IsOptional()
  @Length(0, 255, { message: "L'avatar ne peut pas dÃ©passer 255 caractÃ¨res" })
  profile_photo_url?: string;

  @IsNotEmpty({ message: "L'email est obligatoire" })
  @IsEmail({}, { message: "L'email est invalide" })
  email: string;

  @IsNotEmpty({ message: 'Le mot de passe est obligatoire' })
  @Length(8, 255, { message: 'Le mot de passe doit contenir au moins 8 caractÃ¨res' })
  password_hash: string;

  @IsNotEmpty({ message: 'Le pays est obligatoire' })
  @Length(1, 100, { message: 'Le pays ne peut pas dÃ©passer 100 caractÃ¨res' })
  country: string;

  @IsNotEmpty({ message: 'La ville est obligatoire' })
  @Length(1, 100, { message: 'La ville ne peut pas dÃ©passer 100 caractÃ¨res' })
  city: string;

  @IsOptional()
  @Length(0, 500, { message: 'La bio ne peut pas dÃ©passer 500 caractÃ¨res' })
  bio?: string;

  @IsNotEmpty({ message: 'La date de naissance est obligatoire' })
  @IsDateString({}, { message: 'La date de naissance est invalide' })
  birth_date: string;
}

export class ConnexionDto {
  @IsNotEmpty({ message: "L'email est obligatoire" })
  @IsEmail({}, { message: "L'email est invalide" })
  email: string;

  @IsNotEmpty({ message: 'Le mot de passe est obligatoire' })
  password_hash: string;
}

export class ForgotPasswordDto {
  @IsNotEmpty({ message: "L'email est obligatoire" })
  @IsEmail({}, { message: "L'email est invalide" })
  email: string;
}

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'Token manquant' })
  token: string;

  @IsNotEmpty({ message: 'Le nouveau mot de passe est obligatoire' })
  @Length(8, 255, { message: 'Le mot de passe doit contenir au moins 8 caractÃ¨res' })
  new_password: string;
}

export class OAuthCompleteDto {
  @IsNotEmpty({ message: 'Token OAuth manquant' })
  pending_token: string;

  @IsOptional()
  @IsEmail({}, { message: "L'email est invalide" })
  email?: string;

  @IsOptional()
  @Length(1, 50, { message: "Le prénom doit contenir entre 1 et 50 caractères" })
  first_name?: string;

  @IsOptional()
  @Length(1, 50, { message: "Le nom doit contenir entre 1 et 50 caractères" })
  last_name?: string;

  @IsNotEmpty({ message: "Le pays est obligatoire" })
  @Length(1, 100, { message: "Le pays ne peut pas dépasser 100 caractères" })
  country: string;

  @IsNotEmpty({ message: "La ville est obligatoire" })
  @Length(1, 100, { message: "La ville ne peut pas dépasser 100 caractères" })
  city: string;

  @IsNotEmpty({ message: "La date de naissance est obligatoire" })
  @IsDateString({}, { message: "La date de naissance est invalide" })
  birth_date: string;
}
