import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RouteDirection, RouteStopType } from '@prisma/client';

export class RouteStopResponseDto {
  @ApiProperty({ example: 'stop-uuid-1' })
  id: string;

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

export class RouteResponseDto {
  @ApiProperty({ example: 'route-uuid-1' })
  id: string;

  @ApiProperty({ example: 'plan-uuid-1' })
  routePlanId: string;

  @ApiPropertyOptional({ example: 'Phương án tuyến THCS Chu Văn An - 2026/2027' })
  routePlanName?: string;

  @ApiProperty({ example: 'school-uuid-1' })
  schoolId: string;

  @ApiPropertyOptional({ example: 'Trường THCS Chu Văn An' })
  schoolName?: string;

  @ApiProperty({ example: 'Tuyến Đi 01' })
  name: string;

  @ApiProperty({ enum: RouteDirection, example: RouteDirection.TO_SCHOOL })
  direction: RouteDirection;

  @ApiPropertyOptional({ example: 'veh-1' })
  proposedVehicleId?: string | null;

  @ApiPropertyOptional({ example: '51B-123.45' })
  proposedVehiclePlate?: string | null;

  @ApiPropertyOptional({ example: 'Hyundai Solati' })
  proposedVehicleBrand?: string | null;

  @ApiPropertyOptional({ example: 16 })
  proposedVehicleSeats?: number | null;

  @ApiPropertyOptional({ example: 'driver-uuid-1' })
  defaultDriverId?: string | null;

  @ApiPropertyOptional({ example: 'Nguyễn Văn Lái' })
  defaultDriverName?: string | null;

  @ApiPropertyOptional({ example: '0901234567' })
  defaultDriverPhone?: string | null;

  @ApiPropertyOptional({ example: 'attendant-uuid-1' })
  defaultBusAttendantId?: string | null;

  @ApiPropertyOptional({ example: 'Trần Thị Cô' })
  defaultBusAttendantName?: string | null;

  @ApiPropertyOptional({ example: '0909888777' })
  defaultBusAttendantPhone?: string | null;

  @ApiProperty({ example: 18200 })
  totalDistanceMeters: number;

  @ApiProperty({ example: 2280 })
  estimatedDurationSeconds: number;

  @ApiPropertyOptional({ example: '06:20' })
  departureTime?: string | null;

  @ApiPropertyOptional({ example: '07:05' })
  arrivalTime?: string | null;

  @ApiProperty({ example: 'encoded_polyline_geometry' })
  polylineGeometry: string;

  @ApiPropertyOptional({ example: 'DRAFT' })
  status?: string;

  @ApiProperty({ example: 'DRAFT' })
  planStatus?: string;

  @ApiProperty({ example: 14 })
  studentCount?: number;

  @ApiPropertyOptional({ type: [RouteStopResponseDto] })
  stops?: RouteStopResponseDto[];

  @ApiPropertyOptional({
    description: 'Bảng giờ xuất phát và kết thúc suy ra từ lịch học tuần của trường',
    example: { monday: { departureTime: '06:20', arrivalTime: '07:15' } },
  })
  derivedWeeklySchedule?: Record<string, { departureTime: string; arrivalTime: string }>;

  @ApiPropertyOptional({
    description: 'Vị trí bãi xe theo snapshot của tuyến',
    example: { latitude: 10.855, longitude: 106.785, addressText: 'Bãi xe trung tâm' },
  })
  parkingLocation?: { latitude: number; longitude: number; addressText: string };

  @ApiPropertyOptional({
    description: 'Vị trí trường học theo snapshot của tuyến',
    example: { latitude: 10.852, longitude: 106.788, name: 'Trường Tiểu Học FPT' },
  })
  schoolLocation?: { latitude: number; longitude: number; name: string };
}
