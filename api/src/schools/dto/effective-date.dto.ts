import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsCalendarDate } from './create-school.dto.js';

export class EffectiveDateDto {
  @ApiPropertyOptional({
    description:
      'Ngày hiệu lực theo giờ Việt Nam; mặc định ngày mai, không muộn hơn ngày cuối hợp đồng',
    example: '2026-11-10',
    format: 'date',
  })
  @IsOptional()
  @IsCalendarDate()
  effectiveDate?: string;
}
