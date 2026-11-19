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
import { schoolChangeImpact, SCHOOL_CHANGE_CANCEL_AUDIT, SCHOOL_LOCATION_TRIP_CANCELLED, SCHOOL_SCHEDULE_TRIP_CANCELLED } from './school-change-impact.js';
import { captureTripSnapshots } from '../trips/utils/capture-trip-snapshots.js';
import {
  contractDate,
  isContractExpired,
  requiresAdminFinalization,
  vietnamToday,
} from './school-effective-state.js';
import {
  assertTripPolicy,
  tripBlockReason,
  tripPolicyEffectiveDate,
  type WeeklySchoolSchedule,
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
    let plans = 0, trips = 0, reoptimizationPlans = 0, updatedTrips = 0;
    const cancelledIds: string[] = [];
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
      const impact = change.type === 'INACTIVE' ? null : await schoolChangeImpact(tx, school,
        change.type === 'LOCATION'
          ? { type: 'LOCATION', latitude: Number(payload.latitude), longitude: Number(payload.longitude) }
          : { type: 'SCHEDULE', weeklySchedule: payload.weeklySchedule as WeeklySchoolSchedule },
        contractDate(change.effectiveDate), new Date(), true);
      if (change.type === 'INACTIVE') {
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
              cancellationReason: 'Trường ngừng hoạt động theo lịch',
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
      if (change.type === 'LOCATION') {
        if (impact?.locationChanged) await captureTripSnapshots(tx, impact.flagged.flatMap(plan => plan.routes.map(route => route.id)));
        school = await tx.school.update({
          where: { id: school.id },
          data: {
            ...geographyFields(payload),
            addressText: String(payload.addressText),
            latitude: impact?.locationChanged ? Number(payload.latitude) : school.latitude,
            longitude: impact?.locationChanged ? Number(payload.longitude) : school.longitude,
          },
        });
      }
      if (change.type === 'SCHEDULE')
        school = await tx.school.update({
          where: { id: school.id },
          data: { weeklySchedule: payload.weeklySchedule! },
        });
      await tx.schoolScheduledChange.update({
        where: { id: change.id },
        data: { status: 'APPLIED', appliedAt: new Date(), lastError: null },
      });
      if (impact) {
        const reason = change.type === 'LOCATION' ? SCHOOL_LOCATION_TRIP_CANCELLED : SCHOOL_SCHEDULE_TRIP_CANCELLED;
        const planReason = typeof payload.reason === 'string' ? `${reason}. ${payload.reason}` : reason;
        for (const plan of impact.flagged) {
          await tx.routePlan.update({ where: { id: plan.id }, data: { needsReoptimization: true, reoptimizationReason: planReason } });
          await notifyPlan(tx, plan.id);
        }
        reoptimizationPlans += impact.flagged.length;
        for (const trip of impact.cancelled) {
          const cancelledAt = new Date();
          await tx.trip.update({ where: { id: trip.id }, data: {
            status: 'CANCELLED', cancelledAt, cancellationReason: trip.reason, cancelledById: change.createdById,
            operationAudit: [
              ...(Array.isArray(trip.audit) ? trip.audit : []),
              { action: SCHOOL_CHANGE_CANCEL_AUDIT, schoolChangeId: change.id, reason: trip.reason,
                actorId: change.createdById, occurredAt: cancelledAt.toISOString() },
            ] as Prisma.InputJsonArray,
          } });
          cancelledIds.push(trip.id);
          trips++;
        }
        for (const { id, day } of impact.shifted) {
          const timing = await effectiveTripTiming(tx, id, day);
          if (!timing) continue;
          await tx.trip.update({ where: { id }, data: { ...timing, routeSnapshot: timing.routeSnapshot ?? Prisma.DbNull } });
          updatedTrips++;
        }
      }
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
        `school-lifecycle:${school.id}:${today}:${changes.map(change => change.id).join(':')}:${cancelledIds.slice().sort().join(':')}`,
      );
    }
    return { plans, trips, reoptimizationPlans, updatedTrips };
  }
  async reconcile() {
    const schools = await this.prisma.school.findMany({ select: { id: true } });
    let expiredPlansCount = 0,
      cancelledTripsCount = 0;
    for (const ref of schools) {
      const counts = await this.reconcileSchoolById(ref.id);
      expiredPlansCount += counts.plans;
      cancelledTripsCount += counts.trips;
    }
    return { expiredPlansCount, cancelledTripsCount };
  }

  async reconcileSchoolById(schoolId: string) {
    return this.prisma.$transaction(async tx => {
      await lockOperations(tx);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM schools WHERE id = ${schoolId} FOR UPDATE`);
      const school = await tx.school.findUnique({ where: { id: schoolId } });
      return school ? this.reconcileSchool(tx, school) : { plans: 0, trips: 0 };
    }, { timeout: 30000 });
  }
}
