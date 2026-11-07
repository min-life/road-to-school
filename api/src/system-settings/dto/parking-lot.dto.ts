import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsOptional, IsPositive, Min, Max } from 'class-validator';

export class UpdateParkingLotDto {
  @ApiProperty({ required: false, default: 50, exclusiveMinimum: true, minimum: 0, maximum: 500, description: 'Bán kính phục vụ Haversine tính bằng km, >0 và <=500; không gửi giữ giá trị hiện hành' })
  @IsOptional() @IsNumber() @IsPositive() @Max(500)
  maxOperatingRadiusKm?: number;
  @ApiProperty({
    description: 'Địa chỉ chi tiết bãi đỗ xe trung tâm của nhà xe',
    example: '123 Đường Vận Tải, Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh',
  })
  @IsNotEmpty({ message: 'Địa chỉ bãi xe không được để trống' })
  @IsString({ message: 'Địa chỉ bãi xe phải là chuỗi ký tự' })
  addressText: string;

  @ApiProperty({
    description: 'Vĩ độ vị trí bãi xe (WGS-84)',
    example: 10.865432,
    minimum: -90,
    maximum: 90,
  })
  @IsNotEmpty({ message: 'Vĩ độ không được để trống' })
  @IsNumber({}, { message: 'Vĩ độ phải là số hợp lệ' })
  @Min(-90, { message: 'Vĩ độ không được nhỏ hơn -90' })
  @Max(90, { message: 'Vĩ độ không được lớn hơn 90' })
  latitude: number;

  @ApiProperty({
    description: 'Kinh độ vị trí bãi xe (WGS-84)',
    example: 106.789123,
    minimum: -180,
    maximum: 180,
  })
  @IsNotEmpty({ message: 'Kinh độ không được để trống' })
  @IsNumber({}, { message: 'Kinh độ phải là số hợp lệ' })
  @Min(-180, { message: 'Kinh độ không được nhỏ hơn -180' })
  @Max(180, { message: 'Kinh độ không được lớn hơn 180' })
  longitude: number;

  @ApiProperty({ description: 'Lý do thay đổi vị trí bãi xe (tùy chọn)', required: false })
  @IsOptional()
  @IsString({ message: 'Lý do phải là chuỗi ký tự' })
  reason?: string;

  @ApiProperty({
    description: 'Ngày hiệu lực dời bãi xe (YYYY-MM-DD), mặc định là ngày mai. Các chuyến xe trước ngày này chạy bình thường.',
    example: '2026-11-05',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Ngày hiệu lực phải là chuỗi định dạng YYYY-MM-DD' })
  effectiveDate?: string;

  @ApiProperty({ description: 'Fingerprint kỳ vọng chống xung đột (tùy chọn)', required: false })
  @IsOptional()
  @IsString({ message: 'Fingerprint phải là chuỗi ký tự' })
  expectedFingerprint?: string;
}

export class ParkingLotImpactDto {
  @ApiProperty({ description: 'Địa chỉ hiện tại của bãi xe' })
  currentAddressText: string;

  @ApiProperty({ description: 'Vĩ độ hiện tại' })
  currentLatitude: number;

  @ApiProperty({ description: 'Kinh độ hiện tại' })
  currentLongitude: number;

  @ApiProperty({ description: 'Tọa độ có bị thay đổi không', required: false })
  hasCoordinateChanged?: boolean;

  @ApiProperty({ description: 'Ngày hiệu lực áp dụng', required: false, example: '2026-11-05' })
  effectiveDate?: string;

  @ApiProperty({ description: 'Số phương án tuyến (DRAFT + ACTIVE) sẽ được đánh dấu cần tối ưu lại', example: 3 })
  plansNeedingReoptimizationCount: number;

  @ApiProperty({ description: 'Số chuyến SCHEDULED chưa frozen từ ngày hiệu lực sẽ bị hủy khi đến ngày', example: 12 })
  tripsCancelledAfterEffectiveDateCount: number;

  @ApiProperty({ description: 'Số chuyến xe SCHEDULED trước ngày hiệu lực được bảo lưu chạy bình thường', example: 8 })
  tripsPreservedBeforeEffectiveDateCount: number;

  @ApiProperty({ description: 'Tổng số phương án tuyến DRAFT toàn hệ thống' })
  totalDraftPlansCount: number;

  @ApiProperty({ description: 'Tổng số phương án ACTIVE chịu tác động tối ưu lại, không bị hủy' })
  totalActivePlansCount: number;

  @ApiProperty({ description: 'Alias cũ: số phương án cần tối ưu lại, không phải số bị hủy', required: false })
  cancelledPlansCount?: number;

  @ApiProperty({ description: 'Tổng số chuyến xe SCHEDULED toàn hệ thống sẽ bị hủy' })
  totalScheduledTripsCount: number;

  @ApiProperty({ description: 'Tổng số chuyến xe SCHEDULED toàn hệ thống sẽ bị hủy (alias)', required: false })
  cancelledTripsCount?: number;

  @ApiProperty({ description: 'Tổng số chuyến xe IN_PROGRESS toàn hệ thống được bảo lưu' })
  totalInProgressTripsCount: number;

  @ApiProperty({ description: 'Tổng số chuyến xe IN_PROGRESS toàn hệ thống được bảo lưu (alias)', required: false })
  inProgressTripsPreservedCount?: number;

  @ApiProperty({ description: 'Fingerprint trạng thái hiện tại' })
  expectedFingerprint: string;

  @ApiProperty({ description: 'Fingerprint trạng thái hiện tại (alias)', required: false })
  fingerprint?: string;
}

export class ParkingLotResponseDto {
  @ApiProperty({ example: 50, description: 'Bán kính phục vụ Haversine tính bằng km' })
  maxOperatingRadiusKm?: number;
  @ApiProperty({
    description: 'Địa chỉ chi tiết bãi đỗ xe trung tâm',
    example: '123 Đường Vận Tải, Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh',
  })
  addressText: string;

  @ApiProperty({
    description: 'Vĩ độ vị trí bãi xe',
    example: 10.865432,
  })
  latitude: number;

  @ApiProperty({
    description: 'Kinh độ vị trí bãi xe',
    example: 106.789123,
  })
  longitude: number;

  @ApiProperty({
    description: 'Thời gian cập nhật gần nhất (ISO 8601)',
    example: '2026-10-23T12:00:00.000Z',
  })
  updatedAt: string;

  @ApiProperty({
    description: 'Thông tin lịch hẹn dời bãi đỗ xe trung tâm (nếu có)',
    required: false,
    nullable: true,
  })
  scheduledChange?: {
    newAddressText: string;
    newLatitude: number;
    newLongitude: number;
    effectiveDate: string;
    reason?: string;
    scheduledAt: string;
    scheduledById?: string;
  } | null;
}
