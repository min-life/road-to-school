import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { EnrollmentScanDto } from '../enrollment/enrollment.dto.js';
import { OmitType } from '@nestjs/swagger';
import { ListIotQueryDto } from '../dto/iot-request.dto.js';
import { ATTENDANCE_STATES } from '../database/schemas/rfid-scan.schema.js';
import { Transform } from 'class-transformer';
export class AttendanceScanDto extends OmitType(EnrollmentScanDto, [
  'sessionId',
] as const) {
  @ApiProperty({
    maxLength: 1024,
    description: 'Opaque signed token from runtime config; freeze with scanId',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  contextToken: string;
}
export class AttendanceTripParamsDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() tripId: string;
}
export class AttendanceActionDto {}
export class AttendanceEventParamsDto extends AttendanceTripParamsDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  scanId: string;
}
export class AttendanceListQueryDto extends OmitType(ListIotQueryDto, [
  'deviceId',
] as const) {
  @ApiPropertyOptional({ enum: ['queue', 'history'], default: 'queue' })
  @IsIn(['queue', 'history'])
  view: 'queue' | 'history' = 'queue';
}
export class AttendanceEventDto {
  @ApiProperty() scanId: string;
  @ApiProperty() deviceId: string;
  @ApiProperty() tripId: string;
  @ApiProperty({ type: String, nullable: true }) studentId: string | null;
  @ApiProperty({ type: String, nullable: true }) studentName: string | null;
  @ApiProperty({ type: String, nullable: true }) studentCode: string | null;
  @ApiProperty() cardUid: string;
  @ApiProperty({ enum: ['BOARDING', 'ALIGHTING'] }) phase: string;
  @ApiProperty({ enum: ATTENDANCE_STATES }) state: string;
  @ApiProperty({ type: String, nullable: true }) resultCode: string | null;
  @ApiProperty() scannedAt: string;
  @ApiProperty() expiresAt: string;
  @ApiProperty() serverTime: string;
  @ApiProperty({ type: String, nullable: true }) confirmedById: string | null;
  @ApiProperty({ type: String, nullable: true }) confirmedAt: string | null;
  @ApiProperty({
    description:
      'PG currently matches the historical receipt/state; false after manual override',
  })
  current: boolean;
  @ApiProperty({
    description:
      'True for processed receipt/history; never means reapply a previous scan',
  })
  historical: boolean;
}
export class AttendanceReaderDto {
  @ApiProperty({ type: String, nullable: true }) deviceId: string | null;
  @ApiProperty({ enum: ['NO_DEVICE', 'PENDING', 'READY'] }) status: string;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  lastAckAt: string | null;
}
export class AttendanceListDto {
  @ApiProperty({ type: () => AttendanceReaderDto }) reader: AttendanceReaderDto;
  @ApiProperty({ type: [AttendanceEventDto] }) data: AttendanceEventDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty({
    type: String,
    nullable: true,
    enum: ['BOARDING', 'ALIGHTING'],
  })
  phase: string | null;
  @ApiProperty() serverTime: string;
}

export class AttendanceCaptureAckDto {
  @ApiProperty({ type: String, nullable: true }) resultCode: string | null;
  @ApiProperty() scanId: string;
  @ApiProperty() cardUid: string;
  @ApiProperty() scannedAt: string;
  @ApiProperty() tripId: string;
  @ApiProperty({ enum: ['BOARDING', 'ALIGHTING'] }) phase: string;
  @ApiProperty({ enum: ATTENDANCE_STATES }) state: string;
  @ApiProperty() duplicate: boolean;
}
