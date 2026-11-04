import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, IsUUID, IsNumber } from 'class-validator';
import { TripIncidentType } from '@prisma/client';

export class CreateIncidentDto {
  @ApiProperty({
    enum: TripIncidentType,
    description: 'Loại sự cố (ATTENDANT_MISSING, DRIVER_MISSING, NO_GUARDIAN_AT_STOP, TRAFFIC_DELAY, GPS_SIGNAL_LOST, ...)',
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

  @ApiPropertyOptional({
    description: 'Vĩ độ (latitude) tại thời điểm xảy ra sự cố',
    example: 10.762622,
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Kinh độ (longitude) tại thời điểm xảy ra sự cố',
    example: 106.660172,
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({
    description: 'ID học sinh liên quan trực tiếp đến sự cố (ví dụ khi vắng phụ huynh đón - NO_GUARDIAN_AT_STOP)',
    example: 'student-uuid-123',
  })
  @IsOptional()
  @IsUUID()
  studentId?: string;
}
