import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AssignVehicleGroupDto {
  @ApiProperty({
    description: 'ID phương tiện hiện tại cần thay thế trong phương án',
    example: 'veh-old-uuid-1',
  })
  @IsNotEmpty({ message: 'currentVehicleId không được để trống' })
  @IsString({ message: 'currentVehicleId phải là chuỗi' })
  currentVehicleId: string;

  @ApiProperty({
    description: 'ID phương tiện mới thay thế cho nhóm tuyến',
    example: 'veh-new-uuid-2',
  })
  @IsNotEmpty({ message: 'newVehicleId không được để trống' })
  @IsString({ message: 'newVehicleId phải là chuỗi' })
  newVehicleId: string;
}
