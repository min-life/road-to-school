import { EffectiveDateDto } from './effective-date.dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateSchoolStatusDto extends EffectiveDateDto {
  @ApiProperty({
    description: 'Trạng thái hoạt động của trường học (true: Hoạt động, false: Ngừng hoạt động)',
    example: false,
  })
  @IsNotEmpty({ message: 'Trạng thái hoạt động không được để trống' })
  @IsBoolean({ message: 'Trạng thái hoạt động phải là giá trị boolean (true hoặc false)' })
  isActive: boolean;
}
