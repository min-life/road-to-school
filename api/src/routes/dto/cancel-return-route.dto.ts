import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CancelReturnRouteDto {
  @ApiProperty({
    description: 'Mã phiên Preview hợp lệ còn hiệu lực',
    example: 'prev_token_123456789',
  })
  @IsNotEmpty({ message: 'Token Preview không được để trống' })
  @IsString({ message: 'Token Preview phải là chuỗi ký tự' })
  previewToken: string;

  @ApiProperty({
    description: 'Chỉ số (index) của tuyến về cần hủy trong danh sách returnRoutes (0-indexed)',
    example: 0,
  })
  @IsInt({ message: 'Chỉ số tuyến về phải là số nguyên' })
  @Min(0, { message: 'Chỉ số tuyến về tối thiểu là 0' })
  returnRouteIndex: number;
}
