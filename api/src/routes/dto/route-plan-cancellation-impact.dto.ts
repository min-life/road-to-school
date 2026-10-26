import { ApiProperty } from '@nestjs/swagger';
import { RoutePlanStatus } from '@prisma/client';

export class RoutePlanCancellationImpactDto {
  @ApiProperty({ description: 'ID phương án tuyến' })
  planId: string;

  @ApiProperty({ description: 'Tên phương án tuyến' })
  planName: string;

  @ApiProperty({ description: 'Trạng thái hiện tại của phương án', enum: RoutePlanStatus })
  status: RoutePlanStatus;

  @ApiProperty({ description: 'ID trường học' })
  schoolId: string;

  @ApiProperty({ description: 'Tên trường học' })
  schoolName: string;

  @ApiProperty({ description: 'Số lượng chuyến xe SCHEDULED sẽ bị hủy' })
  scheduledTripsCount: number;

  @ApiProperty({ description: 'Số lượng chuyến xe IN_PROGRESS được bảo lưu' })
  inProgressTripsCount: number;

  @ApiProperty({ description: 'Số lượng chuyến xe COMPLETED trong lịch sử' })
  completedTripsCount: number;

  @ApiProperty({ description: 'Số tuyến xe trong phương án' })
  routesCount: number;

  @ApiProperty({ description: 'Số lượng xe phân công bị giải phóng' })
  assignedVehiclesCount: number;

  @ApiProperty({ description: 'Số lượng tài xế phân công bị giải phóng' })
  assignedDriversCount: number;

  @ApiProperty({ description: 'Số lượng giáo viên phụ xe phân công bị giải phóng' })
  assignedBusAttendantsCount: number;

  @ApiProperty({ description: 'Fingerprint trạng thái hiện tại để kiểm tra xung đột' })
  expectedFingerprint: string;
}
