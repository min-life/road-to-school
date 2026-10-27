import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';

export class NotificationsQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() cursor?: string;
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number = 20;
  @ApiPropertyOptional({ enum: ['ALL', 'UNREAD', 'ACTIONABLE'], default: 'ALL' }) @IsOptional() @IsIn(['ALL', 'UNREAD', 'ACTIONABLE']) filter?: string = 'ALL';
}
export class PushRegistrationDto {
  @ApiProperty({ format: 'uuid', description: 'Chặn kết quả đăng ký chậm của tài khoản cũ gắn token vào tài khoản mới.' })
  @IsUUID() expectedUserId!: string;
  @ApiProperty({ description: 'Expo push token của thiết bị, chỉ gắn với Session đã xác thực.' })
  @IsString() @MaxLength(256) @Matches(/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/) token!: string;
}
export class NotificationItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() type!: string;
  @ApiProperty() title!: string;
  @ApiProperty() body!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) readAt!: string | null;
  @ApiProperty() available!: boolean;
}
export class NotificationListDto {
  @ApiProperty({ type: [NotificationItemDto] }) items!: NotificationItemDto[];
  @ApiProperty({ nullable: true, type: String }) nextCursor!: string | null;
  @ApiProperty() hasMore!: boolean;
}
export class NotificationSummaryDto {
  @ApiProperty() unreadCount!: number;
  @ApiProperty({ description: 'Hồ sơ sự cố còn cần role hiện tại xử lý, không phụ thuộc đã đọc hoặc filter Dashboard.' }) actionableIncidentCount!: number;
}
export class NotificationTargetDto {
  @ApiProperty() available!: boolean;
  @ApiProperty({ nullable: true, type: String }) webPath!: string | null;
  @ApiProperty({ nullable: true, type: String }) mobilePath!: string | null;
}
export class NotificationResultDto { @ApiProperty() success!: boolean }
