import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RouteDirection, RouteStopType } from '@prisma/client';

export class PreviewRouteStopDto {
  @ApiProperty({ example: 1 })
  stopOrder: number;

  @ApiProperty({ enum: RouteStopType, example: RouteStopType.PICKUP })
  stopType: RouteStopType;

  @ApiPropertyOptional({ example: 'stu-1' })
  studentId?: string | null;

  @ApiPropertyOptional({ example: 'Nguyễn Văn An' })
  studentName?: string | null;

  @ApiProperty({ example: '12 Nguyễn Trãi, Phường 2, Quận 5' })
  addressText: string;

  @ApiProperty({ example: 10.755432 })
  latitude: number;

  @ApiProperty({ example: 106.678912 })
  longitude: number;

  @ApiPropertyOptional({ example: 23400 })
  plannedArrivalSeconds?: number | null;

  @ApiPropertyOptional({ example: '06:30' })
  plannedArrivalTime?: string | null;

  @ApiPropertyOptional({ example: 60, description: 'Thời gian dừng đón/trả học sinh (giây)' })
  serviceDurationSeconds?: number;

  @ApiPropertyOptional({ example: 450, description: 'Thời gian tích lũy từ điểm xuất phát của tuyến (giây)' })
  elapsedArrivalSeconds?: number;
}

export class PreviewRouteDto {
  @ApiProperty({ example: 'Tuyến Đi 01' })
  name: string;

  @ApiProperty({ enum: RouteDirection, example: RouteDirection.TO_SCHOOL })
  direction: RouteDirection;

  @ApiProperty({ example: 'veh-1' })
  proposedVehicleId: string;

  @ApiProperty({ example: '51B-123.45' })
  proposedVehiclePlate: string;

  @ApiProperty({ example: 'Hyundai Solati' })
  proposedVehicleBrand: string;

  @ApiProperty({ example: 16 })
  seatCount: number;

  @ApiProperty({ example: 18200 })
  totalDistanceMeters: number;

  @ApiProperty({ example: 2280 })
  estimatedDurationSeconds: number;

  @ApiProperty({ example: '06:20' })
  departureTime: string;

  @ApiProperty({ example: '07:05' })
  arrivalTime: string;

  @ApiProperty({ example: 'encoded_polyline_geometry' })
  polylineGeometry: string;

  @ApiProperty({ example: 14 })
  studentCount: number;

  @ApiProperty({
    type: [Object],
    example: [{ id: 'stu-1', fullName: 'Nguyễn Văn An' }],
  })
  students: { id: string; fullName: string }[];

  @ApiProperty({ type: [PreviewRouteStopDto] })
  stops: PreviewRouteStopDto[];

  @ApiPropertyOptional({
    description: 'Bảng giờ xuất phát và kết thúc suy ra từ lịch học tuần của trường',
    example: { monday: { departureTime: '06:20', arrivalTime: '07:15' } },
  })
  derivedWeeklySchedule?: Record<string, { departureTime: string; arrivalTime: string }>;
}

export class RoutePreviewSummaryDto {
  @ApiProperty({ example: 28 })
  totalSelectedStudents: number;

  @ApiProperty({ example: 28 })
  assignedBothWaysCount: number;

  @ApiProperty({ example: 0 })
  unassignedCount: number;

  @ApiPropertyOptional({ example: 0.89, description: 'Tỷ lệ bao phủ học sinh (assigned / total)' })
  coverageRate?: number;

  @ApiProperty({
    type: [Object],
    example: [{ id: 'stu-99', fullName: 'Lê Văn C', reason: 'Vượt quá thời gian tối đa', missingDirection: 'RETURN' }],
  })
  unassignedStudents: {
    id: string;
    fullName: string;
    reason?: string;
    missingDirection?: 'RETURN' | 'OUTBOUND' | 'BOTH';
    addressText?: string;
  }[];

  @ApiProperty({ example: 0 })
  excludedByAdminCount: number;

  @ApiProperty({ example: 2 })
  outboundVehiclesUsed: number;

  @ApiProperty({ example: 2 })
  returnVehiclesUsed: number;
}

export class RoutePreviewResponseDto {
  @ApiProperty({ example: 'prev_token_123456789' })
  previewToken: string;

  @ApiProperty({ example: 'school-1' })
  schoolId: string;

  @ApiProperty({ example: 'Trường THCS Chu Văn An' })
  schoolName: string;

  @ApiProperty({ type: [PreviewRouteDto] })
  outboundRoutes: PreviewRouteDto[];

  @ApiProperty({ type: [PreviewRouteDto] })
  returnRoutes: PreviewRouteDto[];

  @ApiProperty({ type: RoutePreviewSummaryDto })
  summary: RoutePreviewSummaryDto;
}
