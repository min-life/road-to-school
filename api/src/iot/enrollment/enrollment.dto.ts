import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { DEVICE_ID_PATTERN, UID_PATTERN } from '../dto/iot-request.dto.js';
import { ENROLLMENT_STATES } from './enrollment-session.schema.js';
export class StartEnrollmentDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() schoolId: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() studentId: string;
  @ApiProperty({ pattern: DEVICE_ID_PATTERN.source })
  @Matches(DEVICE_ID_PATTERN)
  deviceId: string;
  @ApiPropertyOptional({ enum: ['REGISTER', 'REPLACE'], default: 'REGISTER' })
  @IsIn(['REGISTER', 'REPLACE'])
  operation: 'REGISTER' | 'REPLACE' = 'REGISTER';
  @ApiPropertyOptional({
    pattern: UID_PATTERN.source,
    description: 'Bắt buộc khi REPLACE',
  })
  @ValidateIf(
    (o: StartEnrollmentDto, value: unknown) =>
      o.operation === 'REPLACE' || value !== undefined,
  )
  @Matches(UID_PATTERN)
  expectedPreviousCardUid?: string;
  @ApiPropertyOptional({
    format: 'date-time',
    description: 'updatedAt hồ sơ, bắt buộc khi REPLACE',
  })
  @ValidateIf(
    (o: StartEnrollmentDto, value: unknown) =>
      o.operation === 'REPLACE' || value !== undefined,
  )
  @IsISO8601({ strict: true })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
  expectedStudentVersion?: string;
}
export class StudentRfidParamsDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() studentId: string;
}
export class RevokeStudentRfidDto {
  @ApiProperty({ pattern: UID_PATTERN.source })
  @Matches(UID_PATTERN)
  expectedCardUid: string;
  @ApiProperty({ format: 'date-time' })
  @IsISO8601({ strict: true })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
  expectedStudentVersion: string;
}
export class StudentRfidBindingDto {
  @ApiProperty() studentId: string;
  @ApiProperty({ type: String, nullable: true }) rfidCardUid: string | null;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
}
export class EnrollmentIdDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() sessionId: string;
}
export class EnrollmentQueryDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() studentId: string;
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  activeOnly: boolean = true;
}
export class ConfirmEnrollmentDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  capturedScanId: string;
}
export class EnrollmentScanDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() sessionId: string;
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  scanId: string;
  @ApiProperty({ pattern: UID_PATTERN.source })
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim().replaceAll(':', '').toUpperCase()
      : value,
  )
  @Matches(UID_PATTERN)
  cardUid: string;
  @ApiProperty({ format: 'date-time' })
  @IsISO8601({ strict: true })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
  scannedAt: string;
  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  cardType?: string;
}
class EnrollmentCandidateDto {
  @ApiProperty() scanId: string;
  @ApiProperty() cardUid: string;
  @ApiPropertyOptional() cardType?: string;
  @ApiProperty({ format: 'date-time' }) scannedAt: string;
  @ApiProperty({ format: 'date-time' }) capturedAt: string;
}
class EnrollmentFeedbackDto {
  @ApiProperty() scanId: string;
  @ApiProperty() code: string;
  @ApiProperty({ format: 'date-time' }) observedAt: string;
}
export class EnrollmentResponseDto {
  @ApiProperty({ enum: ['REGISTER', 'REPLACE'] }) operation: string;
  @ApiProperty({ type: String, nullable: true }) expectedPreviousCardUid:
    string | null;
  @ApiProperty() id: string;
  @ApiProperty() deviceId: string;
  @ApiProperty() studentId: string;
  @ApiProperty({ enum: ENROLLMENT_STATES }) state: string;
  @ApiProperty() isOpen: boolean;
  @ApiProperty({ format: 'date-time' }) expiresAt: string;
  @ApiProperty({ format: 'date-time' }) serverTime: string;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  lastDeviceAckAt: string | null;
  @ApiProperty({ type: EnrollmentCandidateDto, nullable: true })
  candidate: EnrollmentCandidateDto | null;
  @ApiProperty({ type: EnrollmentFeedbackDto, nullable: true })
  lastScanFeedback: EnrollmentFeedbackDto | null;
  @ApiProperty({ type: String, nullable: true }) closedAt: string | null;
  @ApiProperty({ type: String, nullable: true }) closeReason: string | null;
  @ApiProperty() bindingCurrent: boolean;
}
export class EnrollmentListDto {
  @ApiProperty({ type: [EnrollmentResponseDto] }) data: EnrollmentResponseDto[];
}
export class EnrollmentCaptureAckDto {
  @ApiProperty() sessionId: string;
  @ApiProperty() scanId: string;
  @ApiProperty() cardUid: string;
  @ApiProperty() scannedAt: string;
  @ApiProperty() state: string;
  @ApiProperty() duplicate: boolean;
}
