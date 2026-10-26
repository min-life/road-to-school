import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateTripAssignmentDto {
  @ApiPropertyOptional({ description: 'Xe khi mở form; khác hiện tại trả 409' })
  @IsOptional() @IsString() expectedVehicleId?: string;
  @ApiPropertyOptional({ description: 'Tài xế khi mở form; khác hiện tại trả 409' })
  @IsOptional() @IsString() expectedDriverId?: string;
  @ApiPropertyOptional({ description: 'Giáo viên khi mở form; khác hiện tại trả 409' })
  @IsOptional() @IsString() expectedBusAttendantId?: string;

  @ApiPropertyOptional({
    description: 'ID phương tiện thay thế cho chuyến xe',
    example: 'veh-new-uuid',
  })
  @IsOptional()
  @IsString({ message: 'vehicleId phải là chuỗi' })
  vehicleId?: string;

  @ApiPropertyOptional({
    description: 'ID tài xế thay thế cho chuyến xe',
    example: 'driver-new-uuid',
  })
  @IsOptional()
  @IsString({ message: 'driverId phải là chuỗi' })
  driverId?: string;

  @ApiPropertyOptional({
    description: 'ID giáo viên giám sát thay thế cho chuyến xe',
    example: 'attendant-new-uuid',
  })
  @IsOptional()
  @IsString({ message: 'busAttendantId phải là chuỗi' })
  busAttendantId?: string;

  @ApiPropertyOptional({
    description: 'Lý do thay đổi phân công',
    example: 'Tài xế chính có việc đột xuất',
  })
  @IsOptional()
  @IsString({ message: 'reason phải là chuỗi' })
  reason?: string;
}
