import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
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
  ParkingLotImpactDto,
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

  @Get('parking-lot/impact')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.SYSTEM_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Đánh giá tác động trước khi thay đổi vị trí bãi đỗ xe trung tâm (Chỉ SYSTEM_ADMIN)',
    description:
      'Trả về số lượng phương án tuyến DRAFT/ACTIVE và chuyến xe SCHEDULED toàn hệ thống sẽ bị hủy nếu vị trí bãi xe thay đổi.',
  })
  @ApiQuery({ name: 'latitude', required: false, description: 'Vĩ độ mới dự kiến' })
  @ApiQuery({ name: 'longitude', required: false, description: 'Kinh độ mới dự kiến' })
  @ApiResponse({
    status: 200,
    description: 'Đánh giá tác động thành công',
    type: ParkingLotImpactDto,
  })
  async getParkingLotImpact(
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
  ): Promise<ParkingLotImpactDto> {
    const lat = latitude !== undefined && latitude !== '' ? parseFloat(latitude) : undefined;
    const lng = longitude !== undefined && longitude !== '' ? parseFloat(longitude) : undefined;
    return this.settingsService.getParkingLotImpact(lat, lng);
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
