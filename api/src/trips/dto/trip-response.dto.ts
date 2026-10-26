import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RouteDirection, RouteStopType, TripStatus } from '@prisma/client';

export class TripStopResponseDto {
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

  @ApiPropertyOptional({ example: '06:30' })
  plannedArrivalTime?: string | null;

  @ApiPropertyOptional({ example: false })
  isMyChild?: boolean;

  @ApiPropertyOptional({ example: 'PRESENT' })
  attendanceStatus?: string | null;

  @ApiPropertyOptional({ example: 'Phụ huynh báo nghỉ' })
  absenceReason?: string | null;

  @ApiPropertyOptional({ example: '2026-10-26T06:35:12.000Z' })
  attendanceMarkedAt?: string | null;

  @ApiPropertyOptional({ example: '0901234567' })
  guardianPhone?: string | null;
}

export class TripItemResponseDto {
  @ApiProperty({ enum: ['PERSISTED', 'VIRTUAL'], example: 'PERSISTED' })
  type: 'PERSISTED' | 'VIRTUAL';

  @ApiProperty({ example: 'trip-uuid-1' })
  id: string;

  @ApiPropertyOptional({ example: 'trip-uuid-1' })
  tripId?: string | null;

  @ApiProperty({ example: 'route-uuid-1' })
  routeId: string;

  @ApiProperty({ example: 'Tuyến Đi 01' })
  routeName: string;

  @ApiProperty({ example: 'plan-uuid-1' })
  routePlanId: string;

  @ApiProperty({ example: 'Phương án Tiểu Học FPT 2026/2027' })
  routePlanName: string;

  @ApiProperty({ example: 'school-uuid-1' })
  schoolId: string;

  @ApiProperty({ example: 'Trường Tiểu Học FPT' })
  schoolName: string;

  @ApiProperty({ example: '2026-10-26' })
  serviceDate: string;

  @ApiProperty({ example: 'Thứ 2' })
  dayOfWeek: string;

  @ApiProperty({ enum: RouteDirection, example: RouteDirection.TO_SCHOOL })
  direction: RouteDirection;

  @ApiProperty({ example: 'SCHEDULED' })
  status: string;

  @ApiPropertyOptional({ example: '2026-10-25T23:15:00.000Z' })
  scheduledStartAt?: Date | null;

  @ApiPropertyOptional({ example: '2026-10-26T00:10:00.000Z' })
  scheduledEndAt?: Date | null;

  @ApiPropertyOptional({ example: '06:15' })
  scheduledStartTime?: string | null;

  @ApiPropertyOptional({ example: '07:10' })
  scheduledEndTime?: string | null;

  @ApiProperty({ example: '51B-731.33' })
  vehiclePlate: string;

  @ApiPropertyOptional({ example: 'veh-1' })
  vehicleId?: string;

  @ApiPropertyOptional({ example: 'Hyundai Solati' })
  vehicleBrand?: string | null;

  @ApiPropertyOptional({ example: 16 })
  vehicleSeats?: number | null;

  @ApiPropertyOptional({ example: 'driver-1' })
  driverId?: string;

  @ApiProperty({ example: 'Nguyễn Văn Lái' })
  driverName: string;

  @ApiPropertyOptional({ example: '0901234567' })
  driverPhone?: string | null;

  @ApiPropertyOptional({ example: 'attendant-1' })
  busAttendantId?: string;

  @ApiProperty({ example: 'Trần Thị Cô' })
  busAttendantName: string;

  @ApiPropertyOptional({ example: '0909888777' })
  busAttendantPhone?: string | null;

  @ApiProperty({ example: 14 })
  studentCount: number;

  @ApiPropertyOptional({ enum: ['ASSIGNED', 'WAITING_ASSIGNMENT'], example: 'ASSIGNED' })
  assignmentStatus?: 'ASSIGNED' | 'WAITING_ASSIGNMENT';

  @ApiPropertyOptional({ example: true })
  canReportLeave?: boolean;
}

export class TripListResponseDto {
  @ApiProperty({ type: [TripItemResponseDto] })
  items: TripItemResponseDto[];

  @ApiProperty({ example: 35 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 4 })
  totalPages: number;
}

export class TripDetailResponseDto extends TripItemResponseDto {
  @ApiProperty({ example: 'encoded_polyline_geometry' })
  polylineGeometry: string;

  @ApiProperty({ example: 18200 })
  totalDistanceMeters: number;

  @ApiProperty({ example: 2280 })
  estimatedDurationSeconds: number;

  @ApiPropertyOptional({ type: [TripStopResponseDto] })
  stops: TripStopResponseDto[];

  @ApiPropertyOptional({
    example: { latitude: 10.855, longitude: 106.785, addressText: 'Bãi xe trung tâm' },
  })
  parkingLocation?: { latitude: number; longitude: number; addressText: string };

  @ApiPropertyOptional({
    example: { latitude: 10.852, longitude: 106.788, name: 'Trường Tiểu Học FPT' },
  })
  schoolLocation?: { latitude: number; longitude: number; name: string };

  @ApiPropertyOptional({ example: false })
  isAttendantReady?: boolean;

  @ApiPropertyOptional({ example: '2026-10-26T06:18:00.000Z' })
  attendantReadyAt?: Date | null;

  @ApiPropertyOptional({ example: '2026-10-26T06:28:00.000Z' })
  actualStartTime?: Date | null;

  @ApiPropertyOptional({ example: '2026-10-26T07:15:00.000Z' })
  actualEndTime?: Date | null;
}
