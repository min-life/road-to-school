import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { StudentStatus } from '@prisma/client';

export class UpdateStudentStatusDto {
  @ApiProperty({
    description: 'Trạng thái hoạt động mới của học sinh (AVAILABLE hoặc DISABLED)',
    enum: StudentStatus,
    example: StudentStatus.DISABLED,
  })
  @IsNotEmpty({ message: 'Trạng thái hoạt động không được để trống' })
  @IsEnum(StudentStatus, {
    message: 'Trạng thái học sinh phải là AVAILABLE hoặc DISABLED',
  })
  status: StudentStatus;
}
