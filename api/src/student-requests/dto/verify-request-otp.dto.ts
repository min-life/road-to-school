import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsObject, Length } from 'class-validator';
import { RequestType } from '@prisma/client';

export class VerifyRequestOtpDto {
  @ApiProperty({
    description: 'Mã định danh thử thách OTP (UUID)',
    example: 'uuid-challenge-id',
  })
  @IsNotEmpty({ message: 'Challenge ID không được để trống' })
  @IsString({ message: 'Challenge ID phải là chuỗi ký tự' })
  challengeId: string;

  @ApiProperty({
    description: 'Mã xác thực OTP gồm 6 chữ số',
    example: '123456',
  })
  @IsNotEmpty({ message: 'Mã OTP không được để trống' })
  @IsString({ message: 'Mã OTP phải là chuỗi ký tự' })
  @Length(6, 6, { message: 'Mã OTP phải gồm đúng 6 chữ số' })
  otp: string;

  @ApiProperty({
    enum: RequestType,
    description: 'Loại yêu cầu cập nhật',
    example: RequestType.INFORMATION_UPDATE,
  })
  @IsNotEmpty({ message: 'Loại yêu cầu không được để trống' })
  @IsEnum(RequestType, { message: 'Loại yêu cầu không hợp lệ' })
  type: RequestType;

  @ApiProperty({
    description: 'Dữ liệu đề xuất thay đổi (phải khớp 100% với dữ liệu lúc yêu cầu OTP)',
    example: { fullName: 'Nguyễn Văn Em Bé', guardianPhone: '0987654321' },
  })
  @IsNotEmpty({ message: 'Dữ liệu đề xuất không được để trống' })
  @IsObject({ message: 'Dữ liệu đề xuất phải là một đối tượng' })
  proposedData: Record<string, any>;
}
