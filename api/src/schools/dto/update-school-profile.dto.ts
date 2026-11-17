import { IsString, MinLength, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSchoolProfileDto {
  @ApiPropertyOptional({
    description: 'Tên trường học (tối thiểu 2 ký tự)',
    example: 'Trường Tiểu học Lê Quý Đôn',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Tên trường học phải là chuỗi ký tự' })
  @MinLength(2, { message: 'Tên trường học phải có ít nhất 2 ký tự' })
  name?: string;
}
