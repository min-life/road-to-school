import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVehicleDto {
  @ApiProperty({
    description: 'Hãng sản xuất phương tiện (ví dụ: Hyundai, Ford, Thaco, Samco)',
    example: 'Hyundai',
  })
  @IsNotEmpty({ message: 'Hãng xe không được để trống' })
  @IsString({ message: 'Hãng xe phải là chuỗi ký tự' })
  brand: string;

  @ApiProperty({
    description:
      'Số lượng ghế khả dụng dành cho học sinh, không bao gồm ghế tài xế và các ghế dành riêng cho nhân sự',
    example: 14,
    minimum: 1,
  })
  @IsNotEmpty({ message: 'Số lượng ghế không được để trống' })
  @Type(() => Number)
  @IsInt({ message: 'Số lượng ghế phải là số nguyên' })
  @Min(1, { message: 'Số lượng ghế khả dụng cho học sinh phải lớn hơn 0' })
  seatCount: number;

  @ApiProperty({
    description: 'Biển số xe (duy nhất toàn hệ thống)',
    example: '51B-123.45',
  })
  @IsNotEmpty({ message: 'Biển số xe không được để trống' })
  @IsString({ message: 'Biển số xe phải là chuỗi ký tự' })
  licensePlate: string;

  @ApiProperty({
    description: 'Màu sắc phương tiện',
    example: 'Trắng',
  })
  @IsNotEmpty({ message: 'Màu sắc phương tiện không được để trống' })
  @IsString({ message: 'Màu sắc phương tiện phải là chuỗi ký tự' })
  color: string;
}
