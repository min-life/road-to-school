import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, Min, Max } from 'class-validator';

export class UpdateStudentAddressDto {
  @ApiProperty({
    description: 'Địa chỉ chi tiết nơi đưa đón học sinh',
    example: '456 Đường Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh',
  })
  @IsNotEmpty({ message: 'Địa chỉ không được để trống' })
  @IsString({ message: 'Địa chỉ phải là chuỗi ký tự' })
  addressText: string;

  @ApiProperty({
    description: 'Vĩ độ (WGS-84)',
    example: 10.762622,
    minimum: -90,
    maximum: 90,
  })
  @IsNotEmpty({ message: 'Vĩ độ không được để trống' })
  @IsNumber({}, { message: 'Vĩ độ phải là số hợp lệ' })
  @Min(-90, { message: 'Vĩ độ không được nhỏ hơn -90' })
  @Max(90, { message: 'Vĩ độ không được lớn hơn 90' })
  latitude: number;

  @ApiProperty({
    description: 'Kinh độ (WGS-84)',
    example: 106.682345,
    minimum: -180,
    maximum: 180,
  })
  @IsNotEmpty({ message: 'Kinh độ không được để trống' })
  @IsNumber({}, { message: 'Kinh độ phải là số hợp lệ' })
  @Min(-180, { message: 'Kinh độ không được nhỏ hơn -180' })
  @Max(180, { message: 'Kinh độ không được lớn hơn 180' })
  longitude: number;
}
