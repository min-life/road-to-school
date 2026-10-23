import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  Matches,
  ValidateIf,
} from 'class-validator';

export class CreateDriverDto {
  @ApiProperty({
    description: 'Họ và tên đầy đủ của tài xế',
    example: 'Trần Văn Lái',
  })
  @IsNotEmpty({ message: 'Họ và tên tài xế không được để trống' })
  @IsString({ message: 'Họ và tên tài xế phải là chuỗi ký tự' })
  fullName: string;

  @ApiPropertyOptional({
    description:
      'Địa chỉ email của tài xế (bắt buộc nếu không có số điện thoại)',
    example: 'lai.tv@roadtoschool.vn',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Địa chỉ email tài xế không đúng định dạng' })
  email?: string;

  @ApiPropertyOptional({
    description:
      'Số điện thoại di động của tài xế (bắt buộc nếu không có email)',
    example: '0987654321',
  })
  @IsOptional()
  @Matches(/^(0|\+84)[0-9]{9,10}$/, {
    message: 'Số điện thoại tài xế không đúng định dạng (VD: 0987654321)',
  })
  phone?: string;
}
