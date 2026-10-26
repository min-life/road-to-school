import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ConfirmRoutePlanDto {
  @ApiProperty({
    description: 'Mã phiên Preview hợp lệ còn hiệu lực để xác nhận lưu toàn bộ',
    example: 'prev_token_123456789',
  })
  @IsNotEmpty({ message: 'Token Preview không được để trống' })
  @IsString({ message: 'Token Preview phải là chuỗi ký tự' })
  previewToken: string;

  @ApiPropertyOptional({
    description: 'Tên tùy chỉnh cho phương án tuyến (tùy chọn)',
    example: 'Phương án tuyến Học kỳ 1 2026/2027 - THCS Chu Văn An',
  })
  @IsOptional()
  @IsString({ message: 'Tên phương án tuyến phải là chuỗi ký tự' })
  planName?: string;
}
