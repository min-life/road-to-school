import { ApiProperty } from '@nestjs/swagger';
import { TripIncidentStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { TripReasonDto } from '../../trips/dto/trip-actions.dto.js';

export class CloseIncidentDto extends TripReasonDto {
  @ApiProperty({
    enum: TripIncidentStatus,
    description: 'Trạng thái sự cố khi mở form',
  })
  @IsEnum(TripIncidentStatus)
  expectedStatus: TripIncidentStatus;
}
