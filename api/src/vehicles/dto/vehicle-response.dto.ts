import { ApiProperty } from '@nestjs/swagger';

export class VehicleResponseDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'Hyundai' })
  brand: string;

  @ApiProperty({
    description:
      'Số lượng ghế khả dụng dành cho học sinh, không bao gồm ghế tài xế và các ghế dành riêng cho nhân sự',
    example: 14,
  })
  seatCount: number;

  @ApiProperty({ example: '51B-123.45' })
  licensePlate: string;

  @ApiProperty({ example: 'Trắng' })
  color: string;

  @ApiProperty({ example: '2026-10-23T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-10-23T12:00:00.000Z' })
  updatedAt: string;
}

export class VehicleListResponseDto {
  @ApiProperty({ type: [VehicleResponseDto] })
  items: VehicleResponseDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}
