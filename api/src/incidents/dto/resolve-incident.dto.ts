import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export enum ResolveIncidentAction {
  ARRIVED = 'ARRIVED',
  REPLACED = 'REPLACED',
}

export class ResolveIncidentDto {
  @ApiProperty({
    enum: ResolveIncidentAction,
    description: 'Hành động xử lý: ARRIVED (người cũ đã đến) hoặc REPLACED (phân công thay thế)',
    example: ResolveIncidentAction.ARRIVED,
  })
  @IsEnum(ResolveIncidentAction)
  @IsNotEmpty()
  action: ResolveIncidentAction;

  @ApiPropertyOptional({
    description: 'ID của nhân sự thay thế (bắt buộc khi action là REPLACED)',
    example: 'user-uuid-replacement',
  })
  @IsOptional()
  @IsUUID()
  replacementUserId?: string;

  @ApiPropertyOptional({
    description: 'Lý do hoặc ghi chú xử lý (tối đa 500 ký tự)',
    example: 'Đã phân công tài xế dự phòng do tài xế chính bận việc gấp',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái mong đợi của sự cố để kiểm tra concurrency CAS (mặc định WAITING_ASSIGNMENT)',
    example: 'WAITING_ASSIGNMENT',
  })
  @IsOptional()
  @IsString()
  expectedStatus?: string;
}
