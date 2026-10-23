import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, Matches } from 'class-validator';

export class VerifyLinkOtpDto {
  @ApiProperty({
    description: 'Mã thử thách OTP nhận được từ API request-link-requests',
    example: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  @IsNotEmpty({ message: 'Mã thử thách OTP không được để trống' })
  @IsUUID('4', { message: 'Mã thử thách OTP phải đúng định dạng UUID' })
  challengeId: string;

  @ApiProperty({
    description: 'Mã OTP gồm 6 chữ số gửi qua SMS tới người giám hộ',
    example: '123456',
  })
  @IsNotEmpty({ message: 'Mã xác thực OTP không được để trống' })
  @Matches(/^[0-9]{4,8}$/, {
    message: 'Mã xác thực OTP phải là chuỗi từ 4 đến 8 chữ số',
  })
  otp: string;
}

export class VerifyLinkOtpResponseDto {
  @ApiProperty({
    description: 'Thông báo kết quả liên kết',
    example: 'Liên kết học sinh thành công',
  })
  message: string;

  @ApiProperty({
    description: 'Mã định danh duy nhất của học sinh vừa liên kết',
    example: 's1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  studentId: string;

  @ApiProperty({
    description: 'Mã học sinh',
    example: 'STUA7B3C9D2',
  })
  code: string;

  @ApiProperty({
    description: 'Họ và tên học sinh',
    example: 'Nguyễn Minh Quân',
  })
  fullName: string;
}
