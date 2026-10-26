import { ApiProperty } from '@nestjs/swagger';
import { RoutePlanStatus } from '@prisma/client';

export class ApprovalBlockerDto {
  @ApiProperty({ example: 'MISSING_BUS_ATTENDANT' })
  code: string;

  @ApiProperty({ example: 'route-uuid-1', required: false })
  routeId?: string;

  @ApiProperty({ example: 'Tuyến Đi 01', required: false })
  routeName?: string;

  @ApiProperty({ example: 'Tuyến chưa được gán Giáo viên giám sát mặc định' })
  message: string;
}

export class ApprovalSummaryDto {
  @ApiProperty({ example: 4 })
  totalRoutes: number;

  @ApiProperty({ example: 4 })
  routesWithVehicle: number;

  @ApiProperty({ example: 4 })
  routesWithDriver: number;

  @ApiProperty({ example: 2 })
  routesWithBusAttendant: number;
}

export class ApprovalReadinessResponseDto {
  @ApiProperty({ example: 'plan-uuid-1' })
  routePlanId: string;

  @ApiProperty({ enum: RoutePlanStatus, example: RoutePlanStatus.DRAFT })
  status: RoutePlanStatus;

  @ApiProperty({ example: false })
  isReadyForApproval: boolean;

  @ApiProperty({ type: ApprovalSummaryDto })
  summary: ApprovalSummaryDto;

  @ApiProperty({ type: [ApprovalBlockerDto] })
  blockers: ApprovalBlockerDto[];
}
