import { notifyPlan } from '../notifications/notification-events.js';
import { notifyCancelledTrips } from '../notifications/notification-writer.js';
import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { RoutePlanStatus, TripStatus, LeaveNoticeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateParkingLotDto, ParkingLotResponseDto, ParkingLotImpactDto } from './dto/parking-lot.dto.js';
import { vietnamToday } from '../schools/school-effective-state.js';

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
      scheduledChange: val.scheduledChange || null,
    };
  }

  /**
   * Đánh giá tác động trước khi thay đổi vị trí bãi đỗ xe trung tâm toàn hệ thống theo ngày hiệu lực
   */
  async getParkingLotImpact(
    targetLatitude?: number,
    targetLongitude?: number,
    targetEffectiveDate?: string,
  ): Promise<ParkingLotImpactDto> {
    const current = await this.getParkingLot();

    const today = vietnamToday();
    const tomorrowDate = new Date(`${today}T00:00:00.000Z`);
    tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
    const defaultEffectiveDate = tomorrowDate.toISOString().split('T')[0];
    const effectiveDate = targetEffectiveDate || defaultEffectiveDate;
    const effectiveDateObj = new Date(`${effectiveDate}T00:00:00.000Z`);

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
    let tripsCancelledAfterEffectiveDateCount = 0;
    let tripsPreservedBeforeEffectiveDateCount = 0;
    let totalInProgressTripsCount = 0;

    if (routeIds.length > 0) {
      totalScheduledTripsCount = await this.prisma.trip.count({
        where: {
          routeId: { in: routeIds },
          status: TripStatus.SCHEDULED,
        },
      });

      tripsCancelledAfterEffectiveDateCount = await this.prisma.trip.count({
        where: {
          routeId: { in: routeIds },
          status: TripStatus.SCHEDULED,
          serviceDate: { gte: effectiveDateObj },
        },
      });

      tripsPreservedBeforeEffectiveDateCount = await this.prisma.trip.count({
        where: {
          routeId: { in: routeIds },
          status: TripStatus.SCHEDULED,
          serviceDate: { lt: effectiveDateObj },
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
    const plansNeedingReoptimizationCount = totalDraftPlansCount + totalActivePlansCount;

    const expectedFingerprint = createHash('sha256')
      .update(
        JSON.stringify([
          current.addressText,
          current.latitude,
          current.longitude,
          effectiveDate,
          totalDraftPlansCount,
          totalActivePlansCount,
          tripsCancelledAfterEffectiveDateCount,
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
      effectiveDate,
      plansNeedingReoptimizationCount,
      tripsCancelledAfterEffectiveDateCount,
      tripsPreservedBeforeEffectiveDateCount,
      totalDraftPlansCount,
      totalActivePlansCount,
      cancelledPlansCount: plansNeedingReoptimizationCount,
      totalScheduledTripsCount,
      cancelledTripsCount: tripsCancelledAfterEffectiveDateCount,
      totalInProgressTripsCount,
      inProgressTripsPreservedCount: totalInProgressTripsCount,
      expectedFingerprint,
      fingerprint: expectedFingerprint,
    };
  }

  /**
   * Cập nhật vị trí bãi đỗ xe trung tâm theo ngày hiệu lực (Chỉ SYSTEM_ADMIN)
   * PO chỉ đạo: Không hủy RoutePlan; đánh dấu needsReoptimization = true;
   * Chỉ hủy các chuyến xe SCHEDULED diễn ra từ ngày effectiveDate trở đi.
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

    if (!coordsChanged) {
      // Chỉ cập nhật nhãn địa chỉ -> không cascade
      const setting = await this.prisma.systemSetting.upsert({
        where: { key: SystemSettingsService.PARKING_LOT_KEY },
        create: {
          key: SystemSettingsService.PARKING_LOT_KEY,
          value: {
            addressText: dto.addressText.trim(),
            latitude: dto.latitude,
            longitude: dto.longitude,
          },
          updatedById: userId,
        },
        update: {
          value: {
            addressText: dto.addressText.trim(),
            latitude: dto.latitude,
            longitude: dto.longitude,
          },
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

    // Tọa độ thay đổi -> Hẹn ngày hiệu lực (effectiveDate)
    const today = vietnamToday();
    const tomorrowDate = new Date(`${today}T00:00:00.000Z`);
    tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
    const defaultEffectiveDate = tomorrowDate.toISOString().split('T')[0];
    const effectiveDate = dto.effectiveDate || defaultEffectiveDate;

    if (effectiveDate < defaultEffectiveDate) {
      throw new BadRequestException('Ngày hiệu lực dời bãi xe phải từ ngày mai trở đi');
    }
    const effectiveDateObj = new Date(`${effectiveDate}T00:00:00.000Z`);

    const reason = dto.reason || `Bãi xe trung tâm thay đổi vị trí sang ${dto.addressText.trim()} từ ngày ${effectiveDate}`;

    const scheduledChange = {
      newAddressText: dto.addressText.trim(),
      newLatitude: dto.latitude,
      newLongitude: dto.longitude,
      effectiveDate,
      reason,
      scheduledAt: new Date().toISOString(),
      scheduledById: userId,
    };

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Tìm toàn bộ DRAFT và ACTIVE plans
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

      // 2. Chỉ hủy các chuyến xe SCHEDULED diễn ra từ ngày effectiveDate trở đi
      if (routeIds.length > 0) {
        const scheduledTrips = await tx.trip.findMany({
          where: {
            routeId: { in: routeIds },
            status: TripStatus.SCHEDULED,
            serviceDate: { gte: effectiveDateObj },
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

          await notifyCancelledTrips(tx, tripIds, 'parking_lot_relocation:' + effectiveDate, userId);
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

      // 3. Đánh dấu RoutePlan cần tối ưu lại (KHÔNG HỦY PLAN)
      if (planIds.length > 0) {
        await tx.routePlan.updateMany({
          where: { id: { in: planIds } },
          data: {
            needsReoptimization: true,
            reoptimizationReason: reason,
          },
        });
      }

      for (const planId of planIds) await notifyPlan(tx, planId, userId);

      // 4. Lưu cấu hình bãi xe kèm lịch hẹn đổi vị trí
      const setting = await tx.systemSetting.upsert({
        where: { key: SystemSettingsService.PARKING_LOT_KEY },
        create: {
          key: SystemSettingsService.PARKING_LOT_KEY,
          value: {
            addressText: current.addressText,
            latitude: current.latitude,
            longitude: current.longitude,
            scheduledChange,
          },
          updatedById: userId,
        },
        update: {
          value: {
            addressText: current.addressText,
            latitude: current.latitude,
            longitude: current.longitude,
            scheduledChange,
          },
          updatedById: userId,
        },
      });

      return {
        setting,
        plansNeedingReoptimizationCount: planIds.length,
        cancelledTripsCount,
      };
    });

    this.logger.log(
      `Đã lên lịch dời bãi xe trung tâm ngày ${effectiveDate}: Đánh dấu ${result.plansNeedingReoptimizationCount} plans cần tối ưu lại, hủy ${result.cancelledTripsCount} trips SCHEDULED từ ngày hiệu lực.`,
    );

    return {
      addressText: current.addressText,
      latitude: current.latitude,
      longitude: current.longitude,
      updatedAt: result.setting.updatedAt.toISOString(),
      scheduledChange,
      cancelledPlansCount: result.plansNeedingReoptimizationCount,
      cancelledTripsCount: result.cancelledTripsCount,
    };
  }

  /**
   * Hủy lịch hẹn dời bãi đỗ xe trung tâm
   */
  async cancelScheduledParkingLotChange(userId: string): Promise<ParkingLotResponseDto> {
    const current = await this.getParkingLot();
    if (!current.scheduledChange) {
      throw new BadRequestException('Hiện không có lịch hẹn dời bãi xe nào đang chờ áp dụng');
    }

    const setting = await this.prisma.systemSetting.update({
      where: { key: SystemSettingsService.PARKING_LOT_KEY },
      data: {
        value: {
          addressText: current.addressText,
          latitude: current.latitude,
          longitude: current.longitude,
          scheduledChange: null,
        },
        updatedById: userId,
      },
    });

    return {
      addressText: current.addressText,
      latitude: current.latitude,
      longitude: current.longitude,
      updatedAt: setting.updatedAt.toISOString(),
      scheduledChange: null,
    };
  }

  /**
   * Áp dụng lịch hẹn dời bãi xe (Khi đến ngày effectiveDate)
   */
  async applyScheduledParkingLotChange(): Promise<{ applied: boolean; effectiveDate?: string }> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: SystemSettingsService.PARKING_LOT_KEY },
    });
    if (!setting || !setting.value) return { applied: false };

    const val = setting.value as any;
    if (!val.scheduledChange) return { applied: false };

    const change = val.scheduledChange;
    const today = vietnamToday();

    if (change.effectiveDate <= today) {
      await this.prisma.systemSetting.update({
        where: { key: SystemSettingsService.PARKING_LOT_KEY },
        data: {
          value: {
            addressText: change.newAddressText,
            latitude: change.newLatitude,
            longitude: change.newLongitude,
            scheduledChange: null,
          },
        },
      });
      this.logger.log(`Đã chính thức áp dụng vị trí bãi đỗ xe mới: ${change.newAddressText}`);
      return { applied: true, effectiveDate: change.effectiveDate };
    }

    return { applied: false, effectiveDate: change.effectiveDate };
  }
}
