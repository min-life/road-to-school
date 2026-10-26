import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { RoutePlanStatus } from '@prisma/client';

export class ListRoutePlansQueryDto {
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
    description: 'Số lượng phương án trên mỗi trang (tối đa 100)',
    default: 10,
    minimum: 1,
    maximum: 100,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số lượng bản ghi trên trang phải là số nguyên' })
  @Min(1, { message: 'Số lượng bản ghi tối thiểu là 1' })
  @Max(100, { message: 'Số lượng bản ghi tối đa là 100' })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm theo tên phương án tuyến hoặc tên trường học',
    example: 'Tiểu học FPT',
  })
  @IsOptional()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi ký tự' })
  @MaxLength(100, { message: 'Từ khóa tìm kiếm không vượt quá 100 ký tự' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo ID trường học',
    example: 'd1a892b1-419b-4391-a1b2-111111111111',
  })
  @IsOptional()
  @IsString({ message: 'ID trường học phải là chuỗi ký tự' })
  schoolId?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái phương án (DRAFT, ACTIVE, CANCELLED)',
    enum: RoutePlanStatus,
    example: RoutePlanStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(RoutePlanStatus, {
    message: 'Trạng thái lọc phải là một trong các giá trị DRAFT, ACTIVE, CANCELLED',
  })
  status?: RoutePlanStatus;
}
