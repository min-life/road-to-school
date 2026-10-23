import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateParkingLotDto, ParkingLotResponseDto } from './dto/parking-lot.dto.js';

@Injectable()
export class SystemSettingsService {
  private readonly logger = new Logger(SystemSettingsService.name);
  private static readonly PARKING_LOT_KEY = 'PARKING_LOT';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy thông tin vị trí bãi đỗ xe trung tâm
   */
  async getParkingLot(): Promise<ParkingLotResponseDto> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: SystemSettingsService.PARKING_LOT_KEY },
    });

    if (!setting || !setting.value) {
      return {
        addressText: 'Bãi đỗ xe trung tâm TP. Hồ Chí Minh',
        latitude: 10.776889,
        longitude: 106.700806,
        updatedAt: null as any,
      };
    }

    const val = setting.value as any;
    return {
      addressText: val.addressText || '',
      latitude: Number(val.latitude) || 0,
      longitude: Number(val.longitude) || 0,
      updatedAt: setting.updatedAt ? setting.updatedAt.toISOString() : (null as any),
    };
  }

  /**
   * Cập nhật vị trí bãi đỗ xe trung tâm (Chỉ SYSTEM_ADMIN)
   */
  async updateParkingLot(
    dto: UpdateParkingLotDto,
    userId: string,
  ): Promise<ParkingLotResponseDto> {
    if (!dto.addressText || !dto.addressText.trim()) {
      throw new BadRequestException('Địa chỉ bãi xe không được để trống');
    }

    if (dto.latitude === undefined || isNaN(dto.latitude) || dto.latitude < -90 || dto.latitude > 90) {
      throw new BadRequestException('Vĩ độ phải nằm trong khoảng từ -90 đến 90');
    }

    if (dto.longitude === undefined || isNaN(dto.longitude) || dto.longitude < -180 || dto.longitude > 180) {
      throw new BadRequestException('Kinh độ phải nằm trong khoảng từ -180 đến 180');
    }

    const value = {
      addressText: dto.addressText.trim(),
      latitude: dto.latitude,
      longitude: dto.longitude,
    };

    const setting = await this.prisma.systemSetting.upsert({
      where: { key: SystemSettingsService.PARKING_LOT_KEY },
      create: {
        key: SystemSettingsService.PARKING_LOT_KEY,
        value,
        updatedById: userId,
      },
      update: {
        value,
        updatedById: userId,
      },
    });

    this.logger.log(`Vị trí bãi xe trung tâm đã được cập nhật bởi user ${userId}: ${dto.addressText}`);

    return {
      addressText: dto.addressText.trim(),
      latitude: dto.latitude,
      longitude: dto.longitude,
      updatedAt: setting.updatedAt.toISOString(),
    };
  }
}
