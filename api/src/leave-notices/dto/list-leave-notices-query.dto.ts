import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { LeaveNoticeKind, LeaveNoticeStatus, RouteDirection } from '@prisma/client';

export class ListLeaveNoticesQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() schoolId?: string;
  @ApiPropertyOptional({ type: Boolean }) @IsOptional() @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value) @IsBoolean() actionable?: boolean;
  @ApiPropertyOptional({ description: 'Lọc theo ID học sinh' })
  @IsOptional()
  @IsUUID('4', { message: 'studentId phải là UUID hợp lệ' })
  studentId?: string;

  @ApiPropertyOptional({ enum: LeaveNoticeKind, description: 'Lọc theo loại đối tượng nghỉ' })
  @IsOptional()
  @IsEnum(LeaveNoticeKind, { message: 'kind không hợp lệ' })
  kind?: LeaveNoticeKind;

  @ApiPropertyOptional({ enum: LeaveNoticeStatus, description: 'Lọc theo trạng thái báo nghỉ' })
  @IsOptional()
  @IsEnum(LeaveNoticeStatus, { message: 'status không hợp lệ' })
  status?: LeaveNoticeStatus;

  @ApiPropertyOptional({ example: '2026-10-27', description: 'Lọc theo ngày vận hành (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'serviceDate phải có định dạng YYYY-MM-DD' })
  serviceDate?: string;

  @ApiPropertyOptional({ enum: RouteDirection, description: 'Lọc theo chiều (TO_SCHOOL | TO_PARKING)' })
  @IsOptional()
  @IsEnum(RouteDirection, { message: 'direction không hợp lệ' })
  direction?: RouteDirection;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page phải là số nguyên' })
  @Min(1, { message: 'page tối thiểu là 1' })
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit tối thiểu là 1' })
  @Max(100, { message: 'limit tối đa là 100' })
  limit?: number = 20;
}
