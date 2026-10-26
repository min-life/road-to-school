import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { MaskedContactChannelDto } from './leave-notice-options.dto.js';

export class RequestLeaveNoticeOtpDto {
  @ApiProperty({ example: 'trip-uuid-1', description: 'ID chuyến xe thật cần báo nghỉ' })
  @IsNotEmpty({ message: 'tripId không được để trống' })
  @IsUUID('4', { message: 'tripId phải là UUID hợp lệ' })
  tripId: string;

  @ApiPropertyOptional({ example: 'stu-uuid-1', description: 'ID học sinh (bắt buộc khi Phụ huynh gửi yêu cầu)' })
  @IsOptional()
  @IsUUID('4', { message: 'studentId phải là UUID hợp lệ' })
  studentId?: string;
}

export class LeaveNoticeOtpResponseDto {
  @ApiProperty({ example: 'challenge-uuid-1' })
  challengeId: string;

  @ApiProperty({ type: [MaskedContactChannelDto] })
  maskedChannels: MaskedContactChannelDto[];

  @ApiProperty({ example: 300, description: 'Thời gian hiệu lực tính bằng giây' })
  expiresInSeconds: number;
}
