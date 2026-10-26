import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class ConfirmLeaveNoticeDto {
  @ApiProperty({ example: 'challenge-uuid-1', description: 'ID thử thách OTP' })
  @IsNotEmpty({ message: 'challengeId không được để trống' })
  @IsUUID('4', { message: 'challengeId phải là UUID hợp lệ' })
  challengeId: string;

  @ApiProperty({ example: '123456', description: 'Mã xác thực OTP 6 chữ số' })
  @IsNotEmpty({ message: 'otp không được để trống' })
  @IsString({ message: 'otp phải là chuỗi ký tự' })
  @Length(4, 8, { message: 'Mã OTP phải có từ 4 đến 8 chữ số' })
  otp: string;

  @ApiProperty({ example: 'trip-uuid-1', description: 'ID chuyến xe đã chọn' })
  @IsNotEmpty({ message: 'tripId không được để trống' })
  @IsUUID('4', { message: 'tripId phải là UUID hợp lệ' })
  tripId: string;

  @ApiPropertyOptional({ example: 'stu-uuid-1', description: 'ID học sinh (bắt buộc khi Phụ huynh gửi yêu cầu)' })
  @IsOptional()
  @IsUUID('4', { message: 'studentId phải là UUID hợp lệ' })
  studentId?: string;

  @ApiPropertyOptional({ example: 'Học sinh bị ốm', description: 'Lý do báo nghỉ tùy chọn' })
  @IsOptional()
  @IsString({ message: 'reason phải là chuỗi ký tự' })
  reason?: string;
}
