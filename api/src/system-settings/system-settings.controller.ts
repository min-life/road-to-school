import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SystemSettingsService } from './system-settings.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/auth-user.decorator.js';
import { Role, type User } from '@prisma/client';
import {
  UpdateParkingLotDto,
  ParkingLotResponseDto,
} from './dto/parking-lot.dto.js';

@ApiTags('System Settings')
@Controller('system-settings')
export class SystemSettingsController {
  constructor(private readonly settingsService: SystemSettingsService) {}

  @Get('parking-lot')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Lấy vị trí bãi đỗ xe trung tâm hiện tại',
    description: 'Truy vấn thông tin địa chỉ và tọa độ của bãi xe trung tâm duy nhất của nhà xe.',
  })
  @ApiResponse({
    status: 200,
    description: 'Thông tin bãi xe (hoặc null nếu chưa cấu hình)',
    type: ParkingLotResponseDto,
  })
  async getParkingLot(): Promise<ParkingLotResponseDto | null> {
    return this.settingsService.getParkingLot();
  }

  @Put('parking-lot')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.SYSTEM_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cập nhật vị trí bãi đỗ xe trung tâm (Chỉ SYSTEM_ADMIN)',
    description:
      'Cập nhật địa chỉ chi tiết và tọa độ VietMap của bãi xe trung tâm duy nhất của nhà xe.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
    type: ParkingLotResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu địa chỉ hoặc tọa độ không hợp lệ',
  })
  @ApiResponse({
    status: 403,
    description: 'Chỉ SYSTEM_ADMIN mới có quyền cập nhật cấu hình bãi xe',
  })
  async updateParkingLot(
    @CurrentUser() user: User,
    @Body() dto: UpdateParkingLotDto,
  ): Promise<ParkingLotResponseDto> {
    return this.settingsService.updateParkingLot(dto, user.id);
  }
}
