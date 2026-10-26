import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { LeaveNoticeStatus } from '@prisma/client';

export class CancelTripFromNoticeDto {
  @ApiProperty({ example: 'Không bố trí được tài xế thay thế sau sự cố xe hỏng', description: 'Lý do hủy chuyến (bắt buộc)' })
  @IsNotEmpty({ message: 'Lý do hủy chuyến không được để trống' })
  @IsString({ message: 'Lý do hủy chuyến phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Lý do hủy chuyến tối đa 500 ký tự' })
  cancellationReason: string;

  @ApiPropertyOptional({ enum: LeaveNoticeStatus, description: 'Trạng thái mong đợi hiện tại (CAS check)' })
  @IsOptional()
  @IsEnum(LeaveNoticeStatus, { message: 'expectedStatus không hợp lệ' })
  expectedStatus?: LeaveNoticeStatus;
}
