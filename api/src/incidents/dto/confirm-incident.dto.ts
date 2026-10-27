import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ConfirmIncidentDto {
  @ApiProperty({
    description: 'Lý do hoặc giải trình bắt buộc của giáo viên phụ xe khi xác nhận sự cố tự động',
    example: 'Đoạn đường đang thi công rào chắn nên xe phải đi vòng qua đường song song',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({
    description: 'Trạng thái mong đợi của sự cố để kiểm tra concurrency CAS (mặc định WAITING_CONFIRMATION)',
    example: 'WAITING_CONFIRMATION',
  })
  @IsOptional()
  @IsString()
  expectedStatus?: string;
}
