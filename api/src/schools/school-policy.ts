import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import {
  contractDate,
  isContractExpired,
  vietnamToday,
} from './school-effective-state.js';
import { getDayOfWeekKey } from '../trips/utils/trip-time.util.js';
import { calendarMatches } from './service-calendar.js';

export type PolicyDb = Pick<
  Prisma.TransactionClient,
  'school' | 'schoolScheduledChange' | 'serviceCalendarEntry' | 'trip'
>;
export async function effectiveSchool(
  db: PolicyDb,
  id: string,
  date = vietnamToday(),
) {
  const school = await db.school.findUnique({ where: { id } });
  if (!school) return null;
  const changes = await db.schoolScheduledChange.findMany({
    where: {
      schoolId: id,
      status: 'PENDING',
      effectiveDate: { lte: new Date(date) },
    },
    orderBy: [{ effectiveDate: 'asc' }, { createdAt: 'asc' }],
  });
  const result = { ...school };
  for (const change of changes) {
    const payload = change.payload as Prisma.JsonObject;
    if (change.type === 'INACTIVE') result.isActive = false;
    if (change.type === 'LOCATION') {
      result.addressText = String(payload.addressText);
      result.latitude = Number(payload.latitude);
      result.longitude = Number(payload.longitude);
    }
    if (change.type === 'SCHEDULE')
      result.weeklySchedule = payload.weeklySchedule!;
  }
  return result;
}
export async function planInvalidation(
  db: PolicyDb,
  schoolId: string,
  createdAt: Date,
  date = vietnamToday(),
): Promise<string | null> {
  const school = await effectiveSchool(db, schoolId, date);
  if (!school) return 'SCHOOL_INACTIVE';
  if (isContractExpired(school.contractEndDate, date))
    return 'CONTRACT_EXPIRED';
  if (!school.isActive) return 'SCHOOL_INACTIVE';
  const cutoff = await db.schoolScheduledChange.findFirst({
    where: {
      schoolId,
      type: { in: ['INACTIVE', 'LOCATION'] },
      status: { in: ['PENDING', 'APPLIED'] },
      effectiveDate: {
        lte: new Date(date),
        gt:
          new Date(createdAt.getTime() + 7 * 3600000)
            .toISOString()
            .slice(0, 10) + 'T00:00:00Z',
      },
    },
  });
  return cutoff
    ? cutoff.type === 'LOCATION'
      ? 'LOCATION_CHANGED'
      : 'SCHOOL_INACTIVE'
    : null;
}
export async function serviceDay(
  db: PolicyDb,
  schoolId: string,
  date: string,
  planCreatedAt?: Date,
) {
  const school = await effectiveSchool(db, schoolId, date);
  if (
    !school ||
    !school.isActive ||
    date < contractDate(school.contractStartDate) ||
    date > contractDate(school.contractEndDate)
  )
    return null;
  if (
    planCreatedAt &&
    (await planInvalidation(db, schoolId, planCreatedAt, date))
  )
    return null;
  const entries = await db.serviceCalendarEntry.findMany({
    where: { status: 'APPROVED', OR: [{ schoolId: null }, { schoolId }] },
  });
  const matching = entries.filter((entry) => calendarMatches(entry, date));
  if (matching.some((entry) => entry.kind === 'HOLIDAY' && !entry.schoolId))
    return null;
  const makeup = matching.find(
    (entry) => entry.kind === 'MAKEUP' && entry.schoolId === schoolId,
  );
  if (makeup) return { start: makeup.startTime!, end: makeup.endTime! };
  if (matching.some((entry) => entry.kind === 'HOLIDAY')) return null;
  const schedule = school.weeklySchedule as Record<
    string,
    { start: string; end: string }
  >;
  return schedule[getDayOfWeekKey(date)] ?? null;
}
export async function tripBlockReason(
  db: PolicyDb,
  id: string,
): Promise<string | null> {
  const trip = await db.trip.findUnique({
    where: { id },
    include: {
      school: true,
      route: { select: { routePlan: { select: { createdAt: true } } } },
      attendances: true,
    },
  });
  if (!trip || ['COMPLETED', 'CANCELLED'].includes(trip.status)) return null;
  if ((trip.adminFinalization as Prisma.JsonObject | null)?.state === 'PENDING')
    return 'ADMIN_FINALIZATION_PENDING';
  const today = vietnamToday();
  const invalidation = await planInvalidation(
    db,
    trip.schoolId,
    trip.route.routePlan.createdAt,
  );
  if (invalidation) return invalidation;
  if (
    contractDate(trip.serviceDate) === today &&
    !(await serviceDay(db, trip.schoolId, today))
  )
    return 'HOLIDAY';
  if (contractDate(trip.serviceDate) <= today) {
    const day = contractDate(trip.serviceDate);
    const entries = await db.serviceCalendarEntry.findMany({
      where: {
        status: { in: ['APPROVED', 'CANCELLED'] },
        OR: [{ schoolId: null }, { schoolId: trip.schoolId }],
      },
    });
    const eligible = entries.filter(
      (e) =>
        contractDate(new Date(e.createdAt.getTime() + 7 * 3600000)) < day &&
        (!e.cancelledAt ||
          contractDate(new Date(e.cancelledAt.getTime() + 7 * 3600000)) >
            day) &&
        calendarMatches(e, day),
    );
    const operatorHoliday = eligible.some(
      (e) => e.kind === 'HOLIDAY' && !e.schoolId,
    );
    const schoolHoliday = eligible.some(
      (e) => e.kind === 'HOLIDAY' && e.schoolId,
    );
    const makeup = eligible.some((e) => e.kind === 'MAKEUP');
    if (operatorHoliday || (schoolHoliday && !makeup)) return 'HOLIDAY';
  }
  return null;
}
/** Read-only: also rejects old sessions after reactivation even if catch-up was delayed. */
export async function assertSchoolAccount(
  db: PolicyDb,
  user: Pick<User, 'role' | 'schoolId'>,
  sessionCreatedAt?: Date,
): Promise<void> {
  if (
    ![Role.SCHOOL_ADMIN, Role.BUS_ATTENDANT].includes(
      user.role as 'SCHOOL_ADMIN' | 'BUS_ATTENDANT',
    ) ||
    !user.schoolId
  )
    return;
  const school = await effectiveSchool(db, user.schoolId);
  if (!school?.isActive)
    throw new UnauthorizedException(
      'Trường đã ngừng hoạt động. Vui lòng đăng nhập lại khi trường hoạt động',
    );
  if (sessionCreatedAt) {
    const past = await db.schoolScheduledChange.findMany({
      where: {
        schoolId: user.schoolId,
        type: 'INACTIVE',
        status: { in: ['PENDING', 'APPLIED'] },
        effectiveDate: { lte: new Date(vietnamToday()) },
      },
    });
    if (
      past.some(
        (change) =>
          sessionCreatedAt <
          new Date(`${contractDate(change.effectiveDate)}T00:00:00+07:00`),
      )
    )
      throw new UnauthorizedException(
        'Trường đã hoạt động lại. Vui lòng đăng nhập mới',
      );
  }
}
export async function assertTripPolicy(
  db: PolicyDb,
  id: string,
): Promise<void> {
  if (await tripBlockReason(db, id))
    throw new ConflictException(
      'Chuyến không còn đủ điều kiện vận hành; cần quản trị viên chốt trạng thái',
    );
}

export async function tripPolicyEffectiveDate(
  db: PolicyDb,
  id: string,
  reason: string,
): Promise<string> {
  const trip = await db.trip.findUniqueOrThrow({
    where: { id },
    include: {
      school: true,
      route: { select: { routePlan: { select: { createdAt: true } } } },
    },
  });
  if (reason === 'CONTRACT_EXPIRED')
    return contractDate(
      new Date(trip.school.contractEndDate.getTime() + 86400000),
    );
  if (reason === 'HOLIDAY') return contractDate(trip.serviceDate);
  const change = await db.schoolScheduledChange.findFirst({
    where: {
      schoolId: trip.schoolId,
      type: reason === 'LOCATION_CHANGED' ? 'LOCATION' : 'INACTIVE',
      status: { in: ['PENDING', 'APPLIED'] },
      effectiveDate: {
        lte: new Date(vietnamToday()),
        gt: new Date(
          new Date(trip.route.routePlan.createdAt.getTime() + 7 * 3600000)
            .toISOString()
            .slice(0, 10),
        ),
      },
    },
    orderBy: { effectiveDate: 'asc' },
  });
  return change ? contractDate(change.effectiveDate) : vietnamToday();
}

export async function assertSchoolWritable(db: PolicyDb, schoolId: string) {
  if (!(await effectiveSchool(db, schoolId))?.isActive)
    throw new ConflictException(
      'Trường đã ngừng hoạt động; chỉ được xem dữ liệu cũ',
    );
}
