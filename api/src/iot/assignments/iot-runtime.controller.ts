import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IotDeviceGuard } from '../security/iot-device.guard.js';
import { ApiIotErrors } from '../iot-api-errors.js';
import {
  IotDeviceParamsDto,
  IotHeartbeatDto,
  IotHeartbeatResponseDto,
  IotRuntimeConfigDto,
} from './iot-assignment.dto.js';
import { IotRuntimeService } from './iot-runtime.service.js';
@ApiTags('IoT Runtime')
@Controller('iot/devices/:deviceId')
@UseGuards(IotDeviceGuard)
@ApiParam({ name: 'deviceId', description: 'Danh tính thiết bị đã đăng ký' })
@ApiHeader({
  name: 'X-IoT-Device-Key',
  required: true,
  description: 'Khóa đúng thiết bị; không dùng JWT admin',
})
export class IotRuntimeController {
  constructor(private readonly runtime: IotRuntimeService) {}
  @Get('runtime-config')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'ESP32 lấy cấu hình xe runtime, hiệu lực60giây; null là POC chưa gán xe',
  })
  @ApiResponse({ status: 200, type: IotRuntimeConfigDto })
  @ApiIotErrors(400, 401, 404, 503, 500)
  config(@Param() params: IotDeviceParamsDto) {
    return this.runtime.config(params.deviceId);
  }
  @Post('heartbeat')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'ACK assignment đang dùng; chỉ cập nhật telemetry Mongo, không thay mapping xe',
  })
  @ApiResponse({ status: 200, type: IotHeartbeatResponseDto })
  @ApiIotErrors(400, 401, 404, 409, 503, 500)
  heartbeat(@Param() params: IotDeviceParamsDto, @Body() dto: IotHeartbeatDto) {
    return this.runtime.heartbeat(params.deviceId, dto);
  }
}
