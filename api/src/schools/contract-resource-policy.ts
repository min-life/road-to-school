import { tripBlockReason } from './school-policy.js';
import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { vietnamToday } from './school-effective-state.js';

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
): Promise<void> {
  const conditions: Prisma.TripWhereInput[] = [];
  if (resources.vehicleId)
    conditions.push({ assignedVehicleId: resources.vehicleId });
  if (resources.driverId)
    conditions.push({ assignedDriverId: resources.driverId });
  if (resources.busAttendantId)
    conditions.push({ assignedBusAttendantId: resources.busAttendantId });
  if (!conditions.length) return;
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

export async function pendingResourceTrips(db: Prisma.TransactionClient) {
  const candidates = await db.trip.findMany({
    where: expiredUnfinishedTripWhere(),
    select: {
      id: true,
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
