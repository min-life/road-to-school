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
      'ESP32 lấy cấu hình có hiệu lực tối đa 60 giây',
    description: [
      'ATTENDANCE yêu cầu đúng một chuyến đủ điều kiện trên xe. Chế độ TEST cho phép ngày phục vụ bất kỳ. Các chế độ khác chỉ xét ngày hiện tại theo giờ Việt Nam.',
      'Trong ENROLLMENT, firmware 1.4.x nhận các trường gán xe null để tương thích. Liên kết xe thực tế được giữ và vẫn dùng để kiểm tra chuyến.',
    ].join(' '),
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
      'Xác nhận chế độ và lần gán xe hiện tại; kết thúc phiên đăng ký chưa xác nhận khi xe bận',
  })
  @ApiResponse({ status: 200, type: IotHeartbeatResponseDto })
  @ApiIotErrors(400, 401, 404, 409, 503, 500)
  heartbeat(@Param() params: IotDeviceParamsDto, @Body() dto: IotHeartbeatDto) {
    return this.runtime.heartbeat(params.deviceId, dto);
  }
}
