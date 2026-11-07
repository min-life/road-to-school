import { configuredParking } from './parking-policy.js';
import { closeCancelledTripTasks } from '../trips/utils/close-cancelled-trip-tasks.js';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { frozenTripWhere } from '../overview/operations-policy.js';
import { lockOperations } from '../trips/utils/operations-lock.js';
import { notifyPlan } from '../notifications/notification-events.js';
import { notifyCancelledTrips } from '../notifications/notification-writer.js';
import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
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

    configuredParking(setting?.value);

    const val = setting!.value as any;
    const due = val.scheduledChange?.effectiveDate <= vietnamToday() ? val.scheduledChange : null;
    return {
      addressText: due?.newAddressText ?? val.addressText ?? '',
      latitude: Number(due?.newLatitude ?? val.latitude) || 0,
      longitude: Number(due?.newLongitude ?? val.longitude) || 0,
      updatedAt: setting!.updatedAt ? setting!.updatedAt.toISOString() : (null as any),
      scheduledChange: val.scheduledChange || null,
      maxOperatingRadiusKm: val.maxOperatingRadiusKm ?? 50,
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
          NOT: frozenTripWhere,
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
  ): Promise<
    ParkingLotResponseDto & {
      cancelledPlansCount?: number;
      cancelledTripsCount?: number;
    }
  > {
    if (
      !dto.addressText?.trim() ||
      !Number.isFinite(dto.latitude) ||
      !Number.isFinite(dto.longitude) || Math.abs(dto.latitude) > 90 || Math.abs(dto.longitude) > 180
    ) {
      throw new BadRequestException('Địa chỉ và tọa độ bãi không hợp lệ');
    }
    await this.prisma.$transaction(async (tx) => {
      await lockOperations(tx);
      const stored = await tx.systemSetting.findUnique({
        where: { key: SystemSettingsService.PARKING_LOT_KEY },
      });
      const current = (stored?.value ?? {}) as Prisma.JsonObject;
      if (stored && dto.expectedFingerprint) {
        const impact = await this.getParkingLotImpact(dto.latitude, dto.longitude, dto.effectiveDate);
        if (dto.expectedFingerprint !== impact.expectedFingerprint) {
          throw new ConflictException('Tác động dời bãi đã thay đổi; tải lại impact');
        }
      }
      if (
        current.scheduledChange &&
        String((current.scheduledChange as Prisma.JsonObject).effectiveDate) <=
          vietnamToday()
      ) {
        throw new BadRequestException(
          'Lịch dời bãi đã đến hạn, cần áp dụng trước khi thay đổi tiếp',
        );
      }
      const coordsChanged = !!stored && (
        Math.abs(Number(current.latitude) - dto.latitude) > 1e-6 ||
        Math.abs(Number(current.longitude) - dto.longitude) > 1e-6);
      const tomorrow = new Date(new Date(vietnamToday()).getTime() + 86400000)
        .toISOString()
        .slice(0, 10);
      const date = dto.effectiveDate ?? tomorrow;
      if (
        coordsChanged &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !Number.isFinite(new Date(date).getTime()) ||
          new Date(date).toISOString().slice(0, 10) !== date ||
          date < tomorrow)
      ) {
        throw new BadRequestException(
          'Ngày dời bãi phải hợp lệ và từ ngày mai',
        );
      }
      const value: { [key: string]: Prisma.InputJsonValue | null } = {
        ...(current as Prisma.InputJsonObject),
        maxOperatingRadiusKm:
          dto.maxOperatingRadiusKm ??
          Number(current.maxOperatingRadiusKm ?? 50),
      };
      if (coordsChanged)
        value.scheduledChange = {
          newAddressText: dto.addressText.trim(),
          newLatitude: dto.latitude,
          newLongitude: dto.longitude,
          effectiveDate: date,
          reason: dto.reason?.trim() || 'Bãi xe thay đổi vị trí',
          scheduledAt: new Date().toISOString(),
          scheduledById: userId,
        };
      else {
        value.addressText = dto.addressText.trim();
        value.latitude = dto.latitude;
        value.longitude = dto.longitude;
      }
      await tx.systemSetting.upsert({
        where: { key: SystemSettingsService.PARKING_LOT_KEY },
        create: {
          key: SystemSettingsService.PARKING_LOT_KEY,
          value,
          updatedById: userId,
        },
        update: { value, updatedById: userId },
      });
    });
    return {
      ...(await this.getParkingLot()),
      cancelledPlansCount: 0,
      cancelledTripsCount: 0,
    };
  }

  async cancelScheduledParkingLotChange(
    userId: string,
  ): Promise<ParkingLotResponseDto> {
    await this.prisma.$transaction(async (tx) => {
      await lockOperations(tx);
      const setting = await tx.systemSetting.findUnique({
        where: { key: SystemSettingsService.PARKING_LOT_KEY },
      });
      const value = setting?.value as Prisma.JsonObject | null;
      const change = value?.scheduledChange as Prisma.JsonObject | null;
      if (!setting || !value || !change)
        throw new BadRequestException('Không có lịch dời bãi');
      if (String(change.effectiveDate) <= vietnamToday())
        throw new BadRequestException('Chỉ hủy lịch trước ngày hiệu lực');
      await tx.systemSetting.update({
        where: { id: setting.id },
        data: {
          value: {
            ...(value as Prisma.InputJsonObject),
            scheduledChange: null,
          },
          updatedById: userId,
        },
      });
    });
    return this.getParkingLot();
  }

  @Cron('0 * * * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async reconcileParkingLot(): Promise<void> {
    try {
      await this.applyScheduledParkingLotChange();
    } catch {
      this.logger.warn('Đối soát lịch dời bãi chưa hoàn tất; sẽ thử lại');
    }
  }

  async applyScheduledParkingLotChange(): Promise<{
    applied: boolean;
    effectiveDate?: string;
  }> {
    return this.prisma.$transaction(async (tx) => {
      await lockOperations(tx);
      const setting = await tx.systemSetting.findUnique({
        where: { key: SystemSettingsService.PARKING_LOT_KEY },
      });
      const value = setting?.value as Prisma.JsonObject | null;
      const change = value?.scheduledChange as Prisma.JsonObject | null;
      if (!setting || !value || !change) return { applied: false };
      const date = String(change.effectiveDate);
      if (date > vietnamToday()) return { applied: false, effectiveDate: date };
      const plans = await tx.routePlan.findMany({
        where: { status: { in: ['DRAFT', 'ACTIVE'] } },
        select: { id: true },
      });
      const planIds = plans.map((p) => p.id);
      const trips = await tx.trip.findMany({
        where: {
          route: { routePlanId: { in: planIds } },
          serviceDate: { gte: new Date(date) },
          status: TripStatus.SCHEDULED,
          NOT: frozenTripWhere,
        },
        select: { id: true },
      });
      const ids = trips.map((t) => t.id);
      await tx.trip.updateMany({
        where: {
          id: { in: ids },
          status: TripStatus.SCHEDULED,
          NOT: frozenTripWhere,
        },
        data: {
          status: TripStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledById: String(change.scheduledById),
          cancellationReason: String(change.reason),
        },
      });
      await tx.leaveNotice.updateMany({
        where: {
          tripId: { in: ids },
          status: LeaveNoticeStatus.PENDING_REPLACEMENT,
        },
        data: {
          status: LeaveNoticeStatus.TRIP_CANCELLED,
          processedAt: new Date(),
        },
      });
      await tx.routePlan.updateMany({
        where: { id: { in: planIds } },
        data: {
          needsReoptimization: true,
          reoptimizationReason: String(change.reason),
        },
      });
      await tx.systemSetting.update({
        where: { id: setting.id },
        data: {
          value: {
            ...(value as Prisma.InputJsonObject),
            addressText: String(change.newAddressText),
            latitude: Number(change.newLatitude),
            longitude: Number(change.newLongitude),
            scheduledChange: null,
            lastAppliedChange: change as Prisma.InputJsonObject,
          },
        },
      });
      await closeCancelledTripTasks(tx, ids);
      await notifyCancelledTrips(
        tx,
        ids,
        'parking:' + date,
        String(change.scheduledById),
      );
      for (const plan of plans)
        await notifyPlan(tx, plan.id, String(change.scheduledById));
      return { applied: true, effectiveDate: date };
    });
  }

}
