import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Email hoặc số điện thoại của tài khoản',
    example: 'admin@r2s.com',
  })
  @IsNotEmpty({ message: 'Email hoặc số điện thoại không được để trống' })
  @IsString({ message: 'Thông tin đăng nhập phải là chuỗi ký tự' })
  identifier: string;

  @ApiProperty({
    description: 'Mật khẩu tài khoản (tối thiểu 6 ký tự)',
    example: 'Pass@123',
  })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @MinLength(6, { message: 'Mật khẩu phải có tối thiểu 6 ký tự' })
  password: string;
}

export class RegisterRequestOtpDto {
  @ApiProperty({
    description: 'Email hoặc số điện thoại của Phụ huynh để nhận mã xác thực',
    example: 'parent@example.com',
  })
  @IsNotEmpty({ message: 'Email hoặc số điện thoại không được để trống' })
  @IsString({ message: 'Thông tin đăng ký phải là chuỗi ký tự' })
  identifier: string;
}

export class RegisterVerifyDto {
  @ApiProperty({
    description: 'Email hoặc số điện thoại đã yêu cầu mã OTP',
    example: 'parent@example.com',
  })
  @IsNotEmpty({ message: 'Email hoặc số điện thoại không được để trống' })
  @IsString({ message: 'Thông tin đăng ký phải là chuỗi ký tự' })
  identifier: string;

  @ApiProperty({
    description: 'Mã xác thực OTP gồm 6 chữ số',
    example: '123456',
  })
  @IsNotEmpty({ message: 'Mã xác thực OTP không được để trống' })
  @IsString({ message: 'Mã OTP phải là chuỗi ký tự' })
  @Length(6, 6, { message: 'Mã xác thực OTP phải gồm đúng 6 chữ số' })
  otp: string;

  @ApiProperty({
    description: 'Họ và tên đầy đủ của Phụ huynh',
    example: 'Trần Thị B',
  })
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự' })
  @MinLength(2, { message: 'Họ và tên phải có tối thiểu 2 ký tự' })
  fullName: string;

  @ApiProperty({
    description: 'Mật khẩu đăng nhập (tối thiểu 6 ký tự)',
    example: 'SecurePass@123',
  })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @MinLength(6, { message: 'Mật khẩu phải có tối thiểu 6 ký tự' })
  password: string;

  @ApiProperty({
    description: 'Xác nhận lại mật khẩu',
    example: 'SecurePass@123',
  })
  @IsNotEmpty({ message: 'Xác nhận mật khẩu không được để trống' })
  @IsString({ message: 'Xác nhận mật khẩu phải là chuỗi ký tự' })
  confirmPassword: string;
}

export class ForgotPasswordRequestOtpDto {
  @ApiProperty({
    description: 'Email hoặc số điện thoại của tài khoản cần đặt lại mật khẩu',
    example: 'user@example.com',
  })
  @IsNotEmpty({ message: 'Email hoặc số điện thoại không được để trống' })
  @IsString({ message: 'Thông tin tài khoản phải là chuỗi ký tự' })
  identifier: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Email hoặc số điện thoại đã yêu cầu đặt lại mật khẩu',
    example: 'user@example.com',
  })
  @IsNotEmpty({ message: 'Email hoặc số điện thoại không được để trống' })
  @IsString({ message: 'Thông tin tài khoản phải là chuỗi ký tự' })
  identifier: string;

  @ApiProperty({
    description: 'Mã xác thực OTP gồm 6 chữ số',
    example: '654321',
  })
  @IsNotEmpty({ message: 'Mã xác thực OTP không được để trống' })
  @IsString({ message: 'Mã OTP phải là chuỗi ký tự' })
  @Length(6, 6, { message: 'Mã xác thực OTP phải gồm đúng 6 chữ số' })
  otp: string;

  @ApiProperty({
    description: 'Mật khẩu mới (tối thiểu 6 ký tự)',
    example: 'NewSecurePass@123',
  })
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @IsString({ message: 'Mật khẩu mới phải là chuỗi ký tự' })
  @MinLength(6, { message: 'Mật khẩu mới phải có tối thiểu 6 ký tự' })
  newPassword: string;

  @ApiProperty({
    description: 'Xác nhận lại mật khẩu mới',
    example: 'NewSecurePass@123',
  })
  @IsNotEmpty({ message: 'Xác nhận mật khẩu mới không được để trống' })
  @IsString({ message: 'Xác nhận mật khẩu mới phải là chuỗi ký tự' })
  confirmPassword: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh Token được cấp khi đăng nhập hoặc làm mới gần nhất',
    example: 'random-64-hex-refresh-token-string',
  })
  @IsNotEmpty({ message: 'Refresh Token không được để trống' })
  @IsString({ message: 'Refresh Token phải là chuỗi ký tự' })
  refreshToken: string;
}

export class UserResponseDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  fullName: string;

  @ApiProperty({ example: 'admin@r2s.com', nullable: true })
  email: string | null;

  @ApiProperty({ example: '0901234567', nullable: true })
  phone: string | null;

  @ApiProperty({ example: null, nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ example: 'SYSTEM_ADMIN', enum: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN', 'DRIVER', 'BUS_ATTENDANT', 'PARENT'] })
  role: string;

  @ApiProperty({ example: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721', nullable: true })
  schoolId: string | null;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT Access Token dùng để gọi các API được bảo vệ (thời hạn 15 phút)' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh Token dùng để xoay vòng lấy cặp Token mới (thời hạn 7 ngày)' })
  refreshToken: string;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}

export class TokenPairResponseDto {
  @ApiProperty({ description: 'JWT Access Token mới (thời hạn 15 phút)' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh Token mới (thời hạn 7 ngày)' })
  refreshToken: string;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Thao tác thành công' })
  message: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Mật khẩu hiện tại của tài khoản', example: 'Pass@123' })
  @IsNotEmpty({ message: 'Mật khẩu hiện tại không được để trống' })
  @IsString({ message: 'Mật khẩu hiện tại phải là chuỗi ký tự' })
  currentPassword: string;

  @ApiProperty({ description: 'Mật khẩu mới (tối thiểu 6 ký tự)', example: 'NewSecurePass@123' })
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @IsString({ message: 'Mật khẩu mới phải là chuỗi ký tự' })
  @MinLength(6, { message: 'Mật khẩu mới phải có tối thiểu 6 ký tự' })
  newPassword: string;
}

export class UpdateParentNameDto {
  @ApiProperty({ description: 'Họ và tên đầy đủ của Phụ huynh', example: 'Nguyễn Văn Phụ Huynh' })
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự' })
  @MinLength(2, { message: 'Họ và tên phải có tối thiểu 2 ký tự' })
  fullName: string;
}

export class AvatarResponseDto {
  @ApiProperty({ description: 'Đường dẫn ảnh đại diện mới', example: 'https://res.cloudinary.com/demo/image/upload/v1/roadtoschool/avatars/avatar_123.jpg' })
  avatarUrl: string;

  @ApiProperty({ example: 'Cập nhật ảnh đại diện thành công' })
  message: string;
}

