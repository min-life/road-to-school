import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Raw Trip shape used only by the new SYSTEM_ADMIN finalization endpoints. */
export class AdminTripResponseDto {
  @ApiProperty({ type: String })
  id: string;
  @ApiProperty({ type: String })
  routeId: string;
  @ApiProperty({ type: String })
  schoolId: string;
  @ApiProperty({ type: String, format: 'date-time' })
  serviceDate: string;
  @ApiProperty({ enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] })
  status: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  scheduledStartAt: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  scheduledEndAt: string | null;
  @ApiProperty({ type: String, nullable: true })
  scheduledStartTime: string | null;
  @ApiProperty({ type: String, nullable: true })
  scheduledEndTime: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  actualStartTime: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  actualEndTime: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  attendantReadyAt: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  arrivedAtSchoolAt: string | null;
  @ApiProperty({ type: String })
  assignedVehicleId: string;
  @ApiProperty({ type: String })
  assignedDriverId: string;
  @ApiProperty({ type: String })
  assignedBusAttendantId: string;
  @ApiProperty({ type: String, nullable: true })
  cancellationReason: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  cancelledAt: string | null;
  @ApiProperty({ type: String, nullable: true })
  cancelledById: string | null;
  @ApiProperty({
    type: Object,
    nullable: true,
    description:
      'Audit PENDING/FINALIZED, trigger/effectiveDate/detectedAt, previousStatus/finalStatus/reason/finalizedById/finalizedAt; không sửa điểm danh',
  })
  adminFinalization: Record<string, unknown> | null;
  @ApiProperty({ type: Object, nullable: true })
  navigationState: Record<string, unknown> | null;
  @ApiProperty({ type: Object, nullable: true })
  routeSnapshot: Record<string, unknown> | null;
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: string;
  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: string;
  @ApiPropertyOptional({
    type: [Object],
    description: 'Roster gốc chỉ trong danh sách chờ admin; không sửa khi chốt',
  })
  attendances?: object[];
}
