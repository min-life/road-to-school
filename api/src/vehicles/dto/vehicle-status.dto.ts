import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class AffectedRouteItemDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'TD01-A7E29F14' })
  name: string;

  @ApiProperty({ example: 'TO_SCHOOL' })
  direction: string;

  @ApiProperty({ example: 'THPT Marie Curie' })
  schoolName: string;

  @ApiProperty({ example: 'uuid-v4' })
  routePlanId: string;

  @ApiProperty({ example: 'Phương án học kỳ 1' })
  routePlanName: string;
}

export class AffectedTripItemDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: '2026-11-04' })
  date: string;

  @ApiProperty({ example: 'TO_SCHOOL' })
  direction: string;

  @ApiProperty({ example: 'SCHEDULED' })
  status: string;

  @ApiProperty({ example: 'TD01-A7E29F14' })
  routeName: string;

  @ApiProperty({ example: 'THPT Marie Curie' })
  schoolName: string;
}

export class VehicleDeactivationImpactDto {
  @ApiProperty({ example: 'uuid-v4' })
  vehicleId: string;

  @ApiProperty({ example: '51B-123.45' })
  licensePlate: string;

  @ApiProperty({ example: 'Hyundai' })
  brand: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 2, description: 'Số lượng tuyến thuộc phương án ACTIVE đang gán xe này' })
  proposedRoutesCount: number;

  @ApiProperty({ example: 4, description: 'Số chuyến xe SCHEDULED đang gán xe này' })
  scheduledTripsCount: number;

  @ApiProperty({ example: 0, description: 'Số chuyến xe IN_PROGRESS đang gán xe này (chặn deactivation)' })
  inProgressTripsCount: number;

  @ApiProperty({ example: false, description: 'Có thể ngừng hoạt động trực tiếp không cần xe thay thế' })
  canDeactivateDirectly: boolean;

  @ApiProperty({ example: false, description: 'Có chuyến IN_PROGRESS chặn thao tác' })
  hasBlockingInProgress: boolean;

  @ApiProperty({ type: [AffectedRouteItemDto] })
  affectedRoutes: AffectedRouteItemDto[];

  @ApiProperty({ type: [AffectedTripItemDto] })
  affectedTrips: AffectedTripItemDto[];
}

export class UpdateVehicleStatusDto {
  @ApiProperty({ description: 'Trạng thái hoạt động mới của phương tiện', example: false })
  @IsBoolean({ message: 'Trạng thái hoạt động phải là kiểu boolean' })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'ID của phương tiện thay thế (Bắt buộc nếu isActive=false và còn tuyến hoặc chuyến xe SCHEDULED)',
    example: 'd9b7a489-3cb3-488b-a3d8-5582f6e91bf9',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID phương tiện thay thế phải là UUID v4 hợp lệ' })
  replacementVehicleId?: string;
}
