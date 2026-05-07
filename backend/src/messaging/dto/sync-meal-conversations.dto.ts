import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  Min,
} from 'class-validator';

export class SyncMealConversationsDto {
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Type(() => Number)
  participantUserIds: number[];
}

export class OpenReservationDirectConversationDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  guestUserId: number;
}
