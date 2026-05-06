import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectHostProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectionReason?: string;
}
