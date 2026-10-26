import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsOptional, IsInt, Min, Max, IsString, IsEnum } from 'class-validator';

export enum SchoolEmployeeRoleFilter {
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  BUS_ATTENDANT = 'BUS_ATTENDANT',
}

export enum SchoolEmployeeStatusFilter {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class ListSchoolEmployeesQueryDto {
  @ApiPropertyOptional({
    description: 'Số trang hiện tại (bắt đầu từ 1)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số trang phải là số nguyên' })
  @Min(1, { message: 'Số trang phải lớn hơn hoặc bằng 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng nhân viên trên mỗi trang (1-100)',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số lượng mỗi trang phải là số nguyên' })
  @Min(1, { message: 'Số lượng mỗi trang tối thiểu là 1' })
  @Max(100, { message: 'Số lượng mỗi trang tối đa là 100' })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm theo họ tên, email hoặc số điện thoại',
    example: 'Hùng',
  })
  @IsOptional()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi ký tự' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo vai trò nhân viên trường học',
    enum: SchoolEmployeeRoleFilter,
    example: SchoolEmployeeRoleFilter.SCHOOL_ADMIN,
  })
  @IsOptional()
  @IsEnum(SchoolEmployeeRoleFilter, {
    message: 'Vai trò lọc phải là SCHOOL_ADMIN hoặc BUS_ATTENDANT',
  })
  role?: SchoolEmployeeRoleFilter;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái hoạt động của tài khoản',
    enum: SchoolEmployeeStatusFilter,
    example: SchoolEmployeeStatusFilter.ACTIVE,
  })
  @IsOptional()
  @IsEnum(SchoolEmployeeStatusFilter, {
    message: 'Trạng thái lọc phải là ACTIVE hoặc INACTIVE',
  })
  status?: SchoolEmployeeStatusFilter;
}
