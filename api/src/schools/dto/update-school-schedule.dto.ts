import { EffectiveDateDto } from './effective-date.dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

  @ApiProperty({ required: false, description: 'Fingerprint từ schedule-impact để kiểm tra tác động trước khi ghi' })
  @IsOptional()
  @IsString()
  expectedFingerprint?: string;
}

export class UpdateSchoolScheduleResponseDto {
  @ApiProperty({ required: false, description: 'ID lịch thay đổi mới tạo' }) scheduledChangeId?: string;
  @ApiProperty({ required: false, format: 'date', description: 'Ngày hiệu lực' }) effectiveDate?: string;
  @ApiProperty({ required: false, enum: ['PENDING', 'APPLIED'] }) changeStatus?: string;
  @ApiProperty({ description: 'Số phương án đã đánh dấu cần tối ưu lại' }) reoptimizationPlansCount: number;
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
