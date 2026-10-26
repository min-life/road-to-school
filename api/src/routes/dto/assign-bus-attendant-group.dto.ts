import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AssignBusAttendantGroupDto {
  @ApiProperty({
    description: 'ID phương tiện của nhóm tuyến cần gán giáo viên giám sát',
    example: 'veh-uuid-1',
  })
  @IsNotEmpty({ message: 'vehicleId không được để trống' })
  @IsString({ message: 'vehicleId phải là chuỗi' })
  vehicleId: string;

  @ApiProperty({
    description: 'ID giáo viên giám sát mặc định cho nhóm xe (phải thuộc trường sở hữu)',
    example: 'user-teacher-uuid-1',
  })
  @IsNotEmpty({ message: 'busAttendantId không được để trống' })
  @IsString({ message: 'busAttendantId phải là chuỗi' })
  busAttendantId: string;
}
