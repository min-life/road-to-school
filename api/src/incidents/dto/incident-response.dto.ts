import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TripIncidentType, TripIncidentStatus, RouteDirection } from '@prisma/client';

export class TripIncidentResponseDto {
  @ApiProperty({ example: 'incident-uuid-1' })
  id: string;

  @ApiProperty({ example: 'trip-uuid-1' })
  tripId: string;

  @ApiProperty({ enum: TripIncidentType, example: TripIncidentType.ATTENDANT_MISSING })
  type: TripIncidentType;

  @ApiProperty({ enum: TripIncidentStatus, example: TripIncidentStatus.WAITING_ASSIGNMENT })
  status: TripIncidentStatus;

  @ApiPropertyOptional({ example: 'user-uuid-1', nullable: true })
  reportedById?: string | null;

  @ApiPropertyOptional({ example: 'Trần Văn Lái', nullable: true })
  reportedByName?: string | null;

  @ApiPropertyOptional({ example: 'DRIVER', nullable: true })
  reportedByRole?: string | null;

  @ApiPropertyOptional({ example: 'Giáo viên phụ xe chưa tới', nullable: true })
  description?: string | null;

  @ApiPropertyOptional({ description: 'Bằng chứng ngữ cảnh lúc phát hiện', nullable: true })
  context?: any | null;

  @ApiPropertyOptional({ example: 'admin-uuid-1', nullable: true })
  processedById?: string | null;

  @ApiPropertyOptional({ example: 'Lê Văn Quản Trị', nullable: true })
  processedByName?: string | null;

  @ApiPropertyOptional({ example: '2026-10-27T06:20:00.000Z', nullable: true })
  processedAt?: string | null;

  @ApiPropertyOptional({ description: 'Kết quả xử lý sự cố', nullable: true })
  resolution?: any | null;

  @ApiProperty({ example: '2026-10-27T06:15:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-10-27T06:20:00.000Z' })
  updatedAt: string;

  // Trip summary fields
  @ApiPropertyOptional({ example: 'route-uuid-1', nullable: true })
  routeId?: string;

  @ApiPropertyOptional({ example: 'Tuyến Đi 01', nullable: true })
  routeName?: string;

  @ApiPropertyOptional({ enum: RouteDirection, example: RouteDirection.TO_SCHOOL, nullable: true })
  direction?: RouteDirection;

  @ApiPropertyOptional({ example: '2026-10-27', nullable: true })
  serviceDate?: string;

  @ApiPropertyOptional({ example: 'school-uuid-1', nullable: true })
  schoolId?: string;

  @ApiPropertyOptional({ example: 'Trường Tiểu Học FPT', nullable: true })
  schoolName?: string;

  @ApiPropertyOptional({ example: '06:30', nullable: true })
  scheduledStartTime?: string | null;

  @ApiPropertyOptional({ example: '07:15', nullable: true })
  scheduledEndTime?: string | null;
}

export class TripIncidentsTabResponseDto {
  @ApiProperty({ type: [TripIncidentResponseDto] })
  items: TripIncidentResponseDto[];

  @ApiProperty({ example: 2 })
  total: number;

  @ApiProperty({ example: 1 })
  pendingCount: number;

  @ApiProperty({ example: 1 })
  resolvedCount: number;
}
