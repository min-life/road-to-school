import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RequestType, RequestStatus } from '@prisma/client';

export class RequestOtpResponseDto {
  @ApiProperty({ example: 'uuid-challenge-id' })
  challengeId: string;

  @ApiProperty({ example: '091****678' })
  maskedPhone: string;

  @ApiProperty({ example: 300 })
  expiresInSeconds: number;

  @ApiProperty({ example: 'Mã xác thực đã được gửi đến số điện thoại người giám hộ' })
  message: string;
}

export class StudentUpdateRequestDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'uuid-student-id' })
  studentId: string;

  @ApiProperty({ example: 'Nguyễn Văn An' })
  studentName: string;

  @ApiProperty({ example: 'STU9N83CX82' })
  studentCode: string;

  @ApiProperty({ example: 'uuid-parent-id' })
  parentId: string;

  @ApiProperty({ example: 'Trần Văn Phụ Huynh' })
  parentName: string;

  @ApiProperty({ example: 'uuid-school-id' })
  schoolId: string;

  @ApiProperty({ example: 'Tiểu học Chu Văn An' })
  schoolName: string;

  @ApiProperty({ enum: RequestType, example: RequestType.INFORMATION_UPDATE })
  type: RequestType;

  @ApiProperty({ enum: RequestStatus, example: RequestStatus.PENDING })
  status: RequestStatus;

  @ApiProperty({ example: { fullName: 'Nguyễn Văn An', guardianPhone: '0912345678' } })
  beforeData: Record<string, any>;

  @ApiProperty({ example: { fullName: 'Nguyễn Văn An Mới', guardianPhone: '0987654321' } })
  proposedData: Record<string, any>;

  @ApiPropertyOptional({ example: null, nullable: true })
  rejectionReason: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  reviewedBy: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  reviewedAt: string | null;

  @ApiPropertyOptional({ example: { outcome: 'REOPTIMIZED', affectedRoutesCount: 2 } })
  resolution?: Record<string, any> | null;

  @ApiPropertyOptional({ example: 'REOPTIMIZED', enum: ['DIRECT_UPDATE', 'REOPTIMIZED', 'REMOVED_FROM_ROUTES'] })
  resolutionOutcome?: string | null;

  @ApiPropertyOptional({ example: true })
  canCancel?: boolean;

  @ApiPropertyOptional({ example: true })
  canCheckRouting?: boolean;

  @ApiPropertyOptional({ example: true })
  canApprove?: boolean;

  @ApiPropertyOptional({ example: true })
  canReject?: boolean;

  @ApiPropertyOptional({ example: null })
  blockedReason?: string | null;

  @ApiProperty({ example: '2026-10-23T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-10-23T12:00:00.000Z' })
  updatedAt: string;
}

export class StudentUpdateRequestDetailDto extends StudentUpdateRequestDto {
  @ApiPropertyOptional({
    description: 'Dữ liệu hiện tại của học sinh tại thời điểm truy vấn (để phát hiện Stale Data)',
  })
  currentStudentData?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Cờ cảnh báo nếu dữ liệu gốc lúc tạo request đã bị thay đổi trực tiếp',
    example: false,
  })
  isStale?: boolean;
}

export class StudentUpdateRequestListResponseDto {
  @ApiProperty({ type: [StudentUpdateRequestDto] })
  items: StudentUpdateRequestDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}
