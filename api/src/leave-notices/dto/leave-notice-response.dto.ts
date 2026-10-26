import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeaveNoticeKind, LeaveNoticeStatus, RouteDirection } from '@prisma/client';

export class LeaveNoticeResponseDto {
  @ApiProperty({ example: 'notice-uuid-1' })
  id: string;

  @ApiProperty({ example: 'trip-uuid-1' })
  tripId: string;

  @ApiProperty({ enum: LeaveNoticeKind, example: LeaveNoticeKind.STUDENT })
  kind: LeaveNoticeKind;

  @ApiProperty({ enum: LeaveNoticeStatus, example: LeaveNoticeStatus.RECORDED })
  status: LeaveNoticeStatus;

  @ApiProperty({ example: 'user-uuid-1' })
  reportedById: string;

  @ApiProperty({ example: 'Nguyễn Văn Cha' })
  reportedByName: string;

  @ApiPropertyOptional({ example: 'stu-uuid-1', nullable: true })
  studentId?: string | null;

  @ApiPropertyOptional({ example: 'Nguyễn Văn An', nullable: true })
  studentName?: string | null;

  @ApiProperty({ example: '2026-10-27' })
  serviceDate: string;

  @ApiProperty({ enum: RouteDirection, example: RouteDirection.TO_SCHOOL })
  direction: RouteDirection;

  @ApiProperty({ example: 'route-uuid-1' })
  routeId: string;

  @ApiProperty({ example: 'Tuyến Đi 01' })
  routeName: string;

  @ApiProperty({ example: 'school-uuid-1' })
  schoolId: string;

  @ApiProperty({ example: 'Trường Tiểu Học FPT' })
  schoolName: string;

  @ApiPropertyOptional({ example: '06:15', nullable: true })
  scheduledStartTime?: string | null;

  @ApiPropertyOptional({ example: '07:10', nullable: true })
  scheduledEndTime?: string | null;

  @ApiPropertyOptional({ example: 'user-uuid-2', nullable: true })
  replacementUserId?: string | null;

  @ApiPropertyOptional({ example: 'Trần Văn Lái Mới', nullable: true })
  replacementUserName?: string | null;

  @ApiPropertyOptional({ example: 'admin-uuid-1', nullable: true })
  processedById?: string | null;

  @ApiPropertyOptional({ example: 'Admin Quản Trị', nullable: true })
  processedByName?: string | null;

  @ApiPropertyOptional({ example: '2026-10-26T10:00:00.000Z', nullable: true })
  processedAt?: string | null;

  @ApiPropertyOptional({ example: '2026-10-26T10:00:00.000Z', nullable: true })
  cancelledAt?: string | null;

  @ApiProperty({ example: '2026-10-26T08:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: true })
  canCancelLeave: boolean;

  @ApiProperty({ example: false })
  canAssignReplacement: boolean;

  @ApiProperty({ example: false })
  canCancelTrip: boolean;

  @ApiPropertyOptional({ example: null, nullable: true })
  disabledReason?: string | null;
}

export class LeaveNoticeListResponseDto {
  @ApiProperty({ type: [LeaveNoticeResponseDto] })
  items: LeaveNoticeResponseDto[];

  @ApiProperty({ example: 25 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 2 })
  totalPages: number;
}
