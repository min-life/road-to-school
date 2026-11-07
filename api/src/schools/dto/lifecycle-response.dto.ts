import { ApiProperty } from '@nestjs/swagger';

export class ScheduledChangeResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) schoolId: string;
  @ApiProperty({ enum: ['INACTIVE', 'LOCATION', 'SCHEDULE'] }) type: string;
  @ApiProperty({ format: 'date' }) effectiveDate: string;
  @ApiProperty({
    type: Object,
    description:
      'isActive=false / addressText,latitude,longitude / weeklySchedule tùy type',
  })
  payload: object;
  @ApiProperty({ enum: ['PENDING', 'APPLIED', 'CANCELLED', 'FAILED'] })
  status: string;
  @ApiProperty({ format: 'uuid' }) createdById: string;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
  @ApiProperty({ nullable: true, format: 'date-time' }) appliedAt:
    string | null;
  @ApiProperty({ nullable: true, format: 'date-time' }) cancelledAt:
    string | null;
  @ApiProperty({ nullable: true }) lastError: string | null;
}
export class CalendarEntryResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ nullable: true, format: 'uuid' }) schoolId: string | null;
  @ApiProperty() title: string;
  @ApiProperty({ enum: ['HOLIDAY', 'MAKEUP'] }) kind: string;
  @ApiProperty({ enum: ['SOLAR', 'LUNAR'] }) calendar: string;
  @ApiProperty({ enum: ['ANNUAL', 'ONCE'] }) recurrence: string;
  @ApiProperty({ nullable: true }) year: number | null;
  @ApiProperty() month: number;
  @ApiProperty() day: number;
  @ApiProperty() leapMonth: boolean;
  @ApiProperty({ nullable: true }) startTime: string | null;
  @ApiProperty({ nullable: true }) endTime: string | null;
  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] })
  status: string;
  @ApiProperty({
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'BLOCKED'],
  })
  effectiveStatus: string;
  @ApiProperty({ nullable: true, enum: ['OPERATOR_HOLIDAY'] })
  effectiveStatusReason: string | null;
  @ApiProperty({ format: 'uuid' }) createdById: string;
  @ApiProperty({ nullable: true, format: 'uuid' }) reviewedById: string | null;
  @ApiProperty({ nullable: true }) reason: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
  @ApiProperty({ nullable: true, format: 'date-time' }) reviewedAt:
    string | null;
  @ApiProperty({ nullable: true, format: 'date-time' }) cancelledAt:
    string | null;
}
export class ScheduledLocationResponseDto {
  @ApiProperty() success: boolean;
  @ApiProperty() message: string;
  @ApiProperty({
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      addressText: { type: 'string' },
      province: { type: 'string', nullable: true },
      provinceId: { type: 'string', nullable: true },
      wardId: { type: 'string', nullable: true },
      ward: { type: 'string', nullable: true },
      latitude: { type: 'number' },
      longitude: { type: 'number' },
    },
  })
  school: object;
  @ApiProperty({ description: 'Đã thực hiện; 0 khi mới hẹn' })
  cancelledPlansCount: number;
  @ApiProperty({ description: 'Đã thực hiện; 0 khi mới hẹn' })
  cancelledTripsCount: number;
  @ApiProperty({ format: 'uuid' }) scheduledChangeId: string;
  @ApiProperty({ format: 'date' }) effectiveDate: string;
  @ApiProperty({ enum: ['PENDING'] }) changeStatus: string;
}
