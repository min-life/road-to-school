import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { Role } from '@prisma/client';
import { AffectedRouteItemDto, AffectedTripItemDto } from '../../vehicles/dto/vehicle-status.dto.js';

export class EmployeeDeactivationImpactDto {
  @ApiProperty({ example: 'uuid-v4' })
  employeeId: string;

  @ApiProperty({ example: 'uuid-v4' })
  schoolId: string;

  @ApiProperty({ example: 'Cô Hoàng Thị Mai' })
  fullName: string;

  @ApiProperty({ enum: Role, example: Role.BUS_ATTENDANT })
  role: Role;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 1, description: 'Số lượng tuyến ACTIVE đang gán nhân sự này làm mặc định' })
  defaultRoutesCount: number;

  @ApiProperty({ example: 4, description: 'Số chuyến xe SCHEDULED đang phân công cho nhân sự này' })
  scheduledTripsCount: number;

  @ApiProperty({ example: 0, description: 'Số chuyến xe IN_PROGRESS nhân sự đang phụ trách (chặn deactivation)' })
  inProgressTripsCount: number;

  @ApiProperty({ example: false, description: 'Có thể ngừng hoạt động trực tiếp không cần người thay thế' })
  canDeactivateDirectly: boolean;

  @ApiProperty({ example: false, description: 'Có chuyến IN_PROGRESS chặn thao tác' })
  hasBlockingInProgress: boolean;

  @ApiProperty({ type: [AffectedRouteItemDto] })
  affectedRoutes: AffectedRouteItemDto[];

  @ApiProperty({ type: [AffectedTripItemDto] })
  affectedTrips: AffectedTripItemDto[];
}

export class UpdateEmployeeStatusDto {
  @ApiProperty({ description: 'Trạng thái hoạt động mới của nhân viên trường', example: false })
  @IsBoolean({ message: 'Trạng thái hoạt động phải là kiểu boolean' })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'ID của nhân viên thay thế cùng trường (Bắt buộc nếu isActive=false và còn tuyến hoặc chuyến xe SCHEDULED)',
    example: 'd9b7a489-3cb3-488b-a3d8-5582f6e91bf9',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID nhân sự thay thế phải là UUID v4 hợp lệ' })
  replacementUserId?: string;
}
