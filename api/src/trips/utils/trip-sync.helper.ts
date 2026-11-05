import {
  Prisma,
  TripStatus,
  AttendanceStatus,
  RouteStopType,
} from '@prisma/client';
import { frozenTripWhere } from '../../overview/operations-policy.js';
import { buildTripRouteSnapshot } from './trip-snapshot-resolver.js';

export interface SyncUnfrozenTripsOptions {
  syncAssignments?: boolean;
  syncRosterAndSnapshot?: boolean;
}

/**
 * Đồng bộ ngay lập tức các chuyến xe SCHEDULED chưa đóng băng khi có thay đổi:
 * - Thay đổi nhân sự/xe mặc định của Tuyến (Mục 3.6 D36-02)
 * - Đổi địa chỉ học sinh (Mục 3.14 D314-02)
 * - Chèn học sinh mới vào tuyến (Mục 3.15 D315-01)
 * Bảo đảm tuân thủ Rule G-01 & G-02: các chuyến đang chạy hoặc đã Ready được giữ nguyên dữ liệu.
 */
export async function syncUnfrozenTripsForRoute(
  tx: Prisma.TransactionClient,
  routeId: string,
  options: SyncUnfrozenTripsOptions = { syncAssignments: true, syncRosterAndSnapshot: true },
): Promise<{ updatedTripsCount: number }> {
  const route = await tx.route.findUnique({
    where: { id: routeId },
    include: {
      school: true,
      stops: {
        include: { student: { select: { fullName: true } } },
        orderBy: { stopOrder: 'asc' },
      },
    },
  });

  if (!route) return { updatedTripsCount: 0 };

  const unfrozenTrips = await tx.trip.findMany({
    where: {
      routeId,
      status: TripStatus.SCHEDULED,
      NOT: frozenTripWhere,
    },
    include: {
      attendances: true,
    },
  });

  if (unfrozenTrips.length === 0) return { updatedTripsCount: 0 };

  const studentStops = route.stops.filter((s) => s.studentId);
  const currentStudentIds = new Set(studentStops.map((s) => s.studentId!));

  const parkingStop = route.stops.find(
    (s) => s.stopType === RouteStopType.PARKING_START || s.stopType === RouteStopType.PARKING_END,
  );
  const schoolStop = route.stops.find(
    (s) => s.stopType === RouteStopType.SCHOOL_ARRIVAL || s.stopType === RouteStopType.SCHOOL_DEPARTURE,
  );

  for (const trip of unfrozenTrips) {
    const updateData: Prisma.TripUpdateInput = {};

    if (options.syncAssignments) {
      if (route.proposedVehicleId) updateData.assignedVehicle = { connect: { id: route.proposedVehicleId } };
      if (route.defaultDriverId) updateData.assignedDriver = { connect: { id: route.defaultDriverId } };
      if (route.defaultBusAttendantId) updateData.assignedBusAttendant = { connect: { id: route.defaultBusAttendantId } };
    }

    if (options.syncRosterAndSnapshot) {
      const snapshot = buildTripRouteSnapshot({
        routeId: route.id,
        routeName: route.name,
        direction: route.direction,
        schoolId: route.schoolId,
        schoolName: route.school.name,
        schoolCoords: {
          latitude: schoolStop?.latitude ?? route.school.latitude,
          longitude: schoolStop?.longitude ?? route.school.longitude,
          addressText: schoolStop?.addressText || route.school.addressText,
        },
        parkingCoords: {
          latitude: parkingStop?.latitude ?? 10.776889,
          longitude: parkingStop?.longitude ?? 106.700806,
          addressText: parkingStop?.addressText || 'Bãi đỗ trung tâm',
        },
        polylineGeometry: route.polylineGeometry,
        totalDistanceMeters: route.totalDistanceMeters,
        estimatedDurationSeconds: route.estimatedDurationSeconds,
        departureTime: route.departureTime,
        arrivalTime: route.arrivalTime,
        routingConstraints: route.routingConstraints,
        stops: route.stops.map((s) => ({
          id: s.id,
          stopOrder: s.stopOrder,
          stopType: s.stopType,
          studentId: s.studentId,
          student: s.student,
          addressText: s.addressText,
          latitude: s.latitude,
          longitude: s.longitude,
          plannedArrivalSeconds: s.plannedArrivalSeconds,
          plannedArrivalTime: s.plannedArrivalTime,
        })),
        snapshotReason: 'UNFROZEN_TRIP_SYNC',
      });

      updateData.routeSnapshot = snapshot as any;
      if (route.departureTime) updateData.scheduledStartTime = route.departureTime;
      if (route.arrivalTime) updateData.scheduledEndTime = route.arrivalTime;

      // Đồng bộ roster điểm danh TripAttendance
      const existingAttendanceMap = new Map(trip.attendances.map((a) => [a.studentId, a]));
      for (const stId of currentStudentIds) {
        const existing = existingAttendanceMap.get(stId);
        if (!existing) {
          await tx.tripAttendance.create({
            data: {
              tripId: trip.id,
              studentId: stId,
              status: AttendanceStatus.UNMARKED,
            },
          });
        } else if (existing.excludedAt) {
          await tx.tripAttendance.update({
            where: { id: existing.id },
            data: {
              excludedAt: null,
              exclusionReason: null,
              status: AttendanceStatus.UNMARKED,
            },
          });
        }
      }

      for (const att of trip.attendances) {
        if (!currentStudentIds.has(att.studentId) && !att.excludedAt) {
          await tx.tripAttendance.update({
            where: { id: att.id },
            data: {
              excludedAt: new Date(),
              exclusionReason: 'ROSTER_SYNC_REMOVED',
            },
          });
        }
      }
    }

    await tx.trip.update({
      where: { id: trip.id },
      data: updateData,
    });
  }

  return { updatedTripsCount: unfrozenTrips.length };
}
