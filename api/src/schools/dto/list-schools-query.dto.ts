import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum SchoolStatusFilter {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class ListSchoolsQueryDto {
  @ApiPropertyOptional({
    description: 'Số thứ tự trang cần lấy (bắt đầu từ 1)',
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số trang phải là số nguyên' })
  @Min(1, { message: 'Số trang tối thiểu là 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng trường học trên mỗi trang (tối đa 50)',
    default: 10,
    minimum: 1,
    maximum: 50,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số lượng bản ghi trên trang phải là số nguyên' })
  @Min(1, { message: 'Số lượng bản ghi tối thiểu là 1' })
  @Max(50, { message: 'Số lượng bản ghi tối đa là 50' })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm theo tên trường học (không phân biệt chữ hoa/thường)',
    example: 'Nguyễn Du',
  })
  @IsOptional()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi ký tự' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Bộ lọc trạng thái hoạt động của trường (ACTIVE hoặc INACTIVE)',
    enum: SchoolStatusFilter,
    example: SchoolStatusFilter.ACTIVE,
  })
  @IsOptional()
  @IsEnum(SchoolStatusFilter, {
    message: 'Trạng thái lọc phải là ACTIVE hoặc INACTIVE',
  })
  status?: SchoolStatusFilter;
}
