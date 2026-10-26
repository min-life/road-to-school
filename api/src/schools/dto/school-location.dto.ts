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

  @ApiProperty({ description: 'Số phương án tuyến DRAFT sẽ bị hủy' })
  draftPlansCount: number;

  @ApiProperty({ description: 'Số phương án tuyến ACTIVE sẽ bị hủy' })
  activePlansCount: number;

  @ApiProperty({ description: 'Tổng số phương án tuyến sẽ bị hủy (DRAFT + ACTIVE)', required: false })
  cancelledPlansCount?: number;

  @ApiProperty({ description: 'Số chuyến xe SCHEDULED sẽ bị hủy' })
  scheduledTripsCount: number;

  @ApiProperty({ description: 'Số chuyến xe SCHEDULED sẽ bị hủy (alias)', required: false })
  cancelledTripsCount?: number;

  @ApiProperty({ description: 'Số chuyến xe IN_PROGRESS được bảo lưu dữ liệu cũ' })
  inProgressTripsCount: number;

  @ApiProperty({ description: 'Số chuyến xe IN_PROGRESS được bảo lưu dữ liệu cũ (alias)', required: false })
  inProgressTripsPreservedCount?: number;

  @ApiProperty({ description: 'Fingerprint trạng thái hiện tại để kiểm tra xung đột' })
  expectedFingerprint: string;

  @ApiProperty({ description: 'Fingerprint trạng thái hiện tại (alias)', required: false })
  fingerprint?: string;
}

export class UpdateSchoolLocationDto {
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
