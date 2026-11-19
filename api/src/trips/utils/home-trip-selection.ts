import { TripStatus, type Prisma } from '@prisma/client';
import { vietnamToday } from '../../schools/school-effective-state.js';

type HomeTripTiming = { status: TripStatus; scheduledStartAt: Date | null };
type HomeTripCandidate = HomeTripTiming & { id: string; serviceDate: Date; scheduledEndAt: Date | null };

const statusPriority: Record<TripStatus, number> = {
  IN_PROGRESS: 0,
  SCHEDULED: 1,
  COMPLETED: 2,
  CANCELLED: 3,
};

export function compareHomeTrips(first: HomeTripTiming, second: HomeTripTiming): number {
  return statusPriority[first.status] - statusPriority[second.status]
    || (first.scheduledStartAt?.getTime() ?? 0) - (second.scheduledStartAt?.getTime() ?? 0);
}

export function homeTripCandidateWhere(now: Date): Prisma.TripWhereInput {
  return {
    OR: [
      { status: TripStatus.IN_PROGRESS },
      {
        status: TripStatus.SCHEDULED,
        OR: [
          { serviceDate: { gte: new Date(`${vietnamToday(now)}T00:00:00Z`) } },
          { scheduledEndAt: { gte: now } },
          { scheduledEndAt: null },
        ],
      },
    ],
  };
}

export function selectHomeTrip<T extends HomeTripCandidate>(
  trips: T[],
  now: Date,
  isUnmarked?: (trip: T) => boolean,
): T | undefined {
  return trips.filter(trip =>
    trip.status === TripStatus.IN_PROGRESS
      || (trip.status === TripStatus.SCHEDULED && (!trip.scheduledEndAt || trip.scheduledEndAt >= now)),
  ).sort((first, second) => {
    if (isUnmarked && first.status === TripStatus.IN_PROGRESS && second.status === TripStatus.IN_PROGRESS) {
      const attendanceOrder = Number(isUnmarked(second)) - Number(isUnmarked(first));
      if (attendanceOrder) return attendanceOrder;
    }
    return compareHomeTrips(first, second);
  })[0];
}

export function homeTripHistoryWhere(
  primary: Pick<HomeTripCandidate, 'id' | 'serviceDate'> | undefined,
  now: Date,
): Prisma.TripWhereInput {
  return {
    serviceDate: primary?.serviceDate ?? new Date(`${vietnamToday(now)}T00:00:00Z`),
    status: { in: [TripStatus.COMPLETED, TripStatus.CANCELLED] },
    ...(primary && { id: { not: primary.id } }),
  };
}
