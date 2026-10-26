import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RouteDirection } from '@prisma/client';
import { TripStopResponseDto } from './trip-response.dto.js';

export class MobileTripItemDto {
  @ApiProperty({ example: 'trip-uuid-1' })
  id: string;

  @ApiProperty({ example: false })
  isVirtual: boolean;

  @ApiProperty({ enum: ['PERSISTED', 'VIRTUAL'], example: 'PERSISTED' })
  type: 'PERSISTED' | 'VIRTUAL';

  @ApiPropertyOptional({ example: 'route-uuid-1' })
  routeId?: string;

  @ApiProperty({ example: 'Tuyến Đi 01' })
  routeName: string;

  @ApiProperty({ enum: RouteDirection, example: RouteDirection.TO_SCHOOL })
  direction: RouteDirection;

  @ApiProperty({ example: 'Trường Tiểu Học FPT' })
  schoolName: string;

  @ApiPropertyOptional({ example: '06:15' })
  scheduledStartTime?: string | null;

  @ApiPropertyOptional({ example: '07:10' })
  scheduledEndTime?: string | null;

  @ApiProperty({ example: '06:15 - 07:10' })
  scheduledTime: string;

  @ApiProperty({ example: '51B-731.33' })
  vehiclePlate: string;

  @ApiPropertyOptional({ example: 'Ford Transit 16 chỗ' })
  vehicleBrand?: string;

  @ApiPropertyOptional({ example: 'Nguyễn Văn Lái' })
  driverName?: string;

  @ApiPropertyOptional({ example: 'Trần Thị Cô' })
  busAttendantName?: string;

  @ApiProperty({ example: 14 })
  studentCount: number;

  @ApiProperty({ example: 'SCHEDULED' })
  status: string;

  @ApiProperty({ example: '2026-10-26' })
  serviceDate: string;

  @ApiPropertyOptional({ enum: ['ASSIGNED', 'WAITING_ASSIGNMENT'], example: 'ASSIGNED' })
  assignmentStatus?: 'ASSIGNED' | 'WAITING_ASSIGNMENT';

  @ApiPropertyOptional({ example: true })
  canReportLeave?: boolean;
}

export class MobileScheduleListResponseDto {
  @ApiProperty({ type: [MobileTripItemDto] })
  items: MobileTripItemDto[];
}

export class MobileParentScheduleResponseDto {
  @ApiProperty({ example: 'stu-1' })
  studentId: string;

  @ApiProperty({ example: 'Nguyễn Văn An' })
  studentName: string;

  @ApiProperty({ example: '2026-10-26' })
  selectedDate: string;

  @ApiProperty({ type: [MobileTripItemDto] })
  trips: MobileTripItemDto[];

  @ApiProperty({ type: [MobileTripItemDto] })
  items: MobileTripItemDto[];
}

