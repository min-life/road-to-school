import { Body, Controller, Get, Header, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthGuard } from '../../auth/auth.guard.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { IotDevicesService } from './iot-devices.service.js';
import { ListIotQueryDto, RegisterIotDeviceDto } from '../dto/iot-request.dto.js';
import { IotDevicesResponseDto, ProvisionedIotDeviceResponseDto, RegisteredIotDeviceResponseDto } from '../dto/iot-response.dto.js';
import { ApiIotErrors } from '../iot-api-errors.js';

@ApiTags('IoT Devices')
@Controller('iot/devices')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.SYSTEM_ADMIN)
@ApiBearerAuth('JWT-auth')
export class IotDevicesController {
  constructor(private readonly devices: IotDevicesService) {}

  @Post('provision')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Tự cấp cấu hình ESP32 qua USB', description: 'SYSTEM_ADMIN. Đăng ký nếu chưa có; thiết bị cũ không bị sửa và được cấp lại cùng khóa. URL lấy từ cấu hình máy chủ, không tin Host/Forwarded header. MAC phải khớp deviceId. Trả 503 khi URL/khóa/MongoDB chưa sẵn sàng; 409 khi bản đăng ký không khớp MAC.' })
  @ApiResponse({ status: 200, type: ProvisionedIotDeviceResponseDto })
  @ApiIotErrors(400, 401, 403, 409, 503, 500)
  provision(@Body() dto: RegisterIotDeviceDto) { return this.devices.provision(dto); }

  @Post('register')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Đăng ký ESP32; trả khóa thiết bị để cấu hình qua USB' })
  @ApiResponse({ status: 201, type: RegisteredIotDeviceResponseDto })
  @ApiIotErrors(400, 401, 403, 409, 503, 500)
  register(@Body() dto: RegisterIotDeviceDto) { return this.devices.register(dto); }

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Danh sách thiết bị IoT, phân trang, mới đăng ký trước' })
  @ApiResponse({ status: 200, type: IotDevicesResponseDto })
  @ApiIotErrors(400, 401, 403, 503, 500)
  list(@Query() query: ListIotQueryDto) { return this.devices.list(query); }
}
