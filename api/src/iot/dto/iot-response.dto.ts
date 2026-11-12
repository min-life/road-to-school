import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IotAssignmentResponseDto } from '../assignments/iot-assignment.dto.js';

export class IotDeviceResponseDto {
  @ApiPropertyOptional() enrollmentBusy?:boolean;
  @ApiPropertyOptional() enrollmentState?:string;
  @ApiPropertyOptional({type:String,nullable:true}) enrollmentExpiresAt?:string|null;
  @ApiPropertyOptional({type:String,nullable:true}) pendingSessionId?:string|null;
  @ApiProperty() deviceId: string;
  @ApiProperty() name: string;
  @ApiProperty() macAddress: string;
  @ApiProperty() chipModel: string;
  @ApiProperty() firmwareVersion: string;
  @ApiProperty({ enum: ['ONLINE', 'OFFLINE'], description: 'ONLINE khi nhận scan/heartbeat hợp lệ trong 60 giây; không chứng minh lắp vật lý trên xe' })
  status: 'ONLINE' | 'OFFLINE';
  @ApiPropertyOptional({ format: 'date-time' }) lastSeenAt?: string;
  @ApiPropertyOptional({ nullable: true, type: String }) reportedAssignmentId?: string | null;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) lastConfigAckAt?: string | null;
  @ApiPropertyOptional({ type: IotAssignmentResponseDto, nullable: true }) assignment?: IotAssignmentResponseDto | null;
  @ApiPropertyOptional({ enum: ['UNASSIGNED', 'PENDING', 'CONFIRMED'] }) configurationStatus?: string;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
}

export class RegisteredIotDeviceResponseDto {
  @ApiProperty({ type: IotDeviceResponseDto }) device: IotDeviceResponseDto;
  @ApiProperty({ description: 'Khóa thiết bị, chỉ cấp cho SYSTEM_ADMIN khi đăng ký/cấp cấu hình; không ghi log hoặc đưa vào URL' })
  deviceKey: string;
}

export class ProvisionedIotDeviceResponseDto extends RegisteredIotDeviceResponseDto {
  @ApiProperty({ description: 'Địa chỉ từ IOT_ADVERTISED_API_URL của máy chủ, ESP32 có thể truy cập; kết thúc /api/v1' })
  backendUrl: string;
}

export class IotScanResponseDto {
  @ApiProperty({ nullable: true, type: String }) assignmentId: string | null;
  @ApiProperty({ nullable: true, type: String }) vehicleId: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Biển số lúc server tiếp nhận; scan POC cũ không backfill' }) vehicleLicensePlateSnapshot: string | null;
  @ApiProperty({ format: 'uuid' }) scanId: string;
  @ApiProperty() deviceId: string;
  @ApiProperty() cardUid: string;
  @ApiPropertyOptional() cardType?: string;
  @ApiProperty({ format: 'date-time' }) scannedAt: string;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
}

export class ReceivedIotScanResponseDto {
  @ApiProperty({ type: IotScanResponseDto }) scan: IotScanResponseDto;
  @ApiProperty({ description: 'true nếu cùng scanId và payload đã được lưu trước đó' }) duplicate: boolean;
}

export class IotPageResponseDto {
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}

export class IotDevicesResponseDto extends IotPageResponseDto {
  @ApiProperty({ type: [IotDeviceResponseDto] }) data: IotDeviceResponseDto[];
}

export class IotScansResponseDto extends IotPageResponseDto {
  @ApiProperty({ type: [IotScanResponseDto] }) data: IotScanResponseDto[];
}

export class IotWifiResponseDto {
  @ApiProperty() deviceId: string;
  @ApiProperty() ssid: string;
  @ApiProperty({ example: '********' }) passwordMasked: string;
  @ApiProperty({ description: 'false: chỉ lưu trên server, chưa có ACK thiết bị' }) isConfigured: boolean;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
}
