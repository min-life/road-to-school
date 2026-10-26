import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { AttendanceStatus, TripStatus, RouteDirection } from '@prisma/client';

export class MarkAttendanceDto {
  @ApiProperty({
    enum: AttendanceStatus,
    description: 'Trạng thái điểm danh (UNMARKED, PRESENT, ABSENT)',
    example: 'PRESENT',
  })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiPropertyOptional({
    description: 'Lý do vắng mặt (Bắt buộc khi status = ABSENT)',
    example: 'Phụ huynh báo nghỉ ốm',
  })
  @ValidateIf((o) => o.status === AttendanceStatus.ABSENT)
  @IsNotEmpty({ message: 'Lý do vắng mặt không được để trống khi học sinh vắng' })
  @IsString()
  @MaxLength(500, { message: 'Lý do vắng mặt tối đa 500 ký tự' })
  absenceReason?: string;
}

export class UpdateAlightingDto {
  @ApiProperty({
    description: 'Trạng thái học sinh đã xuống xe (true: đã xuống, false: hoàn tác chưa xuống)',
    example: true,
  })
  @IsBoolean()
  isAlighted: boolean;
}

export class UpdateAlightingResponseDto {
  @ApiProperty({ example: 'Cập nhật trạng thái xuống xe thành công' })
  message: string;

  @ApiPropertyOptional({ example: '2026-10-26T07:15:00.000Z' })
  alightedAt?: string | null;

  @ApiProperty({ example: true })
  isAlighted: boolean;
}

export class ArriveAtSchoolResponseDto {
  @ApiProperty({ example: 'Xác nhận đến trường thành công' })
  message: string;

  @ApiProperty({ example: '2026-10-26T07:10:00.000Z' })
  arrivedAtSchoolAt: string;
}

export class VerifyQrDto {
  @ApiProperty({
    description: 'Mã QR quét được từ thẻ học sinh (Student.code)',
    example: 'HS-2026-0001',
  })
  @IsNotEmpty({ message: 'Mã QR học sinh không được để trống' })
  @IsString()
  qrData: string;
}

export class VerifyQrResponseDto {
  @ApiProperty({ example: 'uuid-student-01' })
  studentId: string;

  @ApiProperty({ example: 'HS-2026-0001' })
  studentCode: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  fullName: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  avatarUrl?: string | null;

  @ApiProperty({ example: 2 })
  stopOrder: number;

  @ApiProperty({ example: '123 Điện Biên Phủ, P.15, Bình Thạnh' })
  addressText: string;

  @ApiProperty({ enum: AttendanceStatus, example: 'UNMARKED' })
  currentStatus: AttendanceStatus;

  @ApiPropertyOptional({ example: null })
  absenceReason?: string | null;
}

export class TripAttendanceStudentItemDto {
  @ApiProperty({ example: 'uuid-student-01' })
  studentId: string;

  @ApiProperty({ example: 'HS-2026-0001' })
  studentCode: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  fullName: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  avatarUrl?: string | null;

  @ApiProperty({ example: 2 })
  stopOrder: number;

  @ApiProperty({ example: '123 Điện Biên Phủ, P.15, Bình Thạnh' })
  addressText: string;

  @ApiPropertyOptional({ example: '06:45' })
  plannedArrivalTime?: string | null;

  @ApiProperty({ enum: AttendanceStatus, example: 'PRESENT' })
  status: AttendanceStatus;

  @ApiPropertyOptional({ example: null })
  absenceReason?: string | null;

  @ApiPropertyOptional({ example: 'uuid-attendant-01' })
  markedById?: string | null;

  @ApiPropertyOptional({ example: 'Trần Thị B' })
  markedByName?: string | null;

  @ApiPropertyOptional({ example: '2026-10-26T06:35:12.000Z' })
  markedAt?: string | null;

  @ApiPropertyOptional({ example: '2026-10-26T07:12:00.000Z' })
  alightedAt?: string | null;

  @ApiProperty({ example: false })
  isAlighted: boolean;
}

export class TripAttendanceListResponseDto {
  @ApiProperty({ example: 'uuid-trip-01' })
  tripId: string;

  @ApiProperty({ example: 15 })
  totalStudents: number;

  @ApiProperty({ example: 12 })
  markedCount: number;

  @ApiProperty({ example: 11 })
  presentCount: number;

  @ApiProperty({ example: 1 })
  absentCount: number;

  @ApiProperty({ example: 3 })
  unmarkedCount: number;

  @ApiProperty({ example: false })
  isAllMarked: boolean;

  @ApiProperty({ example: 8 })
  alightedCount: number;

  @ApiProperty({ example: 3 })
  pendingAlightCount: number;

  @ApiProperty({ example: false })
  isAllAlighted: boolean;

  @ApiProperty({ type: [TripAttendanceStudentItemDto] })
  students: TripAttendanceStudentItemDto[];
}

export class ParentTripChildStateDto {
  @ApiProperty() studentId: string;
  @ApiProperty({ enum: AttendanceStatus }) attendanceStatus: AttendanceStatus;
  @ApiPropertyOptional({ nullable: true }) absenceReason?: string | null;
  @ApiPropertyOptional({ nullable: true }) markedAt?: string | null;
  @ApiPropertyOptional({ nullable: true }) alightedAt?: string | null;
  @ApiProperty() isAlighted: boolean;
}

export class OperationalStateResponseDto {
  @ApiProperty({ type: [ParentTripChildStateDto], description: "Chỉ các con thuộc roster được liên kết với Parent; rỗng với role khác." })
  children: ParentTripChildStateDto[];
  @ApiProperty({ example: 'uuid-trip-01' })
  tripId: string;

  @ApiProperty({ enum: TripStatus, example: 'SCHEDULED' })
  status: TripStatus;

  @ApiProperty({ enum: RouteDirection, example: 'TO_SCHOOL' })
  direction: RouteDirection;

  @ApiPropertyOptional({ example: false })
  isAttendantReady?: boolean;

  @ApiPropertyOptional({ example: null })
  attendantReadyAt?: string | null;

  @ApiPropertyOptional({ example: null })
  actualStartTime?: string | null;

  @ApiPropertyOptional({ example: null })
  actualEndTime?: string | null;

  @ApiPropertyOptional({ example: null })
  arrivedAtSchoolAt?: string | null;

  @ApiProperty({ example: false })
  isSchoolArrived: boolean;

  @ApiPropertyOptional({ example: 15 })
  totalStudents?: number;

  @ApiPropertyOptional({ example: 0 })
  markedCount?: number;

  @ApiPropertyOptional({ example: 0 })
  presentCount?: number;

  @ApiPropertyOptional({ example: 0 })
  absentCount?: number;

  @ApiPropertyOptional({ example: 15 })
  unmarkedCount?: number;

  @ApiPropertyOptional({ example: false })
  isAllMarked?: boolean;

  @ApiPropertyOptional({ example: 0 })
  alightedCount?: number;

  @ApiPropertyOptional({ example: 0 })
  pendingAlightCount?: number;

  @ApiPropertyOptional({ example: false })
  isAllAlighted?: boolean;

  @ApiPropertyOptional({ example: false })
  canDriverStart?: boolean;

  @ApiPropertyOptional({ example: false })
  canStartTrip?: boolean;

  @ApiPropertyOptional({ example: false })
  canArriveAtSchool?: boolean;

  @ApiPropertyOptional({ example: false })
  canDriverComplete?: boolean;

  @ApiPropertyOptional({ example: false })
  canCompleteTrip?: boolean;

  @ApiPropertyOptional({ example: true })
  canAttendantReady?: boolean;

  @ApiPropertyOptional({ example: true })
  canMarkReady?: boolean;

  @ApiPropertyOptional({ example: 'WAITING_FOR_ATTENDANT' })
  startDisabledReason?: string | null;

  @ApiPropertyOptional({ example: null })
  arriveAtSchoolDisabledReason?: string | null;

  @ApiPropertyOptional({ example: 'PENDING_ATTENDANCE' })
  completeDisabledReason?: string | null;

  @ApiPropertyOptional({ example: null })
  readyDisabledReason?: string | null;

  @ApiPropertyOptional({
    example: {
      ready: null,
      start: 'WAITING_FOR_ATTENDANT',
      arriveAtSchool: null,
      complete: 'PENDING_ATTENDANCE',
    },
  })
  disabledReasons?: {
    ready?: string | null;
    start?: string | null;
    arriveAtSchool?: string | null;
    complete?: string | null;
  };

  @ApiPropertyOptional({ enum: ['ASSIGNED', 'WAITING_ASSIGNMENT'], example: 'ASSIGNED' })
  assignmentStatus?: 'ASSIGNED' | 'WAITING_ASSIGNMENT';

  @ApiPropertyOptional({ example: false })
  hasPendingStaffLeaveNotice?: boolean;

  @ApiPropertyOptional({ example: 0 })
  pendingStaffLeaveNoticeCount?: number;
}

export class MobileHomeTripPersonnelDto {
  @ApiProperty({ example: 'uuid-user-01' })
  id: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  fullName: string;

  @ApiPropertyOptional({ example: '0901234567' })
  phone?: string | null;

  @ApiProperty({ example: true, description: 'True nếu trùng với tài khoản đang đăng nhập' })
  isCurrentUser: boolean;
}

export class MobileHomeTripDto {
  @ApiProperty({ example: 'uuid-trip-01' })
  id: string;

  @ApiProperty({ example: 'uuid-route-01' })
  routeId: string;

  @ApiProperty({ example: 'Tuyến Đi 01 (36B52942)' })
  routeName: string;

  @ApiProperty({ enum: RouteDirection, example: 'TO_SCHOOL' })
  direction: RouteDirection;

  @ApiProperty({ example: 'THCS Lê Quý Đôn' })
  schoolName: string;

  @ApiProperty({ example: '2026-10-26' })
  serviceDate: string;

  @ApiPropertyOptional({ example: '06:30' })
  scheduledStartTime?: string | null;

  @ApiPropertyOptional({ example: '07:15' })
  scheduledEndTime?: string | null;

  @ApiProperty({ example: '06:30 - 07:15' })
  scheduledTime: string;

  @ApiProperty({ enum: TripStatus, example: 'SCHEDULED' })
  status: TripStatus;

  @ApiProperty({ example: '51B-123.45' })
  vehiclePlate: string;

  @ApiProperty({ example: 'Ford Transit' })
  vehicleBrand: string;

  @ApiProperty({ example: 16 })
  vehicleSeats: number;

  @ApiProperty({ example: 15 })
  studentCount: number;

  @ApiProperty({ example: 'encoded_polyline_geometry' })
  polylineGeometry: string;

  @ApiProperty({ type: MobileHomeTripPersonnelDto })
  driver: MobileHomeTripPersonnelDto;

  @ApiProperty({ type: MobileHomeTripPersonnelDto })
  busAttendant: MobileHomeTripPersonnelDto;

  @ApiProperty({ type: OperationalStateResponseDto })
  operationalState: OperationalStateResponseDto;

  @ApiPropertyOptional({ enum: ['ASSIGNED', 'WAITING_ASSIGNMENT'], example: 'ASSIGNED' })
  assignmentStatus?: 'ASSIGNED' | 'WAITING_ASSIGNMENT';

  @ApiPropertyOptional({ example: true })
  canReportLeave?: boolean;

  @ApiPropertyOptional({ example: null })
  leaveNoticeId?: string | null;
}

export class HomeTripResponseDto {
  @ApiProperty({ example: true })
  hasTrip: boolean;

  @ApiPropertyOptional({ type: MobileHomeTripDto })
  trip?: MobileHomeTripDto | null;
}

export class ParentHomeCardItemDto {
  @ApiProperty({ example: 'uuid-student-01' })
  studentId: string;

  @ApiProperty({ example: 'Nguyễn Văn C' })
  studentName: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  studentAvatar?: string | null;

  @ApiProperty({ example: 'THCS Lê Quý Đôn' })
  schoolName: string;

  @ApiProperty({ example: 'uuid-trip-01' })
  tripId: string;

  @ApiProperty({ example: 'Tuyến Đi 01' })
  routeName: string;

  @ApiProperty({ enum: RouteDirection, example: 'TO_SCHOOL' })
  direction: RouteDirection;

  @ApiProperty({ example: '2026-10-26' })
  serviceDate: string;

  @ApiProperty({ example: '06:30 - 07:15' })
  scheduledTime: string;

  @ApiProperty({ enum: TripStatus, example: 'IN_PROGRESS' })
  tripStatus: TripStatus;

  @ApiProperty({ example: '51B-123.45' })
  vehiclePlate: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  driverName: string;

  @ApiProperty({ enum: AttendanceStatus, example: 'PRESENT' })
  attendanceStatus: AttendanceStatus;

  @ApiPropertyOptional({ example: '2026-10-26T06:35:12.000Z' })
  markedAt?: string | null;

  @ApiProperty({ example: false })
  childIsAlighted: boolean;

  @ApiPropertyOptional({ example: null })
  childAlightedAt?: string | null;

  @ApiPropertyOptional({ example: null })
  absenceReason?: string | null;

  @ApiPropertyOptional({ example: true })
  canReportLeave?: boolean;

  @ApiPropertyOptional({ example: false })
  hasLeaveNotice?: boolean;

  @ApiPropertyOptional({ example: null })
  leaveNoticeId?: string | null;
}

export class ParentHomeCardsResponseDto {
  @ApiProperty({ type: [ParentHomeCardItemDto] })
  items: ParentHomeCardItemDto[];
}
