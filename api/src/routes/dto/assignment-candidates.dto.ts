import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CandidateVehicleItemDto {
  @ApiProperty({ example: 'veh-1' })
  id: string;

  @ApiProperty({ example: '51B-123.45' })
  licensePlate: string;

  @ApiProperty({ example: 'Hyundai Solati' })
  brand: string;

  @ApiProperty({ example: 29 })
  seatCount: number;

  @ApiProperty({ example: 'Trắng' })
  color: string;

  @ApiProperty({ example: true })
  isEligible: boolean;

  @ApiPropertyOptional({ example: 'Khả dụng (29 chỗ >= 22 chỗ yêu cầu)' })
  reason?: string;
}

export class CandidateVehiclesResponseDto {
  @ApiPropertyOptional({ example: 'veh-old-1' })
  currentVehicleId?: string;

  @ApiProperty({ example: 22 })
  requiredCapacity: number;

  @ApiProperty({ type: [CandidateVehicleItemDto] })
  candidates: CandidateVehicleItemDto[];
}

export class CandidateDriverItemDto {
  @ApiProperty({ example: 'usr-drv-1' })
  id: string;

  @ApiProperty({ example: 'Nguyễn Văn Tài' })
  fullName: string;

  @ApiPropertyOptional({ example: '0901234567' })
  phone?: string | null;

  @ApiProperty({ example: true })
  isEligible: boolean;

  @ApiPropertyOptional({ example: 'Khả dụng' })
  reason?: string;
}

export class CandidateDriversResponseDto {
  @ApiProperty({ type: [CandidateDriverItemDto] })
  candidates: CandidateDriverItemDto[];
}

export class CandidateBusAttendantItemDto {
  @ApiProperty({ example: 'usr-att-1' })
  id: string;

  @ApiProperty({ example: 'Trần Thị Mai' })
  fullName: string;

  @ApiPropertyOptional({ example: '0908765432' })
  phone?: string | null;

  @ApiProperty({ example: true })
  isEligible: boolean;

  @ApiPropertyOptional({ example: 'Khả dụng (Biên chế trường THCS Chu Văn An)' })
  reason?: string;
}

export class CandidateBusAttendantsResponseDto {
  @ApiProperty({ type: [CandidateBusAttendantItemDto] })
  candidates: CandidateBusAttendantItemDto[];
}
