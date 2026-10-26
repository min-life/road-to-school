import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, Matches } from 'class-validator';

export class UpdateSchoolContractDto {
  @ApiProperty({
    description: 'Ngày bắt đầu hợp đồng mới (định dạng YYYY-MM-DD, >= ngày hiện tại tại VN)',
    example: '2026-11-01',
  })
  @IsNotEmpty({ message: 'Ngày bắt đầu hợp đồng không được để trống' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày bắt đầu hợp đồng phải có định dạng YYYY-MM-DD' })
  contractStartDate: string;

  @ApiProperty({
    description: 'Ngày kết thúc hợp đồng mới (định dạng YYYY-MM-DD, >= contractStartDate)',
    example: '2027-08-31',
  })
  @IsNotEmpty({ message: 'Ngày kết thúc hợp đồng không được để trống' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày kết thúc hợp đồng phải có định dạng YYYY-MM-DD' })
  contractEndDate: string;

  @ApiProperty({ description: 'Lý do cập nhật / gia hạn hợp đồng (tùy chọn)', required: false })
  @IsOptional()
  @IsString({ message: 'Lý do phải là chuỗi ký tự' })
  reason?: string;

  @ApiProperty({ description: 'Timestamp cập nhật gần nhất để chống xung đột (tùy chọn)', required: false })
  @IsOptional()
  @IsString()
  expectedUpdatedAt?: string;
}
