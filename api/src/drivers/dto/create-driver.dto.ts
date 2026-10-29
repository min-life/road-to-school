import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  Matches,
} from 'class-validator';

export class CreateDriverDto {
  @ApiProperty({
    description: 'Họ và tên đầy đủ của tài xế',
    example: 'Trần Văn Lái',
  })
  @IsNotEmpty({ message: 'Họ và tên tài xế không được để trống' })
  @IsString({ message: 'Họ và tên tài xế phải là chuỗi ký tự' })
  fullName: string;

  @ApiProperty({
    description:
      'Email bắt buộc để nhận mật khẩu tài khoản tài xế',
    example: 'lai.tv@roadtoschool.vn',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsNotEmpty({ message: 'Email tài xế là bắt buộc để bàn giao mật khẩu' })
  @IsEmail({}, { message: 'Địa chỉ email tài xế không đúng định dạng' })
  email: string;

  @ApiPropertyOptional({
    description:
      'Số điện thoại liên hệ của tài xế (tùy chọn)',
    example: '0987654321',
  })
  @IsOptional()
  @Matches(/^(0|\+84)[0-9]{9,10}$/, {
    message: 'Số điện thoại tài xế không đúng định dạng (VD: 0987654321)',
  })
  phone?: string;
}
