import { IsEmail, IsString, MaxLength } from 'class-validator';

export class CreateNewsletterSubscriptionDto {
  @IsString()
  @IsEmail()
  @MaxLength(255)
  email!: string;
}
