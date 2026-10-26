import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { RouteDirection } from '@prisma/client';

export class StopServiceOverrideDto {
  @ApiProperty({
    description: 'ID của học sinh được ghi đè thời gian dừng',
    example: 'stu-uuid-1',
  })
  @IsNotEmpty({ message: 'Mã học sinh không được để trống' })
  @IsString({ message: 'Mã học sinh phải là chuỗi' })
  studentId: string;

  @ApiPropertyOptional({
    enum: RouteDirection,
    description: 'Chiều tuyến áp dụng ghi đè (tùy chọn, bỏ trống áp dụng cả hai chiều)',
    example: RouteDirection.TO_SCHOOL,
  })
  @IsOptional()
  @IsEnum(RouteDirection, { message: 'Chiều tuyến phải là TO_SCHOOL hoặc TO_PARKING' })
  direction?: RouteDirection;

  @ApiProperty({
    description: 'Thời gian dừng đón/trả học sinh tại điểm (giây, từ 10s đến 600s)',
    example: 90,
  })
  @Type(() => Number)
  @IsInt({ message: 'Thời gian dừng phải là số nguyên giây' })
  @Min(10, { message: 'Thời gian dừng tối thiểu là 10 giây' })
  @Max(600, { message: 'Thời gian dừng tối đa là 600 giây (10 phút)' })
  serviceSeconds: number;
}

export class RoutingConstraintsDto {
  @ApiPropertyOptional({
    description: 'Thời gian tối đa hoàn thành một tuyến một chiều (phút, xét tổng driving + stop service + waiting)',
    example: 60,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Thời gian tối đa tuyến phải là số phút hợp lệ' })
  @Min(10, { message: 'Thời gian tối đa tuyến tối thiểu 10 phút' })
  maxRouteDurationMinutes?: number;

  @ApiPropertyOptional({
    description: 'Thời gian dừng xe đón/trả mặc định tại mỗi điểm (giây, mặc định: 60s)',
    default: 60,
    example: 60,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Thời gian dừng mặc định phải là số nguyên giây' })
  @Min(10, { message: 'Thời gian dừng tối thiểu là 10 giây' })
  @Max(300, { message: 'Thời gian dừng tối đa là 300 giây (5 phút)' })
  defaultStopServiceSeconds?: number = 60;

  @ApiPropertyOptional({
    type: [StopServiceOverrideDto],
    description: 'Danh sách ghi đè thời gian dừng riêng cho từng học sinh',
  })
  @IsOptional()
  @IsArray({ message: 'Danh sách ghi đè thời gian dừng phải là mảng' })
  @ValidateNested({ each: true })
  @Type(() => StopServiceOverrideDto)
  stopServiceOverrides?: StopServiceOverrideDto[];

  @ApiPropertyOptional({
    description: 'Giờ đến trường muộn nhất chiều đi (tùy chọn, mặc định lấy từ lịch học trường)',
    example: '07:15',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Giờ đến trường phải đúng định dạng HH:mm (VD: 07:15)',
  })
  latestSchoolArrival?: string;

  @ApiPropertyOptional({
    description: 'Giờ tan trường đón về chiều về (tùy chọn, mặc định lấy từ lịch học trường)',
    example: '16:30',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Giờ đón về phải đúng định dạng HH:mm (VD: 16:30)',
  })
  returnDepartureTime?: string;
}

export class OptimizeRouteDto {
  @ApiProperty({
    description: 'ID trường học áp dụng phương án tuyến',
    example: 'school-uuid-1',
  })
  @IsNotEmpty({ message: 'Mã trường học không được để trống' })
  @IsString({ message: 'Mã trường học phải là chuỗi ký tự' })
  schoolId: string;

  @ApiProperty({
    type: [String],
    description: 'Danh sách ID học sinh tham gia tối ưu (được Admin chọn)',
    example: ['stu-1', 'stu-2'],
  })
  @IsArray({ message: 'Danh sách học sinh phải là một mảng' })
  @IsNotEmpty({ message: 'Vui lòng chọn ít nhất 1 học sinh' })
  studentIds: string[];

  @ApiProperty({
    type: [String],
    description: 'Danh sách ID xe khả dụng do Admin lựa chọn thủ công',
    example: ['veh-1', 'veh-2'],
  })
  @IsArray({ message: 'Danh sách xe phải là một mảng' })
  @IsNotEmpty({ message: 'Vui lòng chọn ít nhất 1 phương tiện' })
  vehicleIds: string[];

  @ApiProperty({
    type: RoutingConstraintsDto,
    description: 'Cấu hình ràng buộc thời gian lập tuyến (thời lượng tối đa, thời gian dừng đón trả)',
  })
  @ValidateNested()
  @Type(() => RoutingConstraintsDto)
  constraints: RoutingConstraintsDto;
}
