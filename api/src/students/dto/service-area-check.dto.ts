import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, Min, Max } from 'class-validator';

export class ServiceAreaCheckDto {
  @ApiProperty({
    description: 'Vĩ độ của địa chỉ học sinh (-90 đến 90)',
    example: 10.776889,
  })
  @IsNotEmpty({ message: 'Vĩ độ không được để trống' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Vĩ độ phải là số hợp lệ' })
  @Min(-90, { message: 'Vĩ độ tối thiểu là -90' })
  @Max(90, { message: 'Vĩ độ tối đa là 90' })
  latitude: number;

  @ApiProperty({
    description: 'Kinh độ của địa chỉ học sinh (-180 đến 180)',
    example: 106.700806,
  })
  @IsNotEmpty({ message: 'Kinh độ không được để trống' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Kinh độ phải là số hợp lệ' })
  @Min(-180, { message: 'Kinh độ tối thiểu là -180' })
  @Max(180, { message: 'Kinh độ tối đa là 180' })
  longitude: number;
}

export enum ServiceAreaStatus {
  IN_SERVICE_AREA = 'IN_SERVICE_AREA',
  OUT_OF_SERVICE_AREA = 'OUT_OF_SERVICE_AREA',
  UNAVAILABLE = 'UNAVAILABLE',
}

export class ServiceAreaCheckResponseDto {
  @ApiProperty({
    enum: ServiceAreaStatus,
    description: 'Trạng thái kiểm tra phạm vi phục vụ',
    example: ServiceAreaStatus.IN_SERVICE_AREA,
  })
  status: ServiceAreaStatus;
}
