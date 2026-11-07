import { tripBlockReason } from './school-policy.js';
import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { vietnamToday } from './school-effective-state.js';
import { frozenTripWhere } from '../overview/operations-policy.js';

/** Date-based holds survive plan cancellation until an exceptional Trip is finalized. */
export function expiredUnfinishedTripWhere(): Prisma.TripWhereInput {
  return {
    AND: [
      {
        OR: [
          { adminFinalization: { path: ['state'], equals: 'PENDING' } },
          {
            school: {
              contractEndDate: {
                lt: new Date(`${vietnamToday()}T00:00:00.000Z`),
              },
            },
          },
          { school: { isActive: false } },
          {
            school: {
              scheduledChanges: {
                some: {
                  type: { in: ['INACTIVE', 'LOCATION'] },
                  status: { in: ['PENDING', 'APPLIED'] },
                  effectiveDate: { lte: new Date(vietnamToday()) },
                },
              },
            },
          },
          { serviceDate: { lte: new Date(vietnamToday()) } },
        ],
      },
    ],
    OR: [
      { status: 'IN_PROGRESS' },
      {
        status: 'SCHEDULED',
        attendances: {
          some: {
            OR: [
              { status: { not: 'UNMARKED' } },
              { markedAt: { not: null } },
              { alightedAt: { not: null } },
            ],
          },
        },
      },
    ],
  };
}

export async function assertResourcesNotAwaitingAdmin(
  db: Prisma.TransactionClient,
  resources: {
    vehicleId?: string | null;
    driverId?: string | null;
    busAttendantId?: string | null;
  },
  excludeTripId?: string,
): Promise<void> {
  const conditions: Prisma.TripWhereInput[] = [];
  if (resources.vehicleId)
    conditions.push({ assignedVehicleId: resources.vehicleId });
  if (resources.driverId)
    conditions.push({ assignedDriverId: resources.driverId });
  if (resources.busAttendantId)
    conditions.push({ assignedBusAttendantId: resources.busAttendantId });
  if (!conditions.length) return;
  const preserved = await db.trip.findFirst({ where: {
    ...(excludeTripId ? { id: { not: excludeTripId } } : {}),
    status: { in: ['SCHEDULED', 'IN_PROGRESS'] }, route: { routePlan: { status: 'CANCELLED' } },
    AND: [frozenTripWhere, { OR: conditions }],
  }, select: { id: true } });
  if (preserved) throw new ConflictException('Nguồn lực còn chuyến được bảo toàn sau hủy phương án');
  const candidates = await db.trip.findMany({
    where: { AND: [expiredUnfinishedTripWhere(), { OR: conditions }] },
    select: { id: true },
  });
  for (const trip of candidates || [])
    if (await tripBlockReason(db, trip.id))
      throw new ConflictException(
        'Xe hoặc nhân sự còn chuyến chưa được quản trị viên chốt',
      );
}

export async function heldResourceTrips(db: Prisma.TransactionClient) {
  const pending = await pendingResourceTrips(db);
  const preserved = await db.trip.findMany({ where: {
    status: { in: ['SCHEDULED', 'IN_PROGRESS'] }, route: { routePlan: { status: 'CANCELLED' } }, AND: frozenTripWhere,
  }, select: { id: true, schoolId: true, assignedVehicleId: true, assignedDriverId: true, assignedBusAttendantId: true } });
  return [...new Map([...pending, ...preserved].map(trip => [trip.id, trip])).values()];
}

export async function pendingResourceTrips(db: Prisma.TransactionClient, schoolId?: string) {
  const candidates = await db.trip.findMany({
    where: { AND: [expiredUnfinishedTripWhere(), ...(schoolId ? [{ schoolId }] : [])] },
    select: {
      id: true,
      schoolId: true,
      assignedVehicleId: true,
      assignedDriverId: true,
      assignedBusAttendantId: true,
    },
  });
  const result: typeof candidates = [];
  for (const trip of candidates || [])
    if (await tripBlockReason(db, trip.id)) result.push(trip);
  return result;
}
