import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, Min, Max } from 'class-validator';
import { ServiceAreaStatus } from '../../students/dto/service-area-check.dto.js';

export { ServiceAreaStatus };

export class ParentServiceAreaCheckDto {
  @ApiProperty({
    description: 'Vĩ độ của địa chỉ đề xuất (-90 đến 90)',
    example: 10.776889,
  })
  @IsNotEmpty({ message: 'Vĩ độ không được để trống' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Vĩ độ phải là số hợp lệ' })
  @Min(-90, { message: 'Vĩ độ tối thiểu là -90' })
  @Max(90, { message: 'Vĩ độ tối đa là 90' })
  latitude: number;

  @ApiProperty({
    description: 'Kinh độ của địa chỉ đề xuất (-180 đến 180)',
    example: 106.700806,
  })
  @IsNotEmpty({ message: 'Kinh độ không được để trống' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Kinh độ phải là số hợp lệ' })
  @Min(-180, { message: 'Kinh độ tối thiểu là -180' })
  @Max(180, { message: 'Kinh độ tối đa là 180' })
  longitude: number;
}

export class ParentServiceAreaBoundaryDto {
  @ApiProperty({
    description: 'Tọa độ tâm (bãi đỗ xe trung tâm đang hiệu lực)',
    example: { latitude: 10.776889, longitude: 106.700806 },
  })
  center: {
    latitude: number;
    longitude: number;
  };

  @ApiProperty({
    description: 'Bán kính phục vụ tối đa (mét)',
    example: 50000,
  })
  radiusMeters: number;

  @ApiProperty({
    description: 'Bán kính phục vụ tối đa (kilômét)',
    example: 50,
  })
  radiusKm: number;
}

export class ParentServiceAreaCheckResponseDto {
  @ApiProperty({
    enum: ServiceAreaStatus,
    description: 'Trạng thái kiểm tra phạm vi phục vụ: IN_SERVICE_AREA, OUT_OF_SERVICE_AREA, UNAVAILABLE',
    example: ServiceAreaStatus.IN_SERVICE_AREA,
  })
  status: ServiceAreaStatus;

  @ApiProperty({
    description: 'Khoảng cách từ bãi xe trung tâm đến vị trí đề xuất (mét)',
    example: 12500,
    required: false,
    nullable: true,
  })
  distanceMeters?: number | null;

  @ApiProperty({
    description: 'Khoảng cách từ bãi xe trung tâm đến vị trí đề xuất (kilômét)',
    example: 12.5,
    required: false,
    nullable: true,
  })
  distanceKm?: number | null;

  @ApiProperty({
    description: 'Bán kính phục vụ tối đa của nhà xe (kilômét)',
    example: 50,
    required: false,
    nullable: true,
  })
  maxOperatingRadiusKm?: number | null;

  @ApiProperty({
    description: 'Dữ liệu ranh giới phục vụ cho bản đồ (tâm bãi xe và bán kính)',
    type: ParentServiceAreaBoundaryDto,
    required: false,
    nullable: true,
  })
  boundary?: ParentServiceAreaBoundaryDto | null;

  @ApiProperty({
    description: 'Thông báo kết quả kiểm tra hoặc lý do ngoài vùng',
    example: 'Trong bán kính phục vụ',
    required: false,
  })
  message?: string;
}
