import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { AuthGuard } from '../../auth/auth.guard.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../../auth/decorators/auth-user.decorator.js';
import { ApiIotErrors } from '../iot-api-errors.js';
import { ListIotQueryDto } from '../dto/iot-request.dto.js';
import {
  AssignIotVehicleDto,
  IotAssignmentHistoryDto,
  IotAssignmentStateDto,
  IotDeviceParamsDto,
  ReleaseIotVehicleDto,
} from './iot-assignment.dto.js';
import { IotAssignmentsService } from './iot-assignments.service.js';

@ApiTags('IoT Vehicle Assignments')
@ApiParam({ name: 'deviceId', description: 'Danh tính thiết bị đã đăng ký' })
@Controller('iot/devices/:deviceId')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.SYSTEM_ADMIN)
@ApiBearerAuth('JWT-auth')
export class IotAssignmentsController {
  constructor(private readonly assignments: IotAssignmentsService) {}
  @Get('vehicle-assignment')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Xe hiện tại và xác nhận cấu hình ESP32' })
  @ApiResponse({ status: 200, type: IotAssignmentStateDto })
  @ApiIotErrors(400, 401, 403, 404, 503, 500)
  current(@Param() params: IotDeviceParamsDto) {
    return this.assignments.current(params.deviceId);
  }
  @Get('vehicle-assignments')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Lịch sử gán xe, mới nhất trước; không xóa lịch sử khi chuyển xe',
  })
  @ApiResponse({ status: 200, type: IotAssignmentHistoryDto })
  @ApiIotErrors(400, 401, 403, 404, 503, 500)
  history(
    @Param() params: IotDeviceParamsDto,
    @Query() query: ListIotQueryDto,
  ) {
    return this.assignments.history(params.deviceId, query);
  }
  @Put('vehicle-assignment')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Gán/chuyển xe nguyên tử; expectedAssignmentId là null khi chưa gán',
    description:
      'Xe active, không chiếm xe khác, không chuyển xe có chuyến SCHEDULED/IN_PROGRESS frozen. Trùng cùng assignment/xe không tạo lịch sử mới. Chờ ACK thiết bị sau commit.',
  })
  @ApiResponse({ status: 200, type: IotAssignmentStateDto })
  @ApiIotErrors(400, 401, 403, 404, 409, 503, 500)
  change(
    @Param() params: IotDeviceParamsDto,
    @Body() dto: AssignIotVehicleDto,
    @CurrentUser() user: User,
  ) {
    return this.assignments.change(params.deviceId, user.id, dto);
  }
  @Delete('vehicle-assignment')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Tháo thiết bị khỏi xe; giữ nguyên scan, Wi-Fi và lịch sử',
  })
  @ApiResponse({ status: 200, type: IotAssignmentStateDto })
  @ApiIotErrors(400, 401, 403, 404, 409, 503, 500)
  release(
    @Param() params: IotDeviceParamsDto,
    @Body() dto: ReleaseIotVehicleDto,
    @CurrentUser() user: User,
  ) {
    return this.assignments.change(params.deviceId, user.id, dto);
  }
}
