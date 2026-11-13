import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsDefined,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { DEVICE_ID_PATTERN } from '../dto/iot-request.dto.js';

export class IotDeviceParamsDto {
  @ApiProperty({ pattern: DEVICE_ID_PATTERN.source })
  @IsString()
  @Matches(DEVICE_ID_PATTERN)
  deviceId: string;
}
export class AssignIotVehicleDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() vehicleId: string;
  @ApiProperty({
    format: 'uuid',
    nullable: true,
    description: 'Current assignment UUID; explicit null for first assignment',
  })
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsDefined()
  @IsUUID()
  expectedAssignmentId: string | null;
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
export class ReleaseIotVehicleDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() expectedAssignmentId: string;
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
export class IotHeartbeatDto {
  @ApiPropertyOptional({ maxLength: 1024 })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  contextToken?: string;
  @ApiPropertyOptional({
    enum: ['ENROLLMENT', 'VEHICLE_SCAN', 'POC', 'ATTENDANCE'],
  })
  @IsOptional()
  @IsIn(['ENROLLMENT', 'VEHICLE_SCAN', 'POC', 'ATTENDANCE'])
  mode?: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  @IsOptional()
  @IsUUID()
  enrollmentSessionId?: string | null;
  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firmwareVersion?: string;
  @ApiProperty({ format: 'uuid', nullable: true })
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsDefined()
  @IsUUID()
  assignmentId: string | null;
}
export class IotAssignmentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() deviceId: string;
  @ApiProperty() vehicleId: string;
  @ApiProperty() licensePlate: string;
  @ApiProperty({ format: 'date-time' }) assignedAt: string;
  @ApiProperty({ nullable: true, format: 'date-time', type: String })
  releasedAt: string | null;
  @ApiProperty() assignedById: string;
  @ApiProperty({ nullable: true, type: String }) releasedById: string | null;
  @ApiProperty({ nullable: true, type: String }) reason: string | null;
  @ApiProperty({ nullable: true, type: String }) releaseReason: string | null;
}
export class IotAssignmentStateDto {
  @ApiProperty() deviceId: string;
  @ApiProperty({ type: IotAssignmentResponseDto, nullable: true })
  assignment: IotAssignmentResponseDto | null;
  @ApiProperty({ enum: ['UNASSIGNED', 'PENDING', 'CONFIRMED'] })
  configurationStatus: string;
  @ApiProperty({ nullable: true, type: String }) reportedAssignmentId:
    string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  lastConfigAckAt: string | null;
}
export class IotAssignmentHistoryDto {
  @ApiProperty({ type: [IotAssignmentResponseDto] })
  data: IotAssignmentResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
export class IotRuntimeConfigDto {
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) tripId:
    string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    enum: ['BOARDING', 'ALIGHTING'],
  })
  phase: string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Opaque signed token, never log',
  })
  contextToken: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  contextExpiresAt: string | null;
  @ApiProperty({ type: String, nullable: true }) attendanceReason:
    string | null;
  @ApiProperty({ enum: ['ENROLLMENT', 'VEHICLE_SCAN', 'POC', 'ATTENDANCE'] })
  mode: string;
  @ApiProperty({ type: String, nullable: true }) enrollmentSessionId:
    string | null;
  @ApiProperty() deviceId: string;
  @ApiProperty({ nullable: true, type: String }) assignmentId: string | null;
  @ApiProperty({ nullable: true, type: String }) vehicleId: string | null;
  @ApiProperty({ nullable: true, type: String }) licensePlate: string | null;
  @ApiProperty({ format: 'date-time' }) expiresAt: string;
  @ApiProperty({ description: 'UTC seconds, same expiry as expiresAt' })
  expiresAtEpoch: number;
}
export class IotHeartbeatResponseDto {
  @ApiProperty({ enum: ['ENROLLMENT', 'VEHICLE_SCAN', 'POC', 'ATTENDANCE'] })
  mode: string;
  @ApiProperty({ type: String, nullable: true }) enrollmentSessionId:
    string | null;
  @ApiProperty({ nullable: true, type: String }) assignmentId: string | null;
  @ApiProperty({ format: 'date-time' }) acknowledgedAt: string;
}
