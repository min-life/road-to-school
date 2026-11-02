import { EffectiveDateDto } from './effective-date.dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class UpdateSchoolScheduleDto extends EffectiveDateDto {
  @ApiProperty({
    description: 'Lịch học theo tuần dạng JSON Object hoặc chuỗi JSON',
    example: {
      monday: { start: '07:00', end: '17:00' },
      tuesday: { start: '07:00', end: '17:00' },
      wednesday: { start: '07:00', end: '17:00' },
      thursday: { start: '07:00', end: '17:00' },
      friday: { start: '07:00', end: '17:00' },
    },
  })
  @IsNotEmpty({ message: 'Lịch học tuần không được để trống' })
  weeklySchedule: Record<string, { start: string; end: string }> | string;
}

export class UpdateSchoolScheduleResponseDto {
  @ApiProperty({ required: false, description: 'ID lịch thay đổi mới tạo' }) scheduledChangeId?: string;
  @ApiProperty({ required: false, format: 'date', description: 'Ngày hiệu lực' }) effectiveDate?: string;
  @ApiProperty({ required: false, enum: ['PENDING'], description: 'Chưa áp dụng ngay' }) changeStatus?: string;
  @ApiProperty({ description: 'Trạng thái thành công' })
  success: boolean;

  @ApiProperty({ description: 'Thông điệp kết quả' })
  message: string;

  @ApiProperty({ description: 'Thông tin trường sau khi cập nhật' })
  school: {
    id: string;
    name: string;
    weeklySchedule: Record<string, any>;
  };

  @ApiProperty({ description: 'Số chuyến xe SCHEDULED bị hủy do không còn phù hợp lịch học' })
  cancelledTripsCount: number;

  @ApiProperty({ description: 'Số chuyến xe SCHEDULED được cập nhật lại khung giờ tương ứng' })
  updatedTripsCount: number;
}
