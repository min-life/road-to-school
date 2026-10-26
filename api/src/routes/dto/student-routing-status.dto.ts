import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type StudentDerivedRoutingStatus =
  | 'NO_ROUTE_PLAN'
  | 'MISSING_ADDRESS'
  | 'NOT_ASSIGNED'
  | 'ASSIGNED_DRAFT';

export class StudentRoutingDetailDto {
  @ApiProperty({ example: 'stu-1' })
  studentId: string;

  @ApiProperty({ example: 'Nguyễn Văn An' })
  studentName: string;

  @ApiProperty({
    enum: ['NO_ROUTE_PLAN', 'MISSING_ADDRESS', 'NOT_ASSIGNED', 'ASSIGNED_DRAFT'],
    example: 'ASSIGNED_DRAFT',
  })
  routingStatus: StudentDerivedRoutingStatus;

  @ApiPropertyOptional({ example: 'plan-1' })
  routePlanId?: string | null;

  @ApiPropertyOptional({ example: 'Phương án tuyến THCS Chu Văn An - 2026/2027' })
  routePlanName?: string | null;

  @ApiPropertyOptional({ example: 'DRAFT' })
  routePlanStatus?: string | null;

  @ApiPropertyOptional({
    description: 'Thông tin tuyến đi học (TO_SCHOOL)',
  })
  outboundRoute?: {
    id: string;
    name: string;
    proposedVehiclePlate?: string | null;
    plannedArrivalTime?: string | null;
    pickupAddressText: string;
    pickupLatitude: number;
    pickupLongitude: number;
    polylineGeometry: string;
    schoolLocation: { latitude: number; longitude: number; name: string };
    parkingLocation: { latitude: number; longitude: number; addressText: string };
  } | null;

  @ApiPropertyOptional({
    description: 'Thông tin tuyến về nhà (TO_PARKING)',
  })
  returnRoute?: {
    id: string;
    name: string;
    proposedVehiclePlate?: string | null;
    plannedArrivalTime?: string | null;
    dropoffAddressText: string;
    dropoffLatitude: number;
    dropoffLongitude: number;
    polylineGeometry: string;
    schoolLocation: { latitude: number; longitude: number; name: string };
    parkingLocation: { latitude: number; longitude: number; addressText: string };
  } | null;
}
