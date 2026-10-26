import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelRoutePlanDto {
  @ApiProperty({
    description: 'Lý do hủy phương án tuyến DRAFT (bắt buộc để truy vết nghiệp vụ)',
    example: 'Thay đổi danh sách học sinh đăng ký hoặc lịch học của nhà trường',
  })
  @IsNotEmpty({ message: 'Vui lòng nhập lý do hủy phương án tuyến' })
  @IsString({ message: 'Lý do hủy phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Lý do hủy không vượt quá 500 ký tự' })
  reason: string;

  @ApiProperty({
    description: 'Fingerprint trạng thái phương án để chống xung đột (tùy chọn)',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Fingerprint trạng thái phải là chuỗi ký tự' })
  expectedFingerprint?: string;
}
