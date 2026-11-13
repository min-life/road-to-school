import { Body, Controller, Get, Header, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthGuard } from '../../auth/auth.guard.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { IotScansService } from './iot-scans.service.js';
import { IotDeviceGuard } from '../security/iot-device.guard.js';
import { ListIotScansQueryDto, ReceiveIotScanDto } from '../dto/iot-request.dto.js';
import { IotScansResponseDto, ReceivedIotScanResponseDto } from '../dto/iot-response.dto.js';
import { ApiIotErrors } from '../iot-api-errors.js';

@ApiTags('IoT Scans')
@Controller('iot/scans')
export class IotScansController {
  constructor(private readonly scans: IotScansService) {}

  @Post()
  @HttpCode(200)
  @UseGuards(IotDeviceGuard)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'ESP32 gửi UID bằng HTTP; idempotent theo scanId', description: 'Chỉ khóa thiết bị, không dùng JWT quản trị. Không ghi điểm danh PostgreSQL. Cùng scanId/payload trả duplicate=true, không phát lại realtime.' })
  @ApiHeader({ name: 'X-IoT-Device-Key', required: true, description: 'Khóa riêng của deviceId được cấp khi đăng ký' })
  @ApiResponse({ status: 200, type: ReceivedIotScanResponseDto })
  @ApiIotErrors(400, 401, 404, 409, 503, 500)
  receive(@Body() dto: ReceiveIotScanDto) { return this.scans.receive(dto); }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.SYSTEM_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Lịch sử quẹt thẻ theo thời gian server ghi nhận, mới nhất trước' })
  @ApiResponse({ status: 200, type: IotScansResponseDto })
  @ApiIotErrors(400, 401, 403, 503, 500)
  list(@Query() query: ListIotScansQueryDto) { return this.scans.list(query); }
}
