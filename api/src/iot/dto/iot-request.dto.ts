import { Transform, Type } from 'class-transformer';
import {
  IsInt, IsISO8601, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const DEVICE_ID_PATTERN = /^[A-Za-z0-9_:-]{1,128}$/;
export const UID_PATTERN = /^(?:[0-9A-F]{8}|[0-9A-F]{14})$/;
const normalizeUid = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replaceAll(':', '').toUpperCase() : value;

export class RegisterIotDeviceDto {
  @ApiProperty({ maxLength: 128, pattern: DEVICE_ID_PATTERN.source })
  @IsString() @Matches(DEVICE_ID_PATTERN)
  deviceId: string;

  @ApiProperty({ maxLength: 120 })
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(120)
  name: string;

  @ApiProperty({ description: 'MAC Wi-Fi gồm 12 hex, có hoặc không có dấu hai chấm' })
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.toUpperCase() : value)
  @IsString() @Matches(/^(?:[0-9A-F]{12}|(?:[0-9A-F]{2}:){5}[0-9A-F]{2})$/)
  macAddress: string;

  @ApiProperty({ maxLength: 80 })
  @IsString() @Matches(/\S/) @MaxLength(80)
  chipModel: string;

  @ApiProperty({ maxLength: 80 })
  @IsString() @Matches(/\S/) @MaxLength(80)
  firmwareVersion: string;
}

export class ListIotQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 100000 })
  @Type(() => Number) @IsInt() @Min(1) @Max(100000)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit = 20;

  @ApiPropertyOptional({ pattern: DEVICE_ID_PATTERN.source })
  @IsOptional() @IsString() @Matches(DEVICE_ID_PATTERN)
  deviceId?: string;
}

export class ListIotScansQueryDto extends ListIotQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() vehicleId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() assignmentId?: string;
  @ApiPropertyOptional({ description: 'UID 4/7 byte; hex hoặc hex có dấu hai chấm' })
  @IsOptional() @Transform(normalizeUid) @IsString() @Matches(UID_PATTERN)
  cardUid?: string;
}

export class ReceiveIotScanDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'Required for a vehicle-bound device; frozen with scan payload on retries' })
  @IsOptional() @IsUUID() assignmentId?: string | null;
  @ApiProperty({ format: 'uuid', description: 'UUIDv4 do thiết bị sinh một lần, giữ nguyên khi retry' })
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.toLowerCase() : value)
  @IsUUID('4')
  scanId: string;

  @ApiProperty({ pattern: DEVICE_ID_PATTERN.source })
  @IsString() @Matches(DEVICE_ID_PATTERN)
  deviceId: string;

  @ApiProperty({ description: 'UID 4/7 byte, được chuẩn hóa hex viết hoa không dấu phân cách' })
  @Transform(normalizeUid) @IsString() @Matches(UID_PATTERN)
  cardUid: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString() @Matches(/\S/) @MaxLength(80)
  cardType?: string;

  @ApiProperty({ format: 'date-time', description: 'Thời gian thiết bị quẹt, ISO 8601 có timezone; tối đa 5 phút trong tương lai' })
  @IsISO8601({ strict: true }) @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
  scannedAt: string;
}

export class SaveIotWifiDto {
  @ApiProperty({ pattern: DEVICE_ID_PATTERN.source })
  @IsString() @Matches(DEVICE_ID_PATTERN)
  deviceId: string;

  @ApiProperty({ maxLength: 32, description: '1–32 byte UTF-8; giữ nguyên khoảng trắng' })
  @IsString() @MinLength(1) @MaxLength(32)
  ssid: string;

  @ApiProperty({ writeOnly: true, description: 'WPA/WPA2: 8–63 ký tự ASCII in được hoặc 64 hex' })
  @IsString() @Matches(/^(?:[\x20-\x7E]{8,63}|[0-9a-fA-F]{64})$/)
  password: string;
}
