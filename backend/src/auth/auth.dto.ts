import {
  IsBooleanString,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  Length,
} from 'class-validator';

export class InscriptionDto {
  @IsOptional()
  @Length(0, 50, { message: 'Le pseudo ne peut pas depasser 50 caracteres' })
  pseudo?: string;

  @IsNotEmpty({ message: 'Le prenom est obligatoire' })
  @Length(1, 50, {
    message: 'Le prenom doit contenir entre 1 et 50 caracteres',
  })
  first_name: string;

  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  @Length(1, 50, { message: 'Le nom doit contenir entre 1 et 50 caracteres' })
  last_name: string;

  @IsOptional()
  @Length(0, 255, { message: "L'avatar ne peut pas depasser 255 caracteres" })
  profile_photo_url?: string;

  @IsOptional()
  remove_profile_photo?: string;

  @IsNotEmpty({ message: "L'email est obligatoire" })
  @IsEmail({}, { message: "L'email est invalide" })
  email: string;

  @IsNotEmpty({ message: 'Le mot de passe est obligatoire' })
  @Length(8, 255, {
    message: 'Le mot de passe doit contenir au moins 8 caracteres',
  })
  password_hash: string;

  @IsNotEmpty({ message: 'Le pays est obligatoire' })
  @Length(1, 100, { message: 'Le pays ne peut pas depasser 100 caracteres' })
  country: string;

  @IsNotEmpty({ message: 'La ville est obligatoire' })
  @Length(1, 100, { message: 'La ville ne peut pas depasser 100 caracteres' })
  city: string;

  @IsOptional()
  @Length(0, 500, { message: 'La bio ne peut pas depasser 500 caracteres' })
  bio?: string;

  @IsNotEmpty({ message: 'La date de naissance est obligatoire' })
  @IsDateString({}, { message: 'La date de naissance est invalide' })
  birth_date: string;

  @IsOptional()
  @IsBooleanString({ message: 'La demande hôte est invalide' })
  request_host?: string;

  @IsOptional()
  @Length(0, 50, { message: 'Le quartier ne peut pas depasser 50 caracteres' })
  host_district_label?: string;

  @IsOptional()
  @Length(0, 255, { message: "L'adresse ne peut pas depasser 255 caracteres" })
  host_address?: string;

  @IsOptional()
  @IsUrl({}, { message: "L'URL de la photo du logement est invalide" })
  host_home_photo_url?: string;
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
  @Length(8, 255, {
    message: 'Le mot de passe doit contenir au moins 8 caracteres',
  })
  new_password: string;
}

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'Le mot de passe actuel est obligatoire' })
  current_password: string;

  @IsNotEmpty({ message: 'Le nouveau mot de passe est obligatoire' })
  @Length(8, 255, {
    message: 'Le mot de passe doit contenir au moins 8 caracteres',
  })
  new_password: string;
}

export class OAuthCompleteDto {
  @IsNotEmpty({ message: 'Token OAuth manquant' })
  pending_token: string;

  @IsOptional()
  @IsEmail({}, { message: "L'email est invalide" })
  email?: string;

  @IsOptional()
  @Length(1, 50, {
    message: 'Le prenom doit contenir entre 1 et 50 caracteres',
  })
  first_name?: string;

  @IsOptional()
  @Length(1, 50, { message: 'Le nom doit contenir entre 1 et 50 caracteres' })
  last_name?: string;

  @IsNotEmpty({ message: 'Le pays est obligatoire' })
  @Length(1, 100, { message: 'Le pays ne peut pas depasser 100 caracteres' })
  country: string;

  @IsNotEmpty({ message: 'La ville est obligatoire' })
  @Length(1, 100, { message: 'La ville ne peut pas depasser 100 caracteres' })
  city: string;

  @IsNotEmpty({ message: 'La date de naissance est obligatoire' })
  @IsDateString({}, { message: 'La date de naissance est invalide' })
  birth_date: string;

  @IsOptional()
  @Length(1, 50, { message: 'Le pseudo ne peut pas depasser 50 caracteres' })
  pseudo?: string;

  @IsOptional()
  @Length(1, 500, { message: 'La bio ne peut pas depasser 500 caracteres' })
  bio?: string;

  @IsOptional()
  @Length(1, 255, { message: 'La photo ne peut pas depasser 255 caracteres' })
  profile_photo_url?: string;

  @IsOptional()
  remove_profile_photo?: string;
}
