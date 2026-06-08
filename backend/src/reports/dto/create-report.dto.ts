import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ReportReason, ReportTargetType } from '../report.entity';

export class CreateReportDto {
  @IsEnum(ReportTargetType)
  targetType!: ReportTargetType;

  @IsInt()
  @Min(1)
  targetId!: number;

  @IsEnum(ReportReason)
  reason!: ReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
