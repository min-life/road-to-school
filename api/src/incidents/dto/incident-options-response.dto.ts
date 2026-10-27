import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TripIncidentType } from '@prisma/client';

export class IncidentAssigneeDto {
  @ApiProperty({ example: 'user-uuid-1' })
  id: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  fullName: string;

  @ApiProperty({ example: 'BUS_ATTENDANT' })
  role: string;
}

export class IncidentOptionsResponseDto {
  @ApiProperty({ example: true })
  canReport: boolean;

  @ApiPropertyOptional({ example: 'TOO_EARLY', nullable: true })
  disabledReason?: string | null;

  @ApiProperty({ enum: TripIncidentType, isArray: true, example: [TripIncidentType.ATTENDANT_MISSING] })
  availableTypes: TripIncidentType[];

  @ApiPropertyOptional({ type: IncidentAssigneeDto, nullable: true })
  expectedAssignee?: IncidentAssigneeDto | null;

  @ApiProperty({ example: '2026-10-27T06:15:00.000Z' })
  serverNow: string;

  @ApiPropertyOptional({ example: '2026-10-27T06:15:00.000Z', nullable: true })
  reportAvailableAt?: string | null;

  @ApiPropertyOptional({ example: 'incident-uuid-1', nullable: true })
  existingIncidentId?: string | null;
}
