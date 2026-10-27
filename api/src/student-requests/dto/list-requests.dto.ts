import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsInt, IsBoolean, IsUUID, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { RequestType, RequestStatus } from '@prisma/client';

export class ListRequestsQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Lọc trường cho System Admin; School Admin vẫn bị giới hạn trường theo session.' })
  @IsOptional() @IsUUID() schoolId?: string;
  @ApiPropertyOptional({ type: Boolean, description: 'Chỉ hồ sơ PENDING thuộc quyền xử lý hiện tại.' })
  @IsOptional() @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value) @IsBoolean() actionable?: boolean;
  @ApiPropertyOptional({
    enum: RequestType,
    description: 'Lọc theo loại yêu cầu',
  })
  @IsOptional()
  @IsEnum(RequestType, { message: 'Loại yêu cầu không hợp lệ' })
  type?: RequestType;

  @ApiPropertyOptional({
    enum: RequestStatus,
    description: 'Lọc theo trạng thái yêu cầu',
  })
  @IsOptional()
  @IsEnum(RequestStatus, { message: 'Trạng thái yêu cầu không hợp lệ' })
  status?: RequestStatus;

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm theo tên hoặc mã học sinh',
    example: 'Nguyễn Văn A',
  })
  @IsOptional()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi ký tự' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Số thứ tự trang (bắt đầu từ 1)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng yêu cầu trên một trang',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
