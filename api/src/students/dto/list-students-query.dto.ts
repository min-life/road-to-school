import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { StudentStatus } from '@prisma/client';

export class ListStudentsQueryDto {
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
    description: 'Số lượng học sinh trên mỗi trang',
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
    description: 'Từ khóa tìm kiếm theo họ tên hoặc mã học sinh',
    example: 'Nguyễn Minh',
  })
  @IsOptional()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi ký tự' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Lọc học sinh theo trạng thái hoạt động (AVAILABLE hoặc DISABLED)',
    enum: StudentStatus,
    example: StudentStatus.AVAILABLE,
  })
  @IsOptional()
  @IsEnum(StudentStatus, {
    message: 'Trạng thái lọc học sinh phải là AVAILABLE hoặc DISABLED',
  })
  status?: StudentStatus;

  @ApiPropertyOptional({
    description:
      'Lọc học sinh theo tình trạng địa chỉ dẫn xuất (true: đã có địa chỉ, false: chưa có địa chỉ)',
    type: Boolean,
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({
    message: 'Tình trạng địa chỉ lọc phải là true hoặc false',
  })
  hasAddress?: boolean;
}
