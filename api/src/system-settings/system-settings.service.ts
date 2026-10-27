import { notifyPlan } from '../notifications/notification-events.js';
import { notifyCancelledTrips } from '../notifications/notification-writer.js';
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { RoutePlanStatus, TripStatus, LeaveNoticeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateParkingLotDto, ParkingLotResponseDto, ParkingLotImpactDto } from './dto/parking-lot.dto.js';

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
   * Đánh giá tác động trước khi thay đổi vị trí bãi đỗ xe trung tâm toàn hệ thống
   */
  async getParkingLotImpact(targetLatitude?: number, targetLongitude?: number): Promise<ParkingLotImpactDto> {
    const current = await this.getParkingLot();

    const plans = await this.prisma.routePlan.findMany({
      where: {
        status: { in: [RoutePlanStatus.DRAFT, RoutePlanStatus.ACTIVE] },
      },
      include: {
        routes: { select: { id: true } },
      },
    });

    const routeIds = plans.flatMap((p) => p.routes.map((r) => r.id));
    let totalScheduledTripsCount = 0;
    let totalInProgressTripsCount = 0;

    if (routeIds.length > 0) {
      totalScheduledTripsCount = await this.prisma.trip.count({
        where: {
          routeId: { in: routeIds },
          status: TripStatus.SCHEDULED,
        },
      });
      totalInProgressTripsCount = await this.prisma.trip.count({
        where: {
          routeId: { in: routeIds },
          status: TripStatus.IN_PROGRESS,
        },
      });
    }

    const totalDraftPlansCount = plans.filter((p) => p.status === RoutePlanStatus.DRAFT).length;
    const totalActivePlansCount = plans.filter((p) => p.status === RoutePlanStatus.ACTIVE).length;
    const cancelledPlansCount = totalDraftPlansCount + totalActivePlansCount;

    const expectedFingerprint = createHash('sha256')
      .update(
        JSON.stringify([
          current.addressText,
          current.latitude,
          current.longitude,
          totalDraftPlansCount,
          totalActivePlansCount,
          totalScheduledTripsCount,
        ]),
      )
      .digest('hex');

    const hasCoordinateChanged =
      targetLatitude !== undefined && targetLongitude !== undefined
        ? Math.abs(current.latitude - targetLatitude) > 1e-6 ||
          Math.abs(current.longitude - targetLongitude) > 1e-6
        : true;

    return {
      currentAddressText: current.addressText,
      currentLatitude: current.latitude,
      currentLongitude: current.longitude,
      hasCoordinateChanged,
      totalDraftPlansCount,
      totalActivePlansCount,
      cancelledPlansCount,
      totalScheduledTripsCount,
      cancelledTripsCount: totalScheduledTripsCount,
      totalInProgressTripsCount,
      inProgressTripsPreservedCount: totalInProgressTripsCount,
      expectedFingerprint,
      fingerprint: expectedFingerprint,
    };
  }

  /**
   * Cập nhật vị trí bãi đỗ xe trung tâm (Chỉ SYSTEM_ADMIN)
   * PO nhấn mạnh riêng: đổi vị trí bãi bắt buộc hủy mọi phương án DRAFT/ACTIVE toàn hệ thống và Trip SCHEDULED liên quan.
   * Nếu chỉ sửa nhãn địa chỉ mà tọa độ không đổi -> không hủy phương án.
   */
  async updateParkingLot(
    dto: UpdateParkingLotDto,
    userId: string,
  ): Promise<ParkingLotResponseDto & { cancelledPlansCount?: number; cancelledTripsCount?: number }> {
    if (!dto.addressText || !dto.addressText.trim()) {
      throw new BadRequestException('Địa chỉ bãi xe không được để trống');
    }

    if (dto.latitude === undefined || isNaN(dto.latitude) || dto.latitude < -90 || dto.latitude > 90) {
      throw new BadRequestException('Vĩ độ phải nằm trong khoảng từ -90 đến 90');
    }

    if (dto.longitude === undefined || isNaN(dto.longitude) || dto.longitude < -180 || dto.longitude > 180) {
      throw new BadRequestException('Kinh độ phải nằm trong khoảng từ -180 đến 180');
    }

    const current = await this.getParkingLot();
    const coordsChanged =
      Math.abs(current.latitude - dto.latitude) > 1e-6 ||
      Math.abs(current.longitude - dto.longitude) > 1e-6;

    const value = {
      addressText: dto.addressText.trim(),
      latitude: dto.latitude,
      longitude: dto.longitude,
    };

    if (!coordsChanged) {
      // Chỉ cập nhật nhãn địa chỉ -> không cascade
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

      return {
        addressText: dto.addressText.trim(),
        latitude: dto.latitude,
        longitude: dto.longitude,
        updatedAt: setting.updatedAt.toISOString(),
        cancelledPlansCount: 0,
        cancelledTripsCount: 0,
      };
    }

    // Tọa độ bãi xe thay đổi -> Hủy toàn bộ phương án DRAFT/ACTIVE toàn hệ thống và các chuyến xe SCHEDULED liên quan
    const reason = dto.reason || `Bãi xe trung tâm thay đổi vị trí sang ${dto.addressText.trim()}`;

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Tìm toàn bộ DRAFT và ACTIVE plans trên toàn hệ thống
      const plans = await tx.routePlan.findMany({
        where: {
          status: { in: [RoutePlanStatus.DRAFT, RoutePlanStatus.ACTIVE] },
        },
        include: {
          routes: { select: { id: true } },
        },
      });

      const planIds = plans.map((p) => p.id);
      const routeIds = plans.flatMap((p) => p.routes.map((r) => r.id));
      let cancelledTripsCount = 0;

      // 2. Hủy các chuyến xe SCHEDULED liên quan
      if (routeIds.length > 0) {
        const scheduledTrips = await tx.trip.findMany({
          where: {
            routeId: { in: routeIds },
            status: TripStatus.SCHEDULED,
          },
          select: { id: true },
        });

        cancelledTripsCount = scheduledTrips.length;
        const tripIds = scheduledTrips.map((t) => t.id);

        if (tripIds.length > 0) {
          await tx.trip.updateMany({
            where: { id: { in: tripIds } },
            data: {
              status: TripStatus.CANCELLED,
              cancellationReason: reason,
              cancelledAt: new Date(),
              cancelledById: userId,
            },
          });

          await notifyCancelledTrips(tx, tripIds, 'location:' + planIds.slice().sort().join(':'), userId);
          await tx.leaveNotice.updateMany({
            where: {
              tripId: { in: tripIds },
              status: LeaveNoticeStatus.PENDING_REPLACEMENT,
            },
            data: {
              status: LeaveNoticeStatus.TRIP_CANCELLED,
              processedAt: new Date(),
              processedById: userId,
            },
          });
        }
      }

      // 3. Hủy toàn bộ RoutePlan DRAFT và ACTIVE
      if (planIds.length > 0) {
        await tx.routePlan.updateMany({
          where: { id: { in: planIds } },
          data: {
            status: RoutePlanStatus.CANCELLED,
            cancellationReason: reason,
            cancelledAt: new Date(),
            cancelledById: userId,
          },
        });
      }

      for (const planId of planIds) await notifyPlan(tx, planId, userId);
      // 4. Cập nhật vị trí bãi xe
      const setting = await tx.systemSetting.upsert({
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

      return {
        setting,
        cancelledPlansCount: planIds.length,
        cancelledTripsCount,
      };
    });

    this.logger.log(
      `Vị trí bãi xe trung tâm đã thay đổi: Hủy ${result.cancelledPlansCount} plans toàn hệ thống và ${result.cancelledTripsCount} trips SCHEDULED.`,
    );

    return {
      addressText: dto.addressText.trim(),
      latitude: dto.latitude,
      longitude: dto.longitude,
      updatedAt: result.setting.updatedAt.toISOString(),
      cancelledPlansCount: result.cancelledPlansCount,
      cancelledTripsCount: result.cancelledTripsCount,
    };
  }
}
