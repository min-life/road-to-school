import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class ListTripsQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page phải là số nguyên' })
  @Min(1, { message: 'page tối thiểu là 1' })
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit tối thiểu là 1' })
  @Max(100, { message: 'limit tối đa là 100' })
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'school-uuid-1' })
  @IsOptional()
  @IsString({ message: 'schoolId phải là chuỗi' })
  schoolId?: string;

  @ApiPropertyOptional({ example: '2026-10-26', description: 'Từ ngày (YYYY-MM-DD)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fromDate phải theo định dạng YYYY-MM-DD' })
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-11-01', description: 'Đến ngày (YYYY-MM-DD)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'toDate phải theo định dạng YYYY-MM-DD' })
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Lọc trạng thái chuyến xe (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, NOT_CREATED)',
    example: 'SCHEDULED',
  })
  @IsOptional()
  @IsString({ message: 'status phải là chuỗi' })
  status?: string;

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm (tên tuyến, tên trường, biển số xe, tên tài xế)',
    example: 'Tiểu Học FPT',
  })
  @IsOptional()
  @IsString({ message: 'search phải là chuỗi' })
  search?: string;
}
