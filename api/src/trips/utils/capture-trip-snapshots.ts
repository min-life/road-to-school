import { Prisma, RouteStopType } from '@prisma/client';
import { ConflictException } from '@nestjs/common';
import { buildTripRouteSnapshot, parseTripRouteSnapshot } from './trip-snapshot-resolver.js';

/** Preserve the legacy live-route view before any route changes, including today's trips. */
export async function captureTripSnapshots(
  tx: Prisma.TransactionClient,
  routeIds: string[],
): Promise<void> {
  const trips = await tx.trip.findMany({
    where: {
      routeId: { in: routeIds },
    },
    include: {
      school: true,
      route: {
        include: {
          stops: { orderBy: { stopOrder: 'asc' }, include: { student: true } },
        },
      },
    },
  });
  for (const trip of trips) {
    if (parseTripRouteSnapshot(trip.routeSnapshot)) continue;
    const route = trip.route;
    const parking = route.stops.find(
      (s) =>
        s.stopType === RouteStopType.PARKING_START ||
        s.stopType === RouteStopType.PARKING_END,
    );
    const school = route.stops.find(
      (s) =>
        s.stopType === RouteStopType.SCHOOL_ARRIVAL ||
        s.stopType === RouteStopType.SCHOOL_DEPARTURE,
    );
    const setting = !parking
      ? await tx.systemSetting.findUnique({ where: { key: 'PARKING_LOT' } })
      : null;
    const fallback = setting?.value as Prisma.JsonObject | null;
    if (
      !parking &&
      (typeof fallback?.latitude !== 'number' ||
        typeof fallback?.longitude !== 'number')
    ) {
      throw new ConflictException(
        'Chuyến cũ thiếu dữ liệu bãi để bảo toàn snapshot; cần xác minh trước khi sửa tuyến',
      );
    }
    const snapshot = buildTripRouteSnapshot({
      routeId: route.id,
      routeName: route.name,
      direction: route.direction,
      schoolId: trip.schoolId,
      schoolName: trip.school.name,
      schoolCoords: {
        latitude: school?.latitude ?? trip.school.latitude,
        longitude: school?.longitude ?? trip.school.longitude,
        addressText: school?.addressText ?? trip.school.addressText,
      },
      parkingCoords: {
        latitude: parking?.latitude ?? Number(fallback?.latitude),
        longitude: parking?.longitude ?? Number(fallback?.longitude),
        addressText:
          parking?.addressText ?? String(fallback?.addressText ?? ''),
      },
      polylineGeometry: route.polylineGeometry,
      totalDistanceMeters: route.totalDistanceMeters,
      estimatedDurationSeconds: route.estimatedDurationSeconds,
      departureTime: trip.scheduledStartTime ?? route.departureTime,
      arrivalTime: trip.scheduledEndTime ?? route.arrivalTime,
      routingConstraints: route.routingConstraints,
      stops: route.stops,
      snapshotReason: 'PRE_UPDATE_CAPTURE',
    });
    await tx.trip.update({
      where: { id: trip.id },
      data: { routeSnapshot: snapshot as unknown as Prisma.InputJsonValue },
    });
  }
}
