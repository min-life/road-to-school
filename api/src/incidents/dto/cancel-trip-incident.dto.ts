import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CancelTripIncidentDto {
  @ApiProperty({
    description: 'Lý do hủy chuyến xe do không bố trí được nhân sự (bắt buộc, tối thiểu 3 ký tự)',
    example: 'Không tìm được tài xế thay thế kịp thời',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}
