import { Role, type Trip, type User } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { AttendanceService } from './attendance.service.js';
import { contextVersion } from './attendance-policy.js';

describe('RFID reader states', () => {
  const trip = { id: 'trip', assignedBusAttendantId: 'attendant', assignedVehicleId: 'vehicle',
    direction: 'TO_SCHOOL', status: 'IN_PROGRESS', attendantReadyAt: new Date() } as Trip;
  const user = { id: 'attendant', role: Role.BUS_ATTENDANT } as User;
  const now = new Date();
  const matching = { reportedAssignmentId: 'assignment', reportedAttendanceTripId: trip.id,
    reportedAttendanceVersion: contextVersion(trip), reportedAttendancePhase: 'BOARDING',
    lastAttendanceAckAt: now, lastSeenAt: now };

  it.each([
    [false, false, null, 'NO_DEVICE'],
    [true, false, matching, 'TRIP_NOT_ELIGIBLE'],
    [true, true, { ...matching, lastSeenAt: new Date(0), lastAttendanceAckAt: null }, 'DEVICE_UNREACHABLE'],
    [true, true, { ...matching, reportedAttendancePhase: 'ALIGHTING' }, 'AWAITING_ACK'],
    [true, true, matching, 'READY'],
  ] as const)('reports reader health and a pending event independently of history (%s, %s, %j)', async (hasAssignment, eligible, device, reason) => {
    const prisma = { trip: { findUnique: vi.fn().mockResolvedValue(trip) },
      vehicleIotAssignment: { findFirst: vi.fn().mockResolvedValue(hasAssignment ? { id: 'assignment', deviceId: 'device' } : null) },
      tripAttendance: { findMany: vi.fn().mockResolvedValue([]) } };
    const pending = { scanId: 'candidate' };
    const store = { io: (read: () => Promise<unknown>) => read(),
      list: vi.fn().mockResolvedValue({ data: [], total: 0 }),
      pendingForPhase: vi.fn().mockResolvedValue(pending), response: vi.fn(value => value) };
    const query = { maxTimeMS: () => query, lean: () => query, exec: async () => device };
    const svc = new AttendanceService(prisma as never, store as never, { eligible: async () => eligible } as never,
      {} as never, {} as never, { findOne: () => query } as never);
    const result = await svc.list(trip.id, { view: 'history', page: 2, limit: 10 }, user);
    expect(result.reader.reason).toBe(reason);
    expect(result.pendingEvent).toEqual(pending);
    expect(store.pendingForPhase).toHaveBeenCalledWith(trip.id, 'BOARDING');
  });
});
