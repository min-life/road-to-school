import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Matches } from 'class-validator';
import { STUDENT_CODE_REGEX } from '../../students/utils/student-code.generator.js';

export class RequestLinkOtpDto {
  @ApiProperty({
    description:
      'Mã học sinh gồm 11 ký tự (tiền tố STU + 8 ký tự alphanumeric, có cả chữ và số)',
    example: 'STUA7B3C9D2',
  })
  @IsNotEmpty({ message: 'Mã học sinh không được để trống' })
  @Matches(STUDENT_CODE_REGEX, {
    message:
      'Mã học sinh không đúng định dạng (STU + 8 ký tự chữ và số, ví dụ STUA7B3C9D2)',
  })
  studentCode: string;
}

export class RequestLinkOtpResponseDto {
  @ApiProperty({
    description: 'Mã thử thách xác thực OTP (Challenge ID)',
    example: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  challengeId: string;

  @ApiProperty({
    description: 'Số điện thoại người giám hộ đã được ẩn bớt ký tự để đối chiếu',
    example: '091****678',
  })
  maskedPhone: string;

  @ApiProperty({
    description: 'Thời gian hiệu lực của mã OTP tính bằng giây',
    example: 300,
  })
  expiresInSeconds: number;

  @ApiProperty({
    description: 'Thông báo kết quả',
    example: 'Mã xác thực đã được gửi đến số điện thoại người giám hộ',
  })
  message: string;
}
