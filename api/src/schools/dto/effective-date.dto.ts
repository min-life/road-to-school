import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsCalendarDate } from './create-school.dto.js';

export class EffectiveDateDto {
  @ApiPropertyOptional({
    description:
      'Ngày hiệu lực theo giờ Việt Nam. Nếu bỏ trống, đổi địa điểm dùng hôm nay, đổi lịch học và ngừng hoạt động dùng ngày mai. Hạn cuối là ngày cuối hợp đồng.',
    example: '2026-11-10',
    format: 'date',
  })
  @IsOptional()
  @IsCalendarDate()
  effectiveDate?: string;
}
