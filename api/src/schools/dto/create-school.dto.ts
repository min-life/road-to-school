import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsNumber,
  Min,
  Max,
  IsOptional,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { isValidCalendarDate } from '../schedule.validator.js';

export function IsCalendarDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCalendarDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return isValidCalendarDate(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} phải là ngày hợp lệ theo định dạng YYYY-MM-DD`;
        },
      },
    });
  };
}

export class CreateSchoolDto {
  @ApiProperty({
    description: 'Tên trường học (tối thiểu 2 ký tự)',
    example: 'Trường Tiểu học Lê Quý Đôn',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Tên trường học không được để trống' })
  @IsString({ message: 'Tên trường học phải là chuỗi ký tự' })
  @MinLength(2, { message: 'Tên trường học phải có ít nhất 2 ký tự' })
  name: string;

  @ApiProperty({
    description: 'Địa chỉ trường học chi tiết (tối thiểu 5 ký tự)',
    example: 'Số 14 đường Lê Đức Thọ, Phường Mỹ Đình 2, Nam Từ Liêm, Hà Nội',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Địa chỉ trường học không được để trống' })
  @IsString({ message: 'Địa chỉ trường học phải là chuỗi ký tự' })
  @MinLength(5, { message: 'Địa chỉ trường học phải có ít nhất 5 ký tự' })
  addressText: string;

  @ApiProperty({
    description: 'Tọa độ vĩ độ (Latitude, từ -90 đến 90)',
    example: 21.028511,
  })
  @Transform(({ value }) => {
    if (typeof value === 'string' && value.trim() === '') return NaN;
    return typeof value === 'string' ? Number(value) : value;
  })
  @IsNumber({}, { message: 'Vĩ độ (latitude) phải là một số hợp lệ' })
  @Min(-90, { message: 'Vĩ độ (latitude) phải nằm trong khoảng từ -90 đến 90' })
  @Max(90, { message: 'Vĩ độ (latitude) phải nằm trong khoảng từ -90 đến 90' })
  latitude: number;

  @ApiProperty({
    description: 'Tọa độ kinh độ (Longitude, từ -180 đến 180)',
    example: 105.772341,
  })
  @Transform(({ value }) => {
    if (typeof value === 'string' && value.trim() === '') return NaN;
    return typeof value === 'string' ? Number(value) : value;
  })
  @IsNumber({}, { message: 'Kinh độ (longitude) phải là một số hợp lệ' })
  @Min(-180, { message: 'Kinh độ (longitude) phải nằm trong khoảng từ -180 đến 180' })
  @Max(180, { message: 'Kinh độ (longitude) phải nằm trong khoảng từ -180 đến 180' })
  longitude: number;

  @ApiProperty({
    description: 'Ngày bắt đầu hợp đồng (định dạng YYYY-MM-DD)',
    example: '2026-09-01',
  })
  @IsNotEmpty({ message: 'Ngày bắt đầu hợp đồng không được để trống' })
  @IsCalendarDate({
    message: 'Ngày bắt đầu hợp đồng không hợp lệ hoặc sai định dạng YYYY-MM-DD',
  })
  contractStartDate: string;

  @ApiProperty({
    description: 'Ngày kết thúc hợp đồng (định dạng YYYY-MM-DD)',
    example: '2027-08-31',
  })
  @IsNotEmpty({ message: 'Ngày kết thúc hợp đồng không được để trống' })
  @IsCalendarDate({
    message: 'Ngày kết thúc hợp đồng không hợp lệ hoặc sai định dạng YYYY-MM-DD',
  })
  contractEndDate: string;

  @ApiProperty({
    description: 'Lịch học theo tuần dạng chuỗi JSON Object',
    example: '{"monday":{"start":"07:00","end":"17:30"},"tuesday":{"start":"07:00","end":"17:30"}}',
  })
  @IsNotEmpty({ message: 'Lịch học tuần không được để trống' })
  weeklySchedule: string;

  @ApiPropertyOptional({
    description: 'Tệp ảnh cổng trường học (JPEG, PNG, WebP, tối đa 5 MB)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  image?: any;
}
