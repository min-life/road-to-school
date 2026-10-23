import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  Matches,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class CreateStudentDto {
  @ApiProperty({
    description: 'Họ và tên đầy đủ của học sinh',
    example: 'Nguyễn Minh Quân',
  })
  @IsNotEmpty({ message: 'Họ và tên học sinh không được để trống' })
  @IsString({ message: 'Họ và tên học sinh phải là chuỗi ký tự' })
  fullName: string;

  @ApiProperty({
    description: 'Số điện thoại của người giám hộ (dùng để nhận OTP liên kết)',
    example: '0912345678',
  })
  @IsNotEmpty({ message: 'Số điện thoại người giám hộ không được để trống' })
  @Matches(/^(0|\+84)[0-9]{9,10}$/, {
    message: 'Số điện thoại người giám hộ không đúng định dạng (VD: 0912345678)',
  })
  guardianPhone: string;

  @ApiPropertyOptional({
    description: 'Địa chỉ đưa đón chi tiết của học sinh (tùy chọn)',
    example: 'Số 10 Nguyễn Trãi, Thanh Xuân, Hà Nội',
  })
  @IsOptional()
  @IsString({ message: 'Địa chỉ chi tiết phải là chuỗi ký tự' })
  addressText?: string;

  @ApiPropertyOptional({
    description: 'Vĩ độ vị trí đón/trả học sinh (từ -90 đến 90)',
    example: 21.002345,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Vĩ độ phải là số hợp lệ' })
  @Min(-90, { message: 'Vĩ độ tối thiểu là -90' })
  @Max(90, { message: 'Vĩ độ tối đa là 90' })
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Kinh độ vị trí đón/trả học sinh (từ -180 đến 180)',
    example: 105.823456,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Kinh độ phải là số hợp lệ' })
  @Min(-180, { message: 'Kinh độ tối thiểu là -180' })
  @Max(180, { message: 'Kinh độ tối đa là 180' })
  longitude?: number;
}
