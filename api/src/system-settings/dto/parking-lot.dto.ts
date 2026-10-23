import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, Min, Max } from 'class-validator';

export class UpdateParkingLotDto {
  @ApiProperty({
    description: 'Địa chỉ chi tiết bãi đỗ xe trung tâm của nhà xe',
    example: '123 Đường Vận Tải, Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh',
  })
  @IsNotEmpty({ message: 'Địa chỉ bãi xe không được để trống' })
  @IsString({ message: 'Địa chỉ bãi xe phải là chuỗi ký tự' })
  addressText: string;

  @ApiProperty({
    description: 'Vĩ độ vị trí bãi xe (WGS-84)',
    example: 10.865432,
    minimum: -90,
    maximum: 90,
  })
  @IsNotEmpty({ message: 'Vĩ độ không được để trống' })
  @IsNumber({}, { message: 'Vĩ độ phải là số hợp lệ' })
  @Min(-90, { message: 'Vĩ độ không được nhỏ hơn -90' })
  @Max(90, { message: 'Vĩ độ không được lớn hơn 90' })
  latitude: number;

  @ApiProperty({
    description: 'Kinh độ vị trí bãi xe (WGS-84)',
    example: 106.789123,
    minimum: -180,
    maximum: 180,
  })
  @IsNotEmpty({ message: 'Kinh độ không được để trống' })
  @IsNumber({}, { message: 'Kinh độ phải là số hợp lệ' })
  @Min(-180, { message: 'Kinh độ không được nhỏ hơn -180' })
  @Max(180, { message: 'Kinh độ không được lớn hơn 180' })
  longitude: number;
}

export class ParkingLotResponseDto {
  @ApiProperty({
    description: 'Địa chỉ chi tiết bãi đỗ xe trung tâm',
    example: '123 Đường Vận Tải, Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh',
  })
  addressText: string;

  @ApiProperty({
    description: 'Vĩ độ vị trí bãi xe',
    example: 10.865432,
  })
  latitude: number;

  @ApiProperty({
    description: 'Kinh độ vị trí bãi xe',
    example: 106.789123,
  })
  longitude: number;

  @ApiProperty({
    description: 'Thời gian cập nhật gần nhất (ISO 8601)',
    example: '2026-10-23T12:00:00.000Z',
  })
  updatedAt: string;
}
