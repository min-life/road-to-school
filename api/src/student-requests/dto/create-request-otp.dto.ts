import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum, IsObject } from 'class-validator';
import { RequestType } from '@prisma/client';

export class CreateRequestOtpDto {
  @ApiProperty({
    enum: RequestType,
    description: 'Loại yêu cầu cập nhật (INFORMATION_UPDATE hoặc ADDRESS_UPDATE)',
    example: RequestType.INFORMATION_UPDATE,
  })
  @IsNotEmpty({ message: 'Loại yêu cầu không được để trống' })
  @IsEnum(RequestType, { message: 'Loại yêu cầu không hợp lệ' })
  type: RequestType;

  @ApiProperty({
    description:
      'Dữ liệu đề xuất thay đổi. Đối với INFORMATION_UPDATE: { fullName?, guardianPhone? }. Đối với ADDRESS_UPDATE: { addressText, latitude, longitude }',
    example: { fullName: 'Nguyễn Văn Em Bé', guardianPhone: '0987654321' },
  })
  @IsNotEmpty({ message: 'Dữ liệu đề xuất không được để trống' })
  @IsObject({ message: 'Dữ liệu đề xuất phải là một đối tượng' })
  proposedData: Record<string, any>;
}
