import { Prisma, School } from '@prisma/client';
import { isTripFrozen } from '../overview/operations-policy.js';
import { calculateTripTiming, isTimeIntervalOverlapping } from '../trips/utils/trip-time.util.js';
import { contractDate } from './school-effective-state.js';
import { schoolCoordinatesChanged, schoolScheduleNeedsReoptimization, serviceDay, type WeeklySchoolSchedule } from './school-policy.js';

export const SCHOOL_LOCATION_TRIP_CANCELLED = 'Trường đổi vị trí; cần tối ưu lại phương án';
export const SCHOOL_SCHEDULE_TRIP_CANCELLED = 'Lịch học thay đổi; cần tối ưu lại phương án';
export const SCHOOL_SCHEDULE_DAY_CANCELLED = 'Lịch học trường đã thay đổi';
export const SCHOOL_CHANGE_CANCEL_AUDIT = 'CANCELLED_BY_SCHOOL_CHANGE';

export type SchoolServiceChange =
  | { type: 'LOCATION'; latitude: number; longitude: number }
  | { type: 'SCHEDULE'; weeklySchedule: WeeklySchoolSchedule };

/** Shared by the confirmation summary and reconciliation. Caller locks trips before mutating. */
export async function schoolChangeImpact(
  db: Prisma.TransactionClient,
  school: School,
  change: SchoolServiceChange,
  effectiveDate: string,
  now = new Date(),
  lockTrips = false,
) {
  const locationChanged = change.type === 'LOCATION' && schoolCoordinatesChanged(school, change.latitude, change.longitude);
  const plans = await db.routePlan.findMany({
    where: { schoolId: school.id, status: { in: ['DRAFT', 'ACTIVE'] } },
    select: { id: true, status: true, updatedAt: true, routes: { select: { id: true, direction: true, estimatedDurationSeconds: true } } },
  });
  const flagged = plans.filter(plan => locationChanged ||
    (change.type === 'SCHEDULE' && schoolScheduleNeedsReoptimization(change.weeklySchedule, plan.routes)));
  const flaggedIds = new Set(flagged.map(plan => plan.id));
  const candidates = change.type === 'SCHEDULE' || locationChanged ? await db.trip.findMany({
    where: {
      schoolId: school.id, serviceDate: { gte: new Date(effectiveDate) },
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      route: { routePlanId: { in: (change.type === 'LOCATION' ? flagged : plans).map(plan => plan.id) } },
    },
    orderBy: { id: 'asc' },
    include: { attendances: true, route: true },
  }) : [];
  const cancelled: { id: string; serviceDate: Date; reason: string; audit: Prisma.JsonValue }[] = [];
  const shifted: { id: string; day: { start: string; end: string } }[] = [];
  const preserved: string[] = [];
  let inProgress = 0;
  const frozen = change.type === 'SCHEDULE' ? candidates.filter(isTripFrozen) : [];
  const days = new Map<string, Promise<[Awaited<ReturnType<typeof serviceDay>>, Awaited<ReturnType<typeof serviceDay>>]>>();
  for (let trip of candidates) {
    if (lockTrips) {
      await db.$queryRaw(Prisma.sql`SELECT id FROM trips WHERE id = ${trip.id} FOR UPDATE`);
      const locked = await db.trip.findUnique({ where: { id: trip.id }, include: { attendances: true, route: true } });
      if (!locked || !['SCHEDULED', 'IN_PROGRESS'].includes(locked.status)) continue;
      trip = locked;
    }
    let reason: string | undefined;
    let shift: { start: string; end: string } | undefined;
    if (flaggedIds.has(trip.route.routePlanId)) {
      reason = locationChanged ? SCHOOL_LOCATION_TRIP_CANCELLED : SCHOOL_SCHEDULE_TRIP_CANCELLED;
    } else if (change.type === 'SCHEDULE') {
      const date = contractDate(trip.serviceDate);
      let timing = days.get(date);
      if (!timing) {
        timing = Promise.all([
          serviceDay(db, school.id, date, undefined, school.weeklySchedule as WeeklySchoolSchedule),
          serviceDay(db, school.id, date, undefined, change.weeklySchedule),
        ]);
        days.set(date, timing);
      }
      const [before, after] = await timing;
      if (before?.start === after?.start && before?.end === after?.end) continue;
      if (!after) reason = SCHOOL_SCHEDULE_DAY_CANCELLED;
      else {
        const proposed = calculateTripTiming(trip.direction, trip.route.estimatedDurationSeconds, after, date);
        const conflictsWithFrozenTrip = frozen.some(other => other.id !== trip.id &&
          (other.assignedVehicleId === trip.assignedVehicleId || other.assignedDriverId === trip.assignedDriverId ||
            other.assignedBusAttendantId === trip.assignedBusAttendantId) &&
          other.scheduledStartAt && other.scheduledEndAt && isTimeIntervalOverlapping(
            proposed.scheduledStartAt, proposed.scheduledEndAt, other.actualStartTime ?? other.scheduledStartAt, other.scheduledEndAt,
          ));
        if (proposed.scheduledStartAt <= now || conflictsWithFrozenTrip) reason = SCHOOL_SCHEDULE_DAY_CANCELLED;
        else shift = after;
      }
    }
    if (isTripFrozen(trip)) {
      preserved.push(trip.id);
      if (trip.status === 'IN_PROGRESS') inProgress++;
    }
    else if (reason) cancelled.push({ id: trip.id, serviceDate: trip.serviceDate, reason, audit: trip.operationAudit });
    else if (shift) shifted.push({ id: trip.id, day: shift });
  }
  return { plans, flagged, cancelled, shifted, preserved, inProgress, locationChanged };
}
