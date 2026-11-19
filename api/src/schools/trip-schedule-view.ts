import { Prisma } from '@prisma/client';
import { serviceDay } from './school-policy.js';
import { isTripFrozen } from '../overview/operations-policy.js';
import {
  contractDate,
  vietnamToday,
} from './school-effective-state.js';
import {
  calculateTripTiming,
  tripClockTime,
  timeStrToSeconds,
} from '../trips/utils/trip-time.util.js';

/** Returns effective timing without writing; completed/operated trip snapshots are immutable. */
export async function effectiveTripTiming(
  db: Prisma.TransactionClient,
  id: string,
  schedule?: { start: string; end: string },
) {
  const trip = await db.trip.findUnique({
    where: { id },
    include: { attendances: true, route: { include: { routePlan: true } } },
  });
  if (
    !trip ||
    trip.status !== 'SCHEDULED' ||
    isTripFrozen(trip) ||
    contractDate(trip.serviceDate) < vietnamToday()
  )
    return null;
  const change = schedule || await db.schoolScheduledChange.findFirst({
    where: {
      schoolId: trip.schoolId,
      type: 'SCHEDULE',
      status: { in: ['PENDING', 'APPLIED'] },
      effectiveDate: { lte: trip.serviceDate },
      createdAt: { gt: trip.createdAt },
    },
  });
  if (!change) return null;
  const day = schedule ?? await serviceDay(
    db,
    trip.schoolId,
    contractDate(trip.serviceDate),
    trip.route.routePlan.createdAt,
  );
  if (!day) return null;
  const timing = calculateTripTiming(trip.direction, trip.route.estimatedDurationSeconds, day, contractDate(trip.serviceDate));
  const { scheduledStartTime: start, scheduledEndTime: end } = timing;
  const snapshot = trip.routeSnapshot;
  const delta =
    timeStrToSeconds(start) -
    timeStrToSeconds(trip.scheduledStartTime ?? start);
  const shiftedSnapshot =
    snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)
      ? {
          ...snapshot,
          departureTime: start,
          arrivalTime: end,
          ...(Array.isArray(snapshot.stops)
            ? {
                stops: snapshot.stops.map((value) => {
                  if (
                    !value ||
                    typeof value !== 'object' ||
                    Array.isArray(value)
                  )
                    return value;
                  return {
                    ...value,
                    ...(typeof value.plannedArrivalTime === 'string'
                      ? {
                          plannedArrivalTime: tripClockTime(
                            timeStrToSeconds(value.plannedArrivalTime) + delta,
                          ),
                        }
                      : {}),
                  };
                }),
              }
            : {}),
        }
      : snapshot;
  return {
    ...timing,
    routeSnapshot: shiftedSnapshot as Prisma.InputJsonValue | null,
  };
}
