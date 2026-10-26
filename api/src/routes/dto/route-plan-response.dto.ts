import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoutePlanStatus } from '@prisma/client';
import { RouteResponseDto } from './route-response.dto.js';

export class RoutePlanResponseDto {
  @ApiProperty({ example: 'plan-uuid-1' })
  id: string;

  @ApiProperty({ example: 'school-uuid-1' })
  schoolId: string;

  @ApiProperty({ example: 'Trường THCS Chu Văn An' })
  schoolName?: string;

  @ApiProperty({ example: 'Phương án tuyến THCS Chu Văn An - 2026/2027' })
  name: string;

  @ApiProperty({ enum: RoutePlanStatus, example: RoutePlanStatus.DRAFT })
  status: RoutePlanStatus;

  @ApiProperty({ example: 28 })
  totalStudents: number;

  @ApiProperty({ example: 2 })
  totalOutboundRoutes: number;

  @ApiProperty({ example: 2 })
  totalReturnRoutes: number;

  @ApiProperty({ example: '2026-10-24T03:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ example: null })
  cancelledAt?: Date | null;

  @ApiPropertyOptional({ example: null })
  cancellationReason?: string | null;

  @ApiPropertyOptional({ example: '2026-10-25T08:30:00.000Z' })
  activatedAt?: Date | null;

  @ApiPropertyOptional({ example: 'user-schooladmin-1' })
  approvedById?: string | null;

  @ApiPropertyOptional({ example: 'Cô Nguyễn Thị Mai' })
  approvedByName?: string | null;

  @ApiPropertyOptional({ example: 'admin@r2s.com' })
  createdByName?: string | null;

  @ApiPropertyOptional({ type: [RouteResponseDto] })
  routes?: RouteResponseDto[];

  @ApiPropertyOptional({
    description: 'Thống kê độ bao phủ học sinh',
    example: { totalSelected: 28, assignedCount: 25, unassignedCount: 3, coverageRate: 0.893 },
  })
  coverage?: {
    totalSelected: number;
    assignedCount: number;
    unassignedCount: number;
    coverageRate: number;
  };

  @ApiPropertyOptional({
    description: 'Danh sách học sinh không thể phân tuyến trong phương án',
    type: [Object],
  })
  unassignedStudents?: {
    id: string;
    fullName: string;
    reason?: string;
    missingDirection?: string;
    addressText?: string;
  }[];
}
