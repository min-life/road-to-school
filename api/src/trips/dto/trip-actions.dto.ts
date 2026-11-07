import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class TripReasonDto {
  @ApiProperty({
    description: 'Lý do bắt buộc để lưu lịch sử thao tác',
    maxLength: 500,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export class AttendanceCorrectionDto extends TripReasonDto {
  @ApiProperty({ enum: ['PRESENT', 'ABSENT'] })
  @IsIn(['PRESENT', 'ABSENT'])
  status: AttendanceStatus;

  @ApiProperty({
    enum: AttendanceStatus,
    description: 'Trạng thái điểm danh khi mở form',
  })
  @IsIn(Object.values(AttendanceStatus))
  expectedStatus: AttendanceStatus;
}

export class ReopenTripDto extends TripReasonDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  driverId?: string;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  busAttendantId?: string;
}


export class TripActionMessageDto {
  @ApiProperty()
  message: string;
}

export class ReopenTripResponseDto extends TripActionMessageDto {
  @ApiProperty({ format: 'uuid' })
  tripId: string;
}

class CorrectedAttendanceDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) tripId: string;
  @ApiProperty({ format: 'uuid' }) studentId: string;
  @ApiProperty({ enum: AttendanceStatus }) status: AttendanceStatus;
  @ApiProperty({ type: String, nullable: true }) absenceReason: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) markedById: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) markedAt: Date | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) alightedAt: Date | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) excludedAt: Date | null;
  @ApiProperty({ type: String, nullable: true }) exclusionReason: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: Date;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt: Date;
}

export class AttendanceCorrectionResponseDto extends TripActionMessageDto {
  @ApiProperty({ type: CorrectedAttendanceDto })
  attendance: CorrectedAttendanceDto;
}
