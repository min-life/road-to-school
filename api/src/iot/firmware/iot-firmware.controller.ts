import { Controller, Get, Header, ServiceUnavailableException, StreamableFile, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import { open } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Role } from '@prisma/client';
import { AuthGuard } from '../../auth/auth.guard.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { ApiIotErrors } from '../iot-api-errors.js';

@ApiTags('IoT Firmware')
@Controller('iot/firmware')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.SYSTEM_ADMIN)
@ApiBearerAuth('JWT-auth')
export class IotFirmwareController {
  constructor(private readonly config: ConfigService) {}

  @Get('latest.bin')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Tải firmware .bin được cấu hình sẵn; chưa có file thật thì trả 503', description: 'Không nhận path từ request. Firmware build/manifest/flash offsets thực hiện tại bước firmware, không dùng file placeholder.' })
  @ApiProduces('application/octet-stream')
  @ApiResponse({ status: 200, schema: { type: 'string', format: 'binary' } })
  @ApiIotErrors(401, 403, 503, 500)
  async latest(): Promise<StreamableFile> {
    const path = this.config.get<string>('IOT_FIRMWARE_PATH');
    if (!path || !path.toLowerCase().endsWith('.bin')) {
      throw new ServiceUnavailableException('Firmware IoT chưa sẵn sàng');
    }
    try {
      const file = await open(resolve(path), 'r');
      try {
        const stat = await file.stat();
        if (!stat.isFile() || stat.size === 0 || stat.size > 16 * 1024 * 1024) throw new Error();
        const binary = await file.readFile();
        return new StreamableFile(binary, {
          type: 'application/octet-stream', disposition: 'attachment; filename="firmware.bin"', length: binary.length,
        });
      } finally { await file.close(); }
    } catch { throw new ServiceUnavailableException('Firmware IoT chưa sẵn sàng'); }
  }
}
