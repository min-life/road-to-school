import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { LeaveNoticeStatus } from '@prisma/client';

export class AssignReplacementDto {
  @ApiProperty({ example: 'user-uuid-replacement', description: 'ID người dùng thay thế' })
  @IsNotEmpty({ message: 'replacementUserId không được để trống' })
  @IsUUID('4', { message: 'replacementUserId phải là UUID hợp lệ' })
  replacementUserId: string;

  @ApiPropertyOptional({ enum: LeaveNoticeStatus, description: 'Trạng thái mong đợi hiện tại (CAS check)' })
  @IsOptional()
  @IsEnum(LeaveNoticeStatus, { message: 'expectedStatus không hợp lệ' })
  expectedStatus?: LeaveNoticeStatus;
}
