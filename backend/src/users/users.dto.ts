import { IsNotEmpty, Length, IsDateString } from 'class-validator';

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
}
