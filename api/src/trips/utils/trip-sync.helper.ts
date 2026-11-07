import { hasAssignmentOverride } from './trip-assignment-audit.js';
import { serviceDay } from '../../schools/school-policy.js';
import { contractDate, vietnamToday } from '../../schools/school-effective-state.js';
import { combineDateAndTimeUtc, secondsToTimeStr, timeStrToSeconds } from './trip-time.util.js';
import { lockOperations } from './operations-lock.js';
import { assertStaffAvailableForTrip, assertVehicleAvailableForTrip } from './staff-availability.helper.js';
import { Role } from '@prisma/client';
import { ConflictException } from '@nestjs/common';
import { notifyAssignment } from '../../notifications/notification-writer.js';
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
  assignmentField?: 'assignedVehicleId' | 'assignedDriverId' | 'assignedBusAttendantId';
  previousAssignmentId?: string | null;
  fromDate?: string;
  actorId?: string;
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
  options: SyncUnfrozenTripsOptions = { syncAssignments: false, syncRosterAndSnapshot: true },
): Promise<{ updatedTripsCount: number }> {
  await lockOperations(tx);
  const route = await tx.route.findUnique({
    where: { id: routeId },
    include: {
      school: true,
      routePlan: true,
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
      serviceDate: { gte: new Date(options.fromDate ?? vietnamToday()) },
      NOT: frozenTripWhere,
    },
    include: {
      attendances: true,
      leaveNotices: { where: { status: 'REPLACED' }, select: { kind: true, replacementUserId: true } },
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
  const setting = !parkingStop ? await tx.systemSetting.findUnique({ where: { key: 'PARKING_LOT' } }) : null;
  const parking = setting?.value as Prisma.JsonObject | null;
  if (!parkingStop && options.syncRosterAndSnapshot && (!parking || typeof parking.latitude !== 'number' || typeof parking.longitude !== 'number')) {
    throw new ConflictException('Không đủ dữ liệu bãi để đồng bộ snapshot');
  }

  let updatedTripsCount = 0;
  for (const trip of unfrozenTrips) {
    const updateData: Prisma.TripUpdateInput = {};

    if (options.syncAssignments && options.assignmentField) {
      const field = options.assignmentField;
      const hasLegacyReplacement = trip.leaveNotices.some(notice => notice.replacementUserId === trip[field] &&
        (field === 'assignedDriverId' ? notice.kind === 'DRIVER' : field === 'assignedBusAttendantId' && notice.kind === 'BUS_ATTENDANT'));
      if (trip[field] !== options.previousAssignmentId || hasAssignmentOverride(trip.operationAudit, field) || hasLegacyReplacement) continue;
      const studentCount = trip.attendances.filter(a => !a.excludedAt).length;
      if (field === 'assignedVehicleId' && route.proposedVehicleId) {
        await assertVehicleAvailableForTrip(tx, route.proposedVehicleId, trip.schoolId, trip, studentCount);
        updateData.assignedVehicle = { connect: { id: route.proposedVehicleId } };
      }
      if (field === 'assignedDriverId' && route.defaultDriverId) {
        await assertStaffAvailableForTrip(tx, { staffId: route.defaultDriverId, expectedRole: Role.DRIVER,
          schoolId: trip.schoolId, tripId: trip.id, targetTrip: trip });
        updateData.assignedDriver = { connect: { id: route.defaultDriverId } };
      }
      if (field === 'assignedBusAttendantId' && route.defaultBusAttendantId) {
        await assertStaffAvailableForTrip(tx, { staffId: route.defaultBusAttendantId, expectedRole: Role.BUS_ATTENDANT,
          schoolId: trip.schoolId, tripId: trip.id, targetTrip: trip });
        updateData.assignedBusAttendant = { connect: { id: route.defaultBusAttendantId } };
      }
    }

    if (options.syncRosterAndSnapshot) {
      await assertVehicleAvailableForTrip(tx, trip.assignedVehicleId, trip.schoolId, trip, currentStudentIds.size);
      const date = contractDate(trip.serviceDate);
      const day = await serviceDay(tx, trip.schoolId, date, route.routePlan.createdAt);
      if (!day) continue;
      const departureTime = route.direction === 'TO_SCHOOL'
        ? secondsToTimeStr(timeStrToSeconds(day.start) - route.estimatedDurationSeconds) : day.end;
      const arrivalTime = route.direction === 'TO_SCHOOL' ? day.start
        : secondsToTimeStr(timeStrToSeconds(day.end) + route.estimatedDurationSeconds);
      const delta = timeStrToSeconds(departureTime) - timeStrToSeconds(route.departureTime || departureTime);
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
          latitude: parkingStop?.latitude ?? Number(parking?.latitude),
          longitude: parkingStop?.longitude ?? Number(parking?.longitude),
          addressText: parkingStop?.addressText || String(parking?.addressText ?? ''),
        },
        polylineGeometry: route.polylineGeometry,
        totalDistanceMeters: route.totalDistanceMeters,
        estimatedDurationSeconds: route.estimatedDurationSeconds,
        departureTime,
        arrivalTime,
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
          plannedArrivalSeconds: s.plannedArrivalSeconds == null ? null : s.plannedArrivalSeconds + delta,
          plannedArrivalTime: s.plannedArrivalTime ? secondsToTimeStr(timeStrToSeconds(s.plannedArrivalTime) + delta) : null,
        })),
        snapshotReason: 'UNFROZEN_TRIP_SYNC',
      });

      updateData.routeSnapshot = snapshot as any;
      updateData.scheduledStartTime = departureTime;
      updateData.scheduledEndTime = arrivalTime;
      updateData.scheduledStartAt = combineDateAndTimeUtc(date, departureTime);
      updateData.scheduledEndAt = combineDateAndTimeUtc(date, arrivalTime);

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
    if (options.syncAssignments && options.assignmentField && options.assignmentField !== 'assignedVehicleId') {
      const newUserId = options.assignmentField === 'assignedDriverId' ? route.defaultDriverId : route.defaultBusAttendantId;
      if (newUserId) await notifyAssignment(tx, trip.id, trip[options.assignmentField], newUserId,
        'default-sync:' + route.id + ':' + route.updatedAt.toISOString() + ':' + trip.id, options.actorId);
    }
    updatedTripsCount++;
  }

  return { updatedTripsCount };
}
