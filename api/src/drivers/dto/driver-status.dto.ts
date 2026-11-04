import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { AffectedRouteItemDto, AffectedTripItemDto } from '../../vehicles/dto/vehicle-status.dto.js';

export class DriverDeactivationImpactDto {
  @ApiProperty({ example: 'uuid-v4' })
  driverId: string;

  @ApiProperty({ example: 'Nguyễn Văn Tài' })
  fullName: string;

  @ApiProperty({ example: 'tai.nv@roadtoschool.vn', nullable: true })
  email: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 2, description: 'Số lượng tuyến ACTIVE đang gán tài xế này làm mặc định' })
  defaultRoutesCount: number;

  @ApiProperty({ example: 5, description: 'Số chuyến xe SCHEDULED đang phân công cho tài xế này' })
  scheduledTripsCount: number;

  @ApiProperty({ example: 0, description: 'Số chuyến xe IN_PROGRESS tài xế đang lái (chặn deactivation)' })
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

export class UpdateDriverStatusDto {
  @ApiProperty({ description: 'Trạng thái hoạt động mới của tài xế', example: false })
  @IsBoolean({ message: 'Trạng thái hoạt động phải là kiểu boolean' })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'ID của tài xế thay thế (Bắt buộc nếu isActive=false và còn tuyến hoặc chuyến xe SCHEDULED)',
    example: 'd9b7a489-3cb3-488b-a3d8-5582f6e91bf9',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID tài xế thay thế phải là UUID v4 hợp lệ' })
  replacementUserId?: string;
}
