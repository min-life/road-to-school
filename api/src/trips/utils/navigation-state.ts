import { createHash } from 'node:crypto';
import type { LocationSource } from '../dto/trip-navigation.dto.js';

export interface NavigationCheckpoint {
  version: 1;
  ownerSessionId: string;
  runId: string;
  enabled: boolean;
  activeSource: LocationSource;
  targetStopId: string | null;
  routeVersion: string;
  activatedAt: number;
  lastRouteRequestedAt: number;
}

export function parseCheckpoint(value: unknown): NavigationCheckpoint | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const s = value as Record<string, unknown>;
  if (s.version !== 1 || typeof s.enabled !== 'boolean' ||
      !['LIVE', 'TEST_AUTO', 'TEST_JOYSTICK'].includes(String(s.activeSource)) ||
      !['ownerSessionId', 'runId', 'routeVersion'].every(k => typeof s[k] === 'string' && !!s[k]) ||
      !(s.targetStopId === null || typeof s.targetStopId === 'string') ||
      typeof s.activatedAt !== 'number' || !Number.isFinite(s.activatedAt) ||
      typeof s.lastRouteRequestedAt !== 'number' || !Number.isFinite(s.lastRouteRequestedAt)) return null;
  return s as unknown as NavigationCheckpoint;
}

import { computeTripRouteFingerprint } from './trip-snapshot-resolver.js';

export function routeFingerprint(trip: {
  routeId: string;
  assignedDriverId: string;
  assignedVehicleId: string;
  assignedBusAttendantId: string;
  routeSnapshot?: unknown;
  route?: { polylineGeometry: string | null; stops: unknown[] } | null;
}) {
  if (trip.routeSnapshot) {
    return computeTripRouteFingerprint(trip);
  }
  return createHash('sha256').update(JSON.stringify([
    trip.routeId,
    trip.assignedDriverId,
    trip.assignedVehicleId,
    trip.assignedBusAttendantId,
    trip.route?.polylineGeometry ?? '',
    trip.route?.stops ?? [],
  ])).digest('hex');
}

export function metresBetween(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const rad = Math.PI / 180;
  const x = (b.longitude - a.longitude) * rad * Math.cos((a.latitude + b.latitude) * rad / 2);
  const y = (b.latitude - a.latitude) * rad;
  return Math.hypot(x, y) * 6371000;
}
