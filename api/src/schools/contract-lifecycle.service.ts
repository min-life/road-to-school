import { geographyFields } from './geography.js';
import { closeCancelledTripTasks } from '../trips/utils/close-cancelled-trip-tasks.js';
import { lockOperations } from '../trips/utils/operations-lock.js';
import { effectiveTripTiming } from './trip-schedule-view.js';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma, School } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  adminRecipients,
  notifyCancelledTrips,
  writeNotification,
} from '../notifications/notification-writer.js';
import { notifyPlan } from '../notifications/notification-events.js';
import {
  contractDate,
  isContractExpired,
  requiresAdminFinalization,
  vietnamToday,
} from './school-effective-state.js';
import {
  assertTripPolicy,
  serviceDay,
  tripBlockReason,
  tripPolicyEffectiveDate,
} from './school-policy.js';

@Injectable()
export class ContractLifecycleService {
  private readonly logger = new Logger(ContractLifecycleService.name);
  constructor(private readonly prisma: PrismaService) {}
  async assertTripContractOpen(
    id: string,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    await assertTripPolicy(db, id);
  }
  @Cron('0 * * * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async catchUp(): Promise<void> {
    try {
      await this.reconcile();
    } catch (error) {
      this.logger.error(
        'Đối soát vòng đời chưa hoàn tất; sẽ thử lại',
        error instanceof Error ? error.message : 'unknown',
      );
    }
  }
  /** Caller holds School lock. Mutations/cron only, never GET. */
  async reconcileSchool(tx: Prisma.TransactionClient, school: School) {
    const today = vietnamToday();
    let plans = 0,
      trips = 0;
    const changes = await tx.schoolScheduledChange.findMany({
      where: {
        schoolId: school.id,
        status: 'PENDING',
        effectiveDate: { lte: new Date(today) },
      },
      orderBy: [{ effectiveDate: 'asc' }, { createdAt: 'asc' }],
    });
    for (const change of changes) {
      const payload = change.payload as Prisma.JsonObject;
      if (change.type === 'INACTIVE' || change.type === 'LOCATION') {
        const targets = await tx.routePlan.findMany({
          where: {
            schoolId: school.id,
            status: { in: ['DRAFT', 'ACTIVE'] },
            createdAt: {
              lt: new Date(
                `${contractDate(change.effectiveDate)}T00:00:00+07:00`,
              ),
            },
          },
        });
        for (const plan of targets) {
          await tx.routePlan.update({
            where: { id: plan.id },
            data: {
              status: 'CANCELLED',
              cancelledAt: new Date(),
              cancellationReason:
                change.type === 'INACTIVE'
                  ? 'Trường ngừng hoạt động theo lịch'
                  : 'Trường thay đổi địa điểm theo lịch',
            },
          });
          plans++;
          await notifyPlan(tx, plan.id);
        }
      }
      if (change.type === 'INACTIVE') {
        school = await tx.school.update({
          where: { id: school.id },
          data: { isActive: false },
        });
        await tx.session.updateMany({
          where: {
            user: {
              schoolId: school.id,
              role: { in: ['SCHOOL_ADMIN', 'BUS_ATTENDANT'] },
            },
            revokedAt: null,
            createdAt: {
              lt: new Date(
                `${contractDate(change.effectiveDate)}T00:00:00+07:00`,
              ),
            },
          },
          data: { revokedAt: new Date(), pushToken: null },
        });
      }
      if (change.type === 'LOCATION')
        school = await tx.school.update({
          where: { id: school.id },
          data: {
            ...geographyFields(payload),
            addressText: String(payload.addressText),
            latitude: Number(payload.latitude),
            longitude: Number(payload.longitude),
          },
        });
      if (change.type === 'SCHEDULE')
        school = await tx.school.update({
          where: { id: school.id },
          data: { weeklySchedule: payload.weeklySchedule! },
        });
      await tx.schoolScheduledChange.update({
        where: { id: change.id },
        data: { status: 'APPLIED', appliedAt: new Date(), lastError: null },
      });
    }
    if (isContractExpired(school.contractEndDate, today)) {
      const expired = await tx.routePlan.findMany({
        where: { schoolId: school.id, status: { in: ['DRAFT', 'ACTIVE'] } },
      });
      for (const plan of expired) {
        await tx.routePlan.update({
          where: { id: plan.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancellationReason: 'Hợp đồng trường học đã hết hạn',
          },
        });
        plans++;
        await notifyPlan(tx, plan.id);
      }
    }
    const candidates = await tx.trip.findMany({
      where: {
        schoolId: school.id,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    const cancelledIds: string[] = [];
    for (const ref of candidates) {
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM trips WHERE id = ${ref.id} FOR UPDATE`,
      );
      const trip = await tx.trip.findUnique({
        where: { id: ref.id },
        include: { attendances: true, route: true },
      });
      if (!trip || !['SCHEDULED', 'IN_PROGRESS'].includes(trip.status))
        continue;
      const reason = await tripBlockReason(tx, trip.id);
      if (reason === 'ADMIN_FINALIZATION_PENDING') continue;
      if (reason) {
        if (requiresAdminFinalization(trip)) {
          await tx.trip.update({
            where: { id: trip.id },
            data: {
              adminFinalization: {
                state: 'PENDING',
                trigger: reason,
                effectiveDate: await tripPolicyEffectiveDate(
                  tx,
                  trip.id,
                  reason,
                ),
                detectedAt: new Date().toISOString(),
              },
            },
          });
          await writeNotification(tx, {
            eventKey: `admin-finalization:${trip.id}`,
            type: 'TRIP_ADMIN_FINALIZATION',
            title: 'Chuyến xe cần chốt trạng thái',
            body: 'Kiểm tra chuyến chưa hoàn thành và ghi nhận kết quả.',
            targetType: 'TRIP',
            targetId: trip.id,
            userIds: await adminRecipients(tx, 'SYSTEM_ADMIN'),
          });
        } else {
          await tx.trip.update({
            where: { id: trip.id },
            data: {
              status: 'CANCELLED',
              cancelledAt: new Date(),
              cancellationReason: reason,
            },
          });
          cancelledIds.push(trip.id);
          trips++;
        }
        continue;
      }
      const applicable = changes.some(
        (c) =>
          c.type === 'SCHEDULE' &&
          contractDate(trip.serviceDate) >= contractDate(c.effectiveDate),
      );
      if (!applicable || requiresAdminFinalization(trip)) continue;
      const day = await serviceDay(tx, school.id, contractDate(trip.serviceDate));
      if (!day) {
        await tx.trip.update({
          where: { id: trip.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancellationReason: 'Lịch học trường đã thay đổi',
          },
        });
        cancelledIds.push(trip.id);
        trips++;
        continue;
      }
      const timing = await effectiveTripTiming(tx, trip.id);
      if (timing)
        await tx.trip.update({
          where: { id: trip.id },
          data: {
            ...timing,
            routeSnapshot: timing.routeSnapshot ?? Prisma.DbNull,
          },
        });
    }
    if (cancelledIds.length) {
      await tx.leaveNotice.updateMany({
        where: { tripId: { in: cancelledIds }, status: 'PENDING_REPLACEMENT' },
        data: { status: 'TRIP_CANCELLED', processedAt: new Date() },
      });
      await closeCancelledTripTasks(tx, cancelledIds);
      await notifyCancelledTrips(
        tx,
        cancelledIds,
        `school-lifecycle:${school.id}:${today}:${cancelledIds.slice().sort().join(':')}`,
      );
    }
    return { plans, trips };
  }
  async reconcile() {
    const schools = await this.prisma.school.findMany({ select: { id: true } });
    let expiredPlansCount = 0,
      cancelledTripsCount = 0;
    for (const ref of schools) {
      const counts = await this.prisma.$transaction(
        async (tx) => {
      await lockOperations(tx);
          await tx.$queryRaw(
            Prisma.sql`SELECT id FROM schools WHERE id = ${ref.id} FOR UPDATE`,
          );
          const school = await tx.school.findUnique({ where: { id: ref.id } });
          return school
            ? this.reconcileSchool(tx, school)
            : { plans: 0, trips: 0 };
        },
        { timeout: 30000 },
      );
      expiredPlansCount += counts.plans;
      cancelledTripsCount += counts.trips;
    }
    return { expiredPlansCount, cancelledTripsCount };
  }
}
