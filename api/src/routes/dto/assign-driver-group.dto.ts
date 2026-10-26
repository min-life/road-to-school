import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AssignDriverGroupDto {
  @ApiProperty({
    description: 'ID phương tiện của nhóm tuyến cần gán tài xế',
    example: 'veh-uuid-1',
  })
  @IsNotEmpty({ message: 'vehicleId không được để trống' })
  @IsString({ message: 'vehicleId phải là chuỗi' })
  vehicleId: string;

  @ApiProperty({
    description: 'ID tài xế mặc định cho nhóm xe',
    example: 'user-driver-uuid-1',
  })
  @IsNotEmpty({ message: 'driverId không được để trống' })
  @IsString({ message: 'driverId phải là chuỗi' })
  driverId: string;
}
