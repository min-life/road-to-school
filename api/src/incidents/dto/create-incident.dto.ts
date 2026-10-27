import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, IsUUID } from 'class-validator';
import { TripIncidentType } from '@prisma/client';

export class CreateIncidentDto {
  @ApiProperty({
    enum: [TripIncidentType.ATTENDANT_MISSING, TripIncidentType.DRIVER_MISSING],
    description: 'Loại sự cố báo thủ công (ATTENDANT_MISSING cho Driver, DRIVER_MISSING cho Bus Attendant)',
    example: TripIncidentType.ATTENDANT_MISSING,
  })
  @IsEnum(TripIncidentType)
  type: TripIncidentType;

  @ApiPropertyOptional({
    description: 'Ghi chú mô tả thêm về sự cố (tùy chọn, tối đa 500 ký tự)',
    example: 'Giáo viên phụ xe chưa có mặt tại điểm tập kết đúng giờ',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Khóa chống trùng lặp request từ client (idempotency)',
    example: 'client-uuid-12345',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotencyKey?: string;

  @ApiPropertyOptional({
    description: 'ID người được phân công hiện tại để bảo vệ khi admin vừa đổi người (CAS guard)',
    example: 'user-uuid-1',
  })
  @IsOptional()
  @IsUUID()
  expectedAssigneeId?: string;
}
