import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class GenerateTripsDto {
  @ApiProperty({
    description: 'ID trường học cần sinh chuyến (bắt buộc đúng 1 trường)',
    example: 'school-uuid-1',
  })
  @IsNotEmpty({ message: 'schoolId không được để trống' })
  @IsString({ message: 'schoolId phải là chuỗi' })
  schoolId: string;

  @ApiProperty({
    description: 'Ngày bắt đầu sinh chuyến (YYYY-MM-DD)',
    example: '2026-10-26',
  })
  @IsNotEmpty({ message: 'fromDate không được để trống' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fromDate phải theo định dạng YYYY-MM-DD' })
  fromDate: string;

  @ApiProperty({
    description: 'Ngày kết thúc sinh chuyến (YYYY-MM-DD)',
    example: '2026-10-30',
  })
  @IsNotEmpty({ message: 'toDate không được để trống' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'toDate phải theo định dạng YYYY-MM-DD' })
  toDate: string;
}

export class TripGenerationFailureDto {
  @ApiProperty({ example: 'route-uuid-1' })
  routeId: string;

  @ApiProperty({ example: 'Tuyến Đi 01' })
  routeName: string;

  @ApiProperty({ example: '2026-10-26' })
  serviceDate: string;

  @ApiProperty({ example: 'Xung đột lịch tài xế hoặc xe' })
  reason: string;
}

export class GenerateTripsResponseDto {
  @ApiProperty({ example: 20 })
  totalEligible: number;

  @ApiProperty({ example: 16 })
  createdCount: number;

  @ApiProperty({ example: 4 })
  skippedCount: number;

  @ApiProperty({ example: 0 })
  failedCount: number;

  @ApiProperty({ type: [TripGenerationFailureDto] })
  failures: TripGenerationFailureDto[];
}
