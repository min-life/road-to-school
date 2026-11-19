import { EffectiveDateDto } from './effective-date.dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class SchoolLocationImpactDto {
  @ApiProperty({ description: 'ID trường học' })
  schoolId: string;

  @ApiProperty({ description: 'Tên trường học' })
  schoolName: string;

  @ApiProperty({ description: 'Địa chỉ hiện tại của trường' })
  currentAddressText: string;

  @ApiProperty({ description: 'Vĩ độ hiện tại' })
  currentLatitude: number;

  @ApiProperty({ description: 'Kinh độ hiện tại' })
  currentLongitude: number;

  @ApiProperty({ description: 'Tọa độ có bị thay đổi không', required: false })
  hasCoordinateChanged?: boolean;

  @ApiProperty({ description: 'Số phương án tuyến DRAFT hiện có' })
  draftPlansCount: number;

  @ApiProperty({ description: 'Số phương án tuyến ACTIVE hiện có' })
  activePlansCount: number;

  @ApiProperty({ description: 'Trường tương thích ngược; đổi vị trí hoặc lịch học không hủy phương án', required: false })
  cancelledPlansCount?: number;

  @ApiProperty({ description: 'Phương án dự kiến đánh dấu cần tối ưu lại' })
  reoptimizationPlansCount: number;

  @ApiProperty({ description: 'Số chuyến dự kiến hủy trong hôm nay' })
  cancelledTripsTodayCount: number;

  @ApiProperty({ description: 'Số chuyến chưa vận hành dự kiến cập nhật giờ' })
  updatedTripsCount: number;

  @ApiProperty({ description: 'Số chuyến chịu tác động đã sẵn sàng, điểm danh hoặc đang chạy được giữ nguyên' })
  preservedTripsCount: number;

  @ApiProperty({ description: 'Số chuyến xe SCHEDULED sẽ bị hủy' })
  scheduledTripsCount: number;

  @ApiProperty({ description: 'Số chuyến xe SCHEDULED sẽ bị hủy (alias)', required: false })
  cancelledTripsCount?: number;

  @ApiProperty({ description: 'Số chuyến đang chạy được bảo lưu' })
  inProgressTripsCount: number;

  @ApiProperty({ description: 'Số chuyến đang chạy được bảo lưu (alias)', required: false })
  inProgressTripsPreservedCount?: number;

  @ApiProperty({ description: 'Fingerprint trạng thái hiện tại để kiểm tra xung đột' })
  expectedFingerprint: string;

  @ApiProperty({ description: 'Fingerprint trạng thái hiện tại (alias)', required: false })
  fingerprint?: string;
}

export class UpdateSchoolLocationDto extends EffectiveDateDto {
  @ApiProperty({ description: 'Địa chỉ trường học chi tiết' })
  @IsNotEmpty({ message: 'Địa chỉ trường học không được để trống' })
  @IsString({ message: 'Địa chỉ trường học phải là chuỗi ký tự' })
  addressText: string;

  @ApiProperty({ description: 'Vĩ độ (Latitude, từ -90 đến 90)' })
  @IsNumber({}, { message: 'Vĩ độ phải là số thực' })
  @Min(-90, { message: 'Vĩ độ tối thiểu là -90' })
  @Max(90, { message: 'Vĩ độ tối đa là 90' })
  latitude: number;

  @ApiProperty({ description: 'Kinh độ (Longitude, từ -180 đến 180)' })
  @IsNumber({}, { message: 'Kinh độ phải là số thực' })
  @Min(-180, { message: 'Kinh độ tối thiểu là -180' })
  @Max(180, { message: 'Kinh độ tối đa là 180' })
  longitude: number;

  @ApiProperty({ description: 'Lý do thay đổi vị trí trường học (tùy chọn)', required: false })
  @IsOptional()
  @IsString({ message: 'Lý do phải là chuỗi ký tự' })
  reason?: string;

  @ApiProperty({ description: 'Fingerprint kỳ vọng để chống xung đột thao tác đồng thời (tùy chọn)', required: false })
  @IsOptional()
  @IsString()
  expectedFingerprint?: string;
}
