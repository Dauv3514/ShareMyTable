import { IsEmail, IsNotEmpty, IsOptional, Length, IsEnum, IsDateString } from 'class-validator';
import { UserRole } from '../users/users.entity';

export class InscriptionDto {
  @IsOptional()
  @Length(0, 50, { message: "Le pseudo ne peut pas dépasser 50 caractères" })
  pseudo?: string;

  @IsNotEmpty({ message: "Le prénom est obligatoire" })
  @Length(1, 50, { message: "Le prénom doit contenir entre 1 et 50 caractères" })
  first_name: string;

  @IsNotEmpty({ message: "Le nom est obligatoire" })
  @Length(1, 50, { message: "Le nom doit contenir entre 1 et 50 caractères" })
  last_name: string;

  @IsOptional()
  @Length(0, 255, { message: "L'avatar ne peut pas dépasser 255 caractères" })
  profile_photo_url?: string;

  @IsNotEmpty({ message: "L'email est obligatoire" })
  @IsEmail({}, { message: "L'email est invalide" })
  email: string;

  @IsNotEmpty({ message: "Le mot de passe est obligatoire" })
  @Length(8, 255, { message: "Le mot de passe doit contenir au moins 8 caractères" })
  password_hash: string;

  @IsNotEmpty({ message: "Le pays est obligatoire" })
  @Length(1, 100, { message: "Le pays ne peut pas dépasser 100 caractères" })
  country: string;

  @IsNotEmpty({ message: "La ville est obligatoire" })
  @Length(1, 100, { message: "La ville ne peut pas dépasser 100 caractères" })
  city: string;

  @IsOptional()
  @Length(0, 500, { message: "La bio ne peut pas dépasser 500 caractères" })
  bio?: string;

  @IsNotEmpty({ message: "La date de naissance est obligatoire" })
  @IsDateString({}, { message: "La date de naissance est invalide" })
  birth_date: string;

  @IsOptional()
  @IsEnum(UserRole, { message: "Rôle utilisateur invalide" })
  roles?: UserRole;
}

export class ConnexionDto {
  @IsNotEmpty({ message: "L'email est obligatoire" })
  @IsEmail({}, { message: "L'email est invalide" })
  email: string;

  @IsNotEmpty({ message: "Le mot de passe est obligatoire" })
  password_hash: string;
}
