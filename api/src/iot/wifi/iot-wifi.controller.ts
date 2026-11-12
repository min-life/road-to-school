import { Body, Controller, Header, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthGuard } from '../../auth/auth.guard.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { IotWifiService } from './iot-wifi.service.js';
import { SaveIotWifiDto } from '../dto/iot-request.dto.js';
import { IotWifiResponseDto } from '../dto/iot-response.dto.js';
import { ApiIotErrors } from '../iot-api-errors.js';

@ApiTags('IoT Wi-Fi')
@Controller('iot/wifi')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.SYSTEM_ADMIN)
@ApiBearerAuth('JWT-auth')
export class IotWifiController {
  constructor(private readonly wifi: IotWifiService) {}

  @Post('save')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Lưu Wi-Fi mã hóa AES-256-GCM; chưa gửi xuống thiết bị', description: 'Response chỉ có mask. isConfigured=false vì chưa có ACK từ ESP32. Không cung cấp API tải lại mật khẩu.' })
  @ApiResponse({ status: 200, type: IotWifiResponseDto })
  @ApiIotErrors(400, 401, 403, 404, 503, 500)
  save(@Body() dto: SaveIotWifiDto) { return this.wifi.save(dto); }
}
