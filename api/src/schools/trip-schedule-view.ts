import { Prisma } from '@prisma/client';
import { serviceDay } from './school-policy.js';
import { isTripFrozen } from '../overview/operations-policy.js';
import {
  contractDate,
  vietnamToday,
} from './school-effective-state.js';
import {
  combineDateAndTimeUtc,
  secondsToTimeStr,
  timeStrToSeconds,
} from '../trips/utils/trip-time.util.js';

/** Returns effective timing without writing; completed/operated trip snapshots are immutable. */
export async function effectiveTripTiming(
  db: Prisma.TransactionClient,
  id: string,
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
  const change = await db.schoolScheduledChange.findFirst({
    where: {
      schoolId: trip.schoolId,
      type: 'SCHEDULE',
      status: { in: ['PENDING', 'APPLIED'] },
      effectiveDate: { lte: trip.serviceDate },
      createdAt: { gt: trip.createdAt },
    },
  });
  if (!change) return null;
  const day = await serviceDay(
    db,
    trip.schoolId,
    contractDate(trip.serviceDate),
    trip.route.routePlan.createdAt,
  );
  if (!day) return null;
  const duration = trip.route.estimatedDurationSeconds;
  const start =
    trip.direction === 'TO_SCHOOL'
      ? secondsToTimeStr(timeStrToSeconds(day.start) - duration)
      : day.end;
  const end =
    trip.direction === 'TO_SCHOOL'
      ? day.start
      : secondsToTimeStr(timeStrToSeconds(day.end) + duration);
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
                          plannedArrivalTime: secondsToTimeStr(
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
    scheduledStartTime: start,
    scheduledEndTime: end,
    scheduledStartAt: combineDateAndTimeUtc(
      contractDate(trip.serviceDate),
      start,
    ),
    scheduledEndAt: combineDateAndTimeUtc(contractDate(trip.serviceDate), end),
    routeSnapshot: shiftedSnapshot as Prisma.InputJsonValue | null,
  };
}
