import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max, IsString, IsEnum } from 'class-validator';

export enum DriverStatusFilter {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class ListDriversQueryDto {
  @ApiPropertyOptional({
    description: 'Số thứ tự trang hiện tại (bắt đầu từ 1)',
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Trang phải là số nguyên' })
  @Min(1, { message: 'Trang tối thiểu là 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng tài xế trên mỗi trang',
    default: 10,
    minimum: 1,
    maximum: 100,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng tối thiểu là 1' })
  @Max(100, { message: 'Số lượng tối đa mỗi trang là 100' })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm theo họ tên, email hoặc số điện thoại',
    example: 'Trần Văn',
  })
  @IsOptional()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi ký tự' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Lọc tài xế theo trạng thái tài khoản',
    enum: DriverStatusFilter,
    example: DriverStatusFilter.ACTIVE,
  })
  @IsOptional()
  @IsEnum(DriverStatusFilter, {
    message: 'Trạng thái lọc tài xế phải là ACTIVE hoặc INACTIVE',
  })
  status?: DriverStatusFilter;
}
