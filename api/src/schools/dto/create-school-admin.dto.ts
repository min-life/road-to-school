import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsEmail,
  Matches,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function AtLeastOneIdentifier(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'atLeastOneIdentifier',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(_value: any, args: ValidationArguments) {
          const obj = args.object as Record<string, unknown>;
          const hasEmail =
            typeof obj.email === 'string' && obj.email.trim().length > 0;
          const hasPhone =
            typeof obj.phone === 'string' && obj.phone.trim().length > 0;
          return hasEmail || hasPhone;
        },
        defaultMessage() {
          return 'Bắt buộc phải cung cấp ít nhất Email hoặc Số điện thoại';
        },
      },
    });
  };
}

export class CreateSchoolAdminDto {
  @ApiProperty({
    description: 'Họ và tên đầy đủ của quản trị viên trường học (tối thiểu 2 ký tự)',
    example: 'Nguyễn Văn Hùng',
  })
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự' })
  @MinLength(2, { message: 'Họ và tên phải có tối thiểu 2 ký tự' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @AtLeastOneIdentifier({
    message: 'Bắt buộc phải cung cấp ít nhất Email hoặc Số điện thoại',
  })
  fullName: string;

  @ApiProperty({
    description: 'Email bắt buộc của nhân sự để nhận mật khẩu tài khoản',
    example: 'hung.nv@school.edu.vn',
  })
  @IsNotEmpty({ message: 'Email nhân sự là bắt buộc để bàn giao mật khẩu' })
  @IsEmail({}, { message: 'Địa chỉ email không đúng định dạng' })
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim().length > 0
      ? value.trim().toLowerCase()
      : undefined,
  )
  email: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại liên hệ của nhân sự (tùy chọn)',
    example: '0912345678',
  })
  @IsOptional()
  @Matches(/^(0|\+84|84)?[35789]\d{8}$/, {
    message:
      'Số điện thoại không đúng định dạng di động Việt Nam (ví dụ: 0912345678 hoặc +84912345678)',
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return trimmed.replace(/[\s\-().]/g, '');
  })
  phone?: string;
}
