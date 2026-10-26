import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EligibleStudentItemDto {
  @ApiProperty({ example: 'stu-1' })
  id: string;

  @ApiProperty({ example: 'STU12345678' })
  code: string;

  @ApiProperty({ example: 'Nguyễn Văn An' })
  fullName: string;

  @ApiProperty({ example: '0901234567' })
  guardianPhone: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/.../avatar.jpg' })
  avatarUrl?: string | null;

  @ApiProperty({ example: '12 Nguyễn Trãi, Phường 2, Quận 5, TP.HCM' })
  addressText: string;

  @ApiProperty({ example: 10.755432 })
  latitude: number;

  @ApiProperty({ example: 106.678912 })
  longitude: number;
}

export class AvailableVehicleItemDto {
  @ApiProperty({ example: 'veh-1' })
  id: string;

  @ApiProperty({ example: 'Hyundai Solati' })
  brand: string;

  @ApiProperty({ example: 16 })
  seatCount: number;

  @ApiProperty({ example: '51B-123.45' })
  licensePlate: string;

  @ApiProperty({ example: 'Trắng' })
  color: string;
}

export class IneligibleStudentItemDto {
  @ApiProperty({ example: 'stu-2' })
  id: string;

  @ApiProperty({ example: 'STU12345679' })
  code: string;

  @ApiProperty({ example: 'Trần Thị Bình' })
  fullName: string;

  @ApiPropertyOptional({ example: '0907654321' })
  guardianPhone?: string;

  @ApiPropertyOptional({ example: 'Chưa cập nhật địa chỉ' })
  addressText?: string | null;

  @ApiPropertyOptional({ example: null })
  latitude?: number | null;

  @ApiPropertyOptional({ example: null })
  longitude?: number | null;

  @ApiProperty({ example: 'MISSING_COORDINATES' })
  reasonCode: string;

  @ApiProperty({ example: 'Chưa cập nhật tọa độ đón trả' })
  reasonMessage: string;
}

export class UnavailableVehicleItemDto {
  @ApiProperty({ example: 'veh-2' })
  id: string;

  @ApiProperty({ example: 'Thaco Town' })
  brand: string;

  @ApiProperty({ example: 29 })
  seatCount: number;

  @ApiProperty({ example: '51B-999.88' })
  licensePlate: string;

  @ApiProperty({ example: 'Trắng - Xanh' })
  color: string;

  @ApiProperty({ example: 'RESERVED_BY_DRAFT_PLAN' })
  reasonCode: string;

  @ApiProperty({
    example:
      'Xe đã được giữ bởi phương án DRAFT ("Phương án Tiểu học") của trường "TH Vinschool" trong thời hạn hợp đồng chồng lấn',
  })
  reasonMessage: string;
}

export class RoutePreparationDto {
  @ApiProperty({
    description: 'Thông tin trường học đang lập tuyến',
  })
  school: {
    id: string;
    name: string;
    addressText: string;
    latitude: number;
    longitude: number;
    weeklySchedule: any;
    contractStartDate: string;
    contractEndDate: string;
  };

  @ApiProperty({
    description: 'Vị trí bãi xe trung tâm duy nhất của nhà xe',
  })
  parkingLot: {
    addressText: string;
    latitude: number;
    longitude: number;
  };

  @ApiProperty({
    type: [EligibleStudentItemDto],
    description: 'Danh sách học sinh đủ điều kiện (AVAILABLE, có tọa độ, chưa có tuyến DRAFT)',
  })
  eligibleStudents: EligibleStudentItemDto[];

  @ApiPropertyOptional({
    type: [IneligibleStudentItemDto],
    description: 'Danh sách học sinh chưa đủ điều kiện (thiếu tọa độ, tài khoản không hợp lệ, hoặc đang tham gia phương án khác)',
  })
  ineligibleStudents?: IneligibleStudentItemDto[];

  @ApiProperty({
    type: [AvailableVehicleItemDto],
    description: 'Danh sách xe khả dụng (sắp xếp seatCount DESC, không bị giữ chỗ trong thời gian hợp đồng chồng lấn)',
  })
  availableVehicles: AvailableVehicleItemDto[];

  @ApiPropertyOptional({
    type: [UnavailableVehicleItemDto],
    description: 'Danh sách xe không khả dụng (đang được giữ bởi phương án DRAFT/ACTIVE khác trong thời gian hợp đồng chồng lấn)',
  })
  unavailableVehicles?: UnavailableVehicleItemDto[];
}

