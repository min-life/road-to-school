import { createHash } from 'node:crypto';
import { RouteDirection, RouteStopType, AttendanceStatus, TripStatus } from '@prisma/client';

export interface SnapshotStop {
  id: string;
  stopOrder: number;
  stopType: RouteStopType;
  studentId?: string | null;
  studentName?: string | null;
  addressText: string;
  latitude: number;
  longitude: number;
  plannedArrivalSeconds?: number | null;
  plannedArrivalTime?: string | null;
}

export interface TripRouteSnapshot {
  version: 1;
  routeId: string;
  routeName: string;
  direction: RouteDirection;
  schoolId: string;
  schoolName: string;
  schoolCoords: {
    latitude: number;
    longitude: number;
    addressText?: string;
  };
  parkingCoords: {
    latitude: number;
    longitude: number;
    addressText?: string;
  };
  polylineGeometry: string;
  totalDistanceMeters: number;
  estimatedDurationSeconds: number;
  departureTime?: string | null;
  arrivalTime?: string | null;
  routingConstraints?: any;
  stops: SnapshotStop[];
  capturedAt: string;
  snapshotReason?: 'GENERATION' | 'PRE_UPDATE_CAPTURE' | 'REOPTIMIZED' | 'MANUAL';
}

export function parseTripRouteSnapshot(value: unknown): TripRouteSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const s = value as Record<string, unknown>;
  if (s.version !== 1 || typeof s.routeId !== 'string' || typeof s.polylineGeometry !== 'string') {
    return null;
  }
  if (!Array.isArray(s.stops)) return null;
  return s as unknown as TripRouteSnapshot;
}

export function buildTripRouteSnapshot(params: {
  routeId: string;
  routeName: string;
  direction: RouteDirection;
  schoolId: string;
  schoolName: string;
  schoolCoords: { latitude: number; longitude: number; addressText?: string };
  parkingCoords: { latitude: number; longitude: number; addressText?: string };
  polylineGeometry: string;
  totalDistanceMeters: number;
  estimatedDurationSeconds: number;
  departureTime?: string | null;
  arrivalTime?: string | null;
  routingConstraints?: any;
  stops: Array<{
    id: string;
    stopOrder: number;
    stopType: RouteStopType;
    studentId?: string | null;
    student?: { fullName?: string } | null;
    addressText: string;
    latitude: number;
    longitude: number;
    plannedArrivalSeconds?: number | null;
    plannedArrivalTime?: string | null;
  }>;
  snapshotReason?: 'GENERATION' | 'PRE_UPDATE_CAPTURE' | 'REOPTIMIZED' | 'MANUAL';
}): TripRouteSnapshot {
  return {
    version: 1,
    routeId: params.routeId,
    routeName: params.routeName,
    direction: params.direction,
    schoolId: params.schoolId,
    schoolName: params.schoolName,
    schoolCoords: params.schoolCoords,
    parkingCoords: params.parkingCoords,
    polylineGeometry: params.polylineGeometry,
    totalDistanceMeters: params.totalDistanceMeters,
    estimatedDurationSeconds: params.estimatedDurationSeconds,
    departureTime: params.departureTime ?? null,
    arrivalTime: params.arrivalTime ?? null,
    routingConstraints: params.routingConstraints ?? null,
    stops: params.stops.map((st) => ({
      id: st.id,
      stopOrder: st.stopOrder,
      stopType: st.stopType,
      studentId: st.studentId ?? null,
      studentName: st.student?.fullName ?? null,
      addressText: st.addressText,
      latitude: st.latitude,
      longitude: st.longitude,
      plannedArrivalSeconds: st.plannedArrivalSeconds ?? null,
      plannedArrivalTime: st.plannedArrivalTime ?? null,
    })),
    capturedAt: new Date().toISOString(),
    snapshotReason: params.snapshotReason ?? 'GENERATION',
  };
}

export interface ResolvedRouteInfo {
  routeName: string;
  direction: RouteDirection;
  polylineGeometry: string;
  totalDistanceMeters: number;
  estimatedDurationSeconds: number;
  departureTime?: string | null;
  arrivalTime?: string | null;
  stops: SnapshotStop[];
  schoolCoords?: { latitude: number; longitude: number; addressText?: string };
  schoolName?: string;
  parkingCoords?: { latitude: number; longitude: number; addressText?: string };
  routePlanId?: string;
  routePlanName?: string;
  routingConstraints?: any;
  isFromSnapshot: boolean;
}

export function resolveTripRoute(trip: {
  routeSnapshot?: unknown;
  direction?: RouteDirection;
  route?: {
    name?: string;
    direction?: RouteDirection;
    polylineGeometry?: string | null;
    totalDistanceMeters?: number;
    estimatedDurationSeconds?: number;
    departureTime?: string | null;
    arrivalTime?: string | null;
    routingConstraints?: any;
    routePlanId?: string;
    routePlan?: { id?: string; name?: string };
    stops?: Array<{
      id: string;
      stopOrder: number;
      stopType: RouteStopType;
      studentId?: string | null;
      student?: { fullName?: string } | null;
      addressText?: string;
      latitude: number;
      longitude: number;
      plannedArrivalSeconds?: number | null;
      plannedArrivalTime?: string | null;
    }>;
  } | null;
  school?: {
    name?: string;
    latitude?: number;
    longitude?: number;
    addressText?: string;
  } | null;
}): ResolvedRouteInfo {
  const snapshot = parseTripRouteSnapshot(trip.routeSnapshot);
  if (snapshot) {
    return {
      routeName: snapshot.routeName,
      direction: snapshot.direction,
      polylineGeometry: snapshot.polylineGeometry,
      totalDistanceMeters: snapshot.totalDistanceMeters,
      estimatedDurationSeconds: snapshot.estimatedDurationSeconds,
      departureTime: snapshot.departureTime,
      arrivalTime: snapshot.arrivalTime,
      stops: snapshot.stops,
      schoolCoords: snapshot.schoolCoords,
      schoolName: snapshot.schoolName,
      parkingCoords: snapshot.parkingCoords,
      routingConstraints: snapshot.routingConstraints,
      isFromSnapshot: true,
    };
  }

  if (trip.route) {
    const stops: SnapshotStop[] = (trip.route.stops || []).map((s) => ({
      id: s.id,
      stopOrder: s.stopOrder,
      stopType: s.stopType,
      studentId: s.studentId ?? null,
      studentName: s.student?.fullName ?? null,
      addressText: s.addressText || '',
      latitude: s.latitude,
      longitude: s.longitude,
      plannedArrivalSeconds: s.plannedArrivalSeconds ?? null,
      plannedArrivalTime: s.plannedArrivalTime ?? null,
    }));

    return {
      routeName: trip.route.name || 'Tuyến xe',
      direction: trip.route.direction || trip.direction || RouteDirection.TO_SCHOOL,
      polylineGeometry: trip.route.polylineGeometry || '',
      totalDistanceMeters: trip.route.totalDistanceMeters || 0,
      estimatedDurationSeconds: trip.route.estimatedDurationSeconds || 0,
      departureTime: trip.route.departureTime,
      arrivalTime: trip.route.arrivalTime,
      stops,
      schoolCoords: trip.school
        ? {
            latitude: trip.school.latitude || 0,
            longitude: trip.school.longitude || 0,
            addressText: trip.school.addressText,
          }
        : undefined,
      schoolName: trip.school?.name,
      routePlanId: trip.route.routePlanId || trip.route.routePlan?.id,
      routePlanName: trip.route.routePlan?.name,
      routingConstraints: trip.route.routingConstraints,
      isFromSnapshot: false,
    };
  }

  return {
    routeName: 'Chuyến xe',
    direction: trip.direction || RouteDirection.TO_SCHOOL,
    polylineGeometry: '',
    totalDistanceMeters: 0,
    estimatedDurationSeconds: 0,
    stops: [],
    schoolCoords: trip.school
      ? {
          latitude: trip.school.latitude || 0,
          longitude: trip.school.longitude || 0,
          addressText: trip.school.addressText,
        }
      : undefined,
    schoolName: trip.school?.name,
    isFromSnapshot: false,
  };
}

/**
 * Checks if a trip has already been operated or has operational commitments:
 * - Not in SCHEDULED status, OR
 * - actualStartTime != null, OR
 * - attendantReadyAt != null, OR
 * - any attendance has markedAt != null, alightedAt != null, or status !== UNMARKED.
 */
export function isTripOperatedOrReady(trip: {
  status: TripStatus;
  attendantReadyAt?: Date | null;
  actualStartTime?: Date | null;
  attendances?: Array<{
    status: AttendanceStatus;
    markedAt?: Date | null;
    alightedAt?: Date | null;
  }> | null;
}): boolean {
  if (trip.status !== TripStatus.SCHEDULED) {
    return true;
  }
  if (trip.actualStartTime != null) {
    return true;
  }
  if (trip.attendantReadyAt != null) {
    return true;
  }
  if (trip.attendances && trip.attendances.length > 0) {
    const hasMarked = trip.attendances.some(
      (a) =>
        a.status !== AttendanceStatus.UNMARKED ||
        a.markedAt != null ||
        a.alightedAt != null,
    );
    if (hasMarked) return true;
  }
  return false;
}

/**
 * Computes a robust fingerprint for a trip using either its routeSnapshot or live route.
 */
export function computeTripRouteFingerprint(trip: {
  routeId: string;
  assignedDriverId: string;
  assignedVehicleId: string;
  assignedBusAttendantId: string;
  routeSnapshot?: unknown;
  direction?: RouteDirection;
  route?: any;
  school?: any;
}): string {
  const resolved = resolveTripRoute(trip);
  const stopsSummary = resolved.stops.map((s) => ({
    id: s.id,
    order: s.stopOrder,
    lat: s.latitude,
    lng: s.longitude,
    type: s.stopType,
    sid: s.studentId,
  }));
  return createHash('sha256')
    .update(
      JSON.stringify([
        trip.routeId,
        trip.assignedDriverId,
        trip.assignedVehicleId,
        trip.assignedBusAttendantId,
        resolved.polylineGeometry,
        stopsSummary,
      ]),
    )
    .digest('hex');
}

/**
 * Filters out excluded student attendances (active roster).
 */
export function filterActiveAttendances<T extends { excludedAt?: Date | null }>(
  attendances: T[] | null | undefined,
): T[] {
  if (!attendances) return [];
  return attendances.filter((a) => a.excludedAt == null);
}
