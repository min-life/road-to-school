import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCalendarEntryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'null/bỏ trống: nghỉ nhà xe, chỉ SYSTEM_ADMIN',
  })
  @IsOptional()
  @IsUUID('4')
  schoolId?: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(200) title: string;
  @ApiProperty({ enum: ['HOLIDAY', 'MAKEUP'] })
  @IsIn(['HOLIDAY', 'MAKEUP'])
  kind: string;
  @ApiProperty({ enum: ['SOLAR', 'LUNAR'] })
  @IsIn(['SOLAR', 'LUNAR'])
  calendar: string;
  @ApiProperty({ enum: ['ONCE', 'ANNUAL'] })
  @IsIn(['ONCE', 'ANNUAL'])
  recurrence: string;
  @ApiPropertyOptional({ description: 'Bắt buộc ONCE; không gửi với ANNUAL' })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2199)
  year?: number;
  @ApiProperty() @IsInt() @Min(1) @Max(12) month: number;
  @ApiProperty() @IsInt() @Min(1) @Max(31) day: number;
  @ApiPropertyOptional({
    default: false,
    description: 'Chỉ lịch âm; false là tháng thường',
  })
  @IsOptional()
  @IsBoolean()
  leapMonth?: boolean;
  @ApiPropertyOptional({
    description: 'MAKEUP bắt buộc HH:mm, giờ cần đến trường',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime?: string;
  @ApiPropertyOptional({ description: 'MAKEUP bắt buộc HH:mm, giờ rời trường' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime?: string;
}
export class CalendarDecisionDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsIn(['APPROVED', 'REJECTED'])
  status: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
export class FinalizeTripDto {
  @ApiProperty({ enum: ['COMPLETED', 'CANCELLED'] })
  @IsIn(['COMPLETED', 'CANCELLED'])
  finalStatus: 'COMPLETED' | 'CANCELLED';
  @ApiProperty({ enum: ['SCHEDULED', 'IN_PROGRESS'] })
  @IsIn(['SCHEDULED', 'IN_PROGRESS'])
  expectedStatus: 'SCHEDULED' | 'IN_PROGRESS';
  @ApiProperty({ description: 'Lý do chốt; không thay thế xác nhận xuống xe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
