import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsUUID, IsOptional, ValidateNested } from 'class-validator';
import { RouteDirection } from '@prisma/client';
import { RoutingConstraintsDto } from './optimize-route.dto.js';
import { PreviewRouteStopDto } from './route-preview-response.dto.js';

export class RouteOptionSummaryDto {
  @ApiProperty({ description: 'ID tuyến xe' })
  id: string;

  @ApiProperty({ description: 'Tên tuyến xe' })
  name: string;

  @ApiPropertyOptional({ description: 'Chiều tuyến', enum: RouteDirection })
  @IsOptional()
  direction?: RouteDirection;

  @ApiProperty({ description: 'Biển số xe phân công' })
  vehiclePlate: string;

  @ApiProperty({ description: 'Số ghế của xe' })
  seatCount: number;

  @ApiProperty({ description: 'Sức chứa của xe (alias seatCount)' })
  vehicleCapacity: number;

  @ApiProperty({ description: 'Số học sinh hiện tại trên tuyến' })
  currentStudents: number;

  @ApiProperty({ description: 'Số học sinh hiện tại trên tuyến (alias currentStudents)' })
  currentStudentsCount: number;

  @ApiProperty({ description: 'Số ghế còn trống' })
  availableSeats: number;

  @ApiPropertyOptional({ description: 'Thời gian tối đa tuyến (phút) được cấu hình trên tuyến' })
  @IsOptional()
  maxRouteDurationMinutes?: number;

  @ApiPropertyOptional({ description: 'Thời gian dừng mặc định (giây) được cấu hình trên tuyến' })
  @IsOptional()
  defaultStopServiceSeconds?: number;
}

export class RoutePairOptionDto {
  @ApiProperty({ description: 'ID phương án tuyến' })
  planId: string;

  @ApiProperty({ description: 'Tên phương án tuyến' })
  planName: string;

  @ApiProperty({ description: 'Trạng thái phương án tuyến' })
  planStatus: string;

  @ApiProperty({ description: 'Thông tin tuyến đi', type: RouteOptionSummaryDto })
  outboundRoute: RouteOptionSummaryDto;

  @ApiProperty({ description: 'Thông tin tuyến về', type: RouteOptionSummaryDto })
  returnRoute: RouteOptionSummaryDto;

  @ApiPropertyOptional({ description: 'Thời gian tối đa tuyến mặc định gợi ý (phút)' })
  @IsOptional()
  defaultMaxRouteDurationMinutes?: number;

  @ApiPropertyOptional({ description: 'Thời gian dừng tại điểm mặc định gợi ý (giây)' })
  @IsOptional()
  defaultStopServiceSeconds?: number;
}

export class StudentSummaryDto {
  @ApiProperty({ description: 'Mã định danh học sinh' })
  id: string;

  @ApiProperty({ description: 'Họ tên học sinh' })
  fullName: string;

  @ApiProperty({ description: 'Địa chỉ đón trả' })
  addressText: string;

  @ApiProperty({ description: 'Vĩ độ' })
  latitude: number;

  @ApiProperty({ description: 'Kinh độ' })
  longitude: number;
}

export class StudentInsertionOptionsResponseDto {
  @ApiProperty({ description: 'ID học sinh' })
  studentId: string;

  @ApiProperty({ description: 'Họ tên học sinh' })
  studentName: string;

  @ApiProperty({ description: 'Địa chỉ đón trả' })
  addressText: string;

  @ApiProperty({ description: 'Vĩ độ' })
  latitude: number;

  @ApiProperty({ description: 'Kinh độ' })
  longitude: number;

  @ApiProperty({ description: 'Thông tin chi tiết học sinh', type: StudentSummaryDto })
  student: StudentSummaryDto;

  @ApiProperty({ description: 'Học sinh đã thuộc tuyến hiệu lực hay chưa' })
  hasActiveMembership: boolean;

  @ApiProperty({ description: 'Danh sách các cặp tuyến khả dụng (candidatePairs)', type: [RoutePairOptionDto] })
  candidatePairs: RoutePairOptionDto[];

  @ApiProperty({ description: 'Danh sách các cặp tuyến khả dụng (pairs - alias)', type: [RoutePairOptionDto] })
  pairs: RoutePairOptionDto[];
}

export class PreviewStudentInsertionDto {
  @ApiProperty({ description: 'ID học sinh cần thêm vào tuyến' })
  @IsNotEmpty({ message: 'Vui lòng cung cấp ID học sinh' })
  @IsUUID('4', { message: 'ID học sinh không đúng định dạng UUID' })
  studentId: string;

  @ApiProperty({ description: 'ID tuyến chiều đi (TO_SCHOOL)' })
  @IsNotEmpty({ message: 'Vui lòng chọn tuyến chiều đi' })
  @IsUUID('4', { message: 'ID tuyến chiều đi không đúng định dạng UUID' })
  outboundRouteId: string;

  @ApiProperty({ description: 'ID tuyến chiều về (TO_PARKING)' })
  @IsNotEmpty({ message: 'Vui lòng chọn tuyến chiều về' })
  @IsUUID('4', { message: 'ID tuyến chiều về không đúng định dạng UUID' })
  returnRouteId: string;

  @ApiPropertyOptional({
    description: 'Hai tiêu chí tối ưu ghi đè: maxRouteDurationMinutes và defaultStopServiceSeconds',
    type: RoutingConstraintsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RoutingConstraintsDto)
  routingConstraints?: RoutingConstraintsDto;
}

export class RouteInsertionResultDto {
  @ApiProperty({ description: 'ID tuyến xe' })
  routeId: string;

  @ApiProperty({ description: 'Tên tuyến xe' })
  routeName: string;

  @ApiPropertyOptional({ description: 'Chiều tuyến', enum: RouteDirection })
  @IsOptional()
  direction?: RouteDirection;

  @ApiProperty({ description: 'Kết quả kiểm tra', enum: ['FEASIBLE', 'INFEASIBLE', 'UNAVAILABLE'] })
  status: 'FEASIBLE' | 'INFEASIBLE' | 'UNAVAILABLE';

  @ApiProperty({ description: 'Trạng thái khả thi (alias status)', enum: ['FEASIBLE', 'INFEASIBLE', 'UNAVAILABLE'] })
  feasibility: 'FEASIBLE' | 'INFEASIBLE' | 'UNAVAILABLE';

  @ApiPropertyOptional({ description: 'Lý do nếu không khả thi hoặc lỗi dịch vụ' })
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'Lý do nếu không khả thi (alias reason)' })
  @IsOptional()
  infeasibilityReason?: string;

  @ApiProperty({ description: 'Số học sinh hiện tại' })
  currentStudentsCount: number;

  @ApiProperty({ description: 'Số học sinh sau khi thêm' })
  newStudentsCount: number;

  @ApiProperty({ description: 'Thời gian di chuyển ước tính cũ (giây)' })
  oldDurationSeconds: number;

  @ApiProperty({ description: 'Thời gian di chuyển ước tính mới (giây)' })
  newDurationSeconds: number;

  @ApiPropertyOptional({ description: 'Quãng đường cũ (mét)' })
  @IsOptional()
  oldDistanceMeters?: number;

  @ApiProperty({ description: 'Quãng đường mới (mét)' })
  newDistanceMeters: number;

  @ApiPropertyOptional({ description: 'Polyline geometry mới' })
  @IsOptional()
  newPolylineGeometry?: string;

  @ApiPropertyOptional({ description: 'Thứ tự điểm dừng mới của học sinh trên tuyến' })
  @IsOptional()
  stopOrder?: number;

  @ApiPropertyOptional({ description: 'Thời gian đón/trả dự kiến tại điểm dừng (HH:mm)' })
  @IsOptional()
  plannedArrivalTime?: string;

  @ApiPropertyOptional({ description: 'Giờ xuất phát của tuyến (HH:mm)' })
  @IsOptional()
  departureTime?: string;

  @ApiPropertyOptional({ description: 'Giờ đến đích của tuyến (HH:mm)' })
  @IsOptional()
  arrivalTime?: string;

  @ApiPropertyOptional({ description: 'Danh sách toàn bộ điểm dừng của tuyến sau khi chèn', type: [PreviewRouteStopDto] })
  @IsOptional()
  stops?: PreviewRouteStopDto[];
}

export class PreviewStudentInsertionResponseDto {
  @ApiProperty({ description: 'Mã token preview có hiệu lực 1 lần (TTL 10 phút)', required: false })
  previewToken: string | null;

  @ApiProperty({ description: 'Cả hai tuyến đều khả thi hay không' })
  feasible: boolean;

  @ApiProperty({ description: 'Cả hai tuyến đều khả thi hay không (alias feasible)' })
  isFeasible: boolean;

  @ApiPropertyOptional({ description: 'Lý do dịch vụ không khả dụng (nếu có)' })
  @IsOptional()
  unavailabilityReason?: string;

  @ApiProperty({ description: 'Kết quả kiểm tra tuyến chiều đi', type: RouteInsertionResultDto })
  outbound: RouteInsertionResultDto;

  @ApiProperty({ description: 'Kết quả kiểm tra tuyến chiều về (wire name return)', type: RouteInsertionResultDto })
  return: RouteInsertionResultDto;

  @ApiProperty({ description: 'Kết quả kiểm tra tuyến chiều về (alias returnRoute)', type: RouteInsertionResultDto })
  returnRoute: RouteInsertionResultDto;

  @ApiProperty({ description: 'Fingerprint trạng thái ban đầu để revalidate khi xác nhận' })
  expectedFingerprint: string;
}

export class ConfirmStudentInsertionDto {
  @ApiProperty({ description: 'Mã token preview đã được cấp' })
  @IsNotEmpty({ message: 'Vui lòng cung cấp mã previewToken' })
  @IsString({ message: 'previewToken phải là chuỗi ký tự' })
  previewToken: string;

  @ApiPropertyOptional({ description: 'Fingerprint kỳ vọng để chống xung đột (tùy chọn)' })
  @IsOptional()
  @IsString({ message: 'expectedFingerprint phải là chuỗi ký tự' })
  expectedFingerprint?: string;
}
