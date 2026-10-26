import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RouteDirection, RoutePlanStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsOptional, IsIn, ValidateNested } from 'class-validator';
import { RoutingConstraintsDto } from '../../routes/dto/optimize-route.dto.js';

export class StudentAddressRoutingPreviewDto {
  @ApiPropertyOptional({
    description: 'Hai tiêu chí tối ưu ghi đè: maxRouteDurationMinutes và defaultStopServiceSeconds',
    type: RoutingConstraintsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RoutingConstraintsDto)
  routingConstraints?: RoutingConstraintsDto;
}

export class RouteFeasibilityItemDto {
  @ApiProperty({ description: 'ID tuyến xe' })
  routeId: string;

  @ApiProperty({ description: 'Tên tuyến xe' })
  routeName: string;

  @ApiProperty({ description: 'Chiều di chuyển', enum: RouteDirection })
  direction: RouteDirection;

  @ApiPropertyOptional({ description: 'ID phương án tuyến' })
  @IsOptional()
  planId?: string;

  @ApiPropertyOptional({ description: 'Trạng thái phương án tuyến', enum: RoutePlanStatus })
  @IsOptional()
  planStatus?: RoutePlanStatus;

  @ApiProperty({ description: 'Trạng thái khả thi', enum: ['FEASIBLE', 'INFEASIBLE', 'UNAVAILABLE'] })
  status: 'FEASIBLE' | 'INFEASIBLE' | 'UNAVAILABLE';

  @ApiProperty({ description: 'Trạng thái khả thi (alias status)', enum: ['FEASIBLE', 'INFEASIBLE', 'UNAVAILABLE'] })
  feasibility: 'FEASIBLE' | 'INFEASIBLE' | 'UNAVAILABLE';

  @ApiPropertyOptional({ description: 'Lý do nếu không khả thi hoặc lỗi dịch vụ' })
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'Lý do nếu không khả thi (alias reason)' })
  @IsOptional()
  infeasibilityReason?: string;

  @ApiProperty({ description: 'Tổng số học sinh trên tuyến' })
  totalStudents: number;

  @ApiProperty({ description: 'Thời gian di chuyển cũ (giây)' })
  oldDurationSeconds: number;

  @ApiProperty({ description: 'Thời gian di chuyển mới (giây)' })
  newDurationSeconds: number;

  @ApiProperty({ description: 'Quãng đường cũ (mét)' })
  oldDistanceMeters: number;

  @ApiProperty({ description: 'Quãng đường mới (mét)' })
  newDistanceMeters: number;

  @ApiPropertyOptional({ description: 'Polyline geometry mới' })
  @IsOptional()
  newPolylineGeometry?: string;

  @ApiPropertyOptional({ description: 'Thời gian đến/đón dự kiến mới tại điểm dừng học sinh (HH:mm)' })
  @IsOptional()
  newPlannedArrivalTime?: string;
}

export class StudentAddressRoutingPreviewResponseDto {
  @ApiProperty({ description: 'Opaque preview token có TTL (10 phút)', required: false })
  previewToken: string | null;

  @ApiProperty({ description: 'Tất cả các tuyến đều khả thi hay không' })
  allFeasible: boolean;

  @ApiProperty({ description: 'Trạng thái khả thi tổng quan (FEASIBLE | INFEASIBLE | UNAVAILABLE)', enum: ['FEASIBLE', 'INFEASIBLE', 'UNAVAILABLE'] })
  overallFeasibility: 'FEASIBLE' | 'INFEASIBLE' | 'UNAVAILABLE';

  @ApiProperty({ description: 'Có ít nhất một tuyến bất khả thi' })
  hasInfeasible: boolean;

  @ApiProperty({ description: 'Có lỗi dịch vụ kết nối (UNAVAILABLE)' })
  hasUnavailable: boolean;

  @ApiProperty({ description: 'Danh sách kết quả từng tuyến', type: [RouteFeasibilityItemDto] })
  routes: RouteFeasibilityItemDto[];

  @ApiProperty({ description: 'Số chuyến xe SCHEDULED dự kiến sẽ được cập nhật' })
  scheduledTripsToRefreshCount: number;

  @ApiProperty({ description: 'Số chuyến xe SCHEDULED dự kiến sẽ được cập nhật (alias)' })
  affectedScheduledTripsCount: number;

  @ApiProperty({ description: 'Số chuyến xe đã Ready hoặc đang chạy giữ nguyên dữ liệu cũ' })
  frozenTripsCount: number;

  @ApiProperty({ description: 'Số chuyến xe đã Ready hoặc đang chạy giữ nguyên dữ liệu cũ (alias)' })
  preservedTripsCount: number;

  @ApiProperty({ description: 'Fingerprint trạng thái ban đầu để revalidate khi xác nhận' })
  expectedFingerprint: string;
}

export class ApproveAddressRequestDto {
  @ApiPropertyOptional({
    description: 'Quyết định phê duyệt (DIRECT_UPDATE | REOPTIMIZED | REMOVED_FROM_ROUTES)',
    enum: ['DIRECT_UPDATE', 'REOPTIMIZED', 'REMOVED_FROM_ROUTES'],
  })
  @IsOptional()
  @IsIn(['DIRECT_UPDATE', 'REOPTIMIZED', 'REMOVED_FROM_ROUTES'], {
    message: 'Quyết định phải là DIRECT_UPDATE, REOPTIMIZED hoặc REMOVED_FROM_ROUTES',
  })
  decision?: 'DIRECT_UPDATE' | 'REOPTIMIZED' | 'REMOVED_FROM_ROUTES';

  @ApiPropertyOptional({
    description: 'Quyết định phê duyệt (alias của decision)',
    enum: ['DIRECT_UPDATE', 'REOPTIMIZED', 'REMOVED_FROM_ROUTES'],
  })
  @IsOptional()
  @IsIn(['DIRECT_UPDATE', 'REOPTIMIZED', 'REMOVED_FROM_ROUTES'], {
    message: 'resolutionOutcome phải là DIRECT_UPDATE, REOPTIMIZED hoặc REMOVED_FROM_ROUTES',
  })
  resolutionOutcome?: 'DIRECT_UPDATE' | 'REOPTIMIZED' | 'REMOVED_FROM_ROUTES';

  @ApiPropertyOptional({
    description: 'Mã previewToken bắt buộc khi quyết định là REOPTIMIZED',
  })
  @IsOptional()
  @IsString()
  previewToken?: string;

  @ApiPropertyOptional({
    description: 'Fingerprint kỳ vọng chống xung đột',
  })
  @IsOptional()
  @IsString()
  expectedFingerprint?: string;
}
