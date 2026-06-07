import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePushNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  messages?: boolean;

  @IsOptional()
  @IsBoolean()
  reservations?: boolean;

  @IsOptional()
  @IsBoolean()
  mealReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  hostStatus?: boolean;
}
