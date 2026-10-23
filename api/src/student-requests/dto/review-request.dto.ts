import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewRequestDto {
  @ApiPropertyOptional({
    description: 'Lý do từ chối yêu cầu (tùy chọn, tối đa 500 ký tự)',
    example: 'Địa chỉ đề xuất nằm ngoài phạm vi đưa đón của tuyến xe hiện tại',
  })
  @IsOptional()
  @IsString({ message: 'Lý do từ chối phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Lý do từ chối không được vượt quá 500 ký tự' })
  rejectionReason?: string;
}
