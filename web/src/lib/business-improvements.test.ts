import assert from 'node:assert/strict';
import test from 'node:test';
import { tripAssignmentLock, vietnamDateKey } from './business-improvements.ts';
import { resourcePath, type ResourceTarget } from './resource-status.ts';
import type { TripAttendanceRoster, TripDetail } from './types';

const scheduled = { status: 'SCHEDULED', actualStartTime: null, attendantReadyAt: null } as TripDetail;
const unmarked = { presentCount: 0, absentCount: 0 } as TripAttendanceRoster;

test('Vietnam calendar day and tomorrow remain correct at UTC midnight boundaries', () => {
  const now = new Date('2026-11-04T18:30:00Z');
  assert.equal(vietnamDateKey(0, now), '2026-11-05');
  assert.equal(vietnamDateKey(1, now), '2026-11-06');
  assert.equal(vietnamDateKey(1, new Date('2026-12-31T10:00:00Z')), '2027-01-01');
});

test('scheduled trip already ready or marked must not offer ordinary reassignment', () => {
  assert.equal(tripAssignmentLock(scheduled, unmarked), null);
  assert.ok(tripAssignmentLock({ ...scheduled, attendantReadyAt: '2026-11-05T00:00:00Z' }, unmarked));
  assert.ok(tripAssignmentLock({ ...scheduled, actualStartTime: '2026-11-05T00:00:00Z' }, unmarked));
  assert.ok(tripAssignmentLock(scheduled, { ...unmarked, presentCount: 1 }));
  assert.ok(tripAssignmentLock(scheduled, { ...unmarked, absentCount: 1 }));
  assert.ok(tripAssignmentLock({ ...scheduled, status: 'CANCELLED' }, unmarked));
});

test('missing readiness fields or roster fails closed instead of assuming unfrozen', () => {
  assert.ok(tripAssignmentLock(scheduled, null));
  assert.ok(tripAssignmentLock({ ...scheduled, attendantReadyAt: undefined }, unmarked));
  assert.ok(tripAssignmentLock({ ...scheduled, actualStartTime: undefined }, unmarked));
});

test('employee mutations retain school-scoped path rather than global user endpoint', () => {
  const employee: ResourceTarget = { kind: 'employee', id: 'person', name: 'Attendant', isActive: true, schoolId: 'school', role: 'BUS_ATTENDANT' };
  assert.equal(resourcePath(employee), '/schools/school/employees/person');
  assert.equal(resourcePath({ kind: 'driver', id: 'driver', name: 'Driver', isActive: true }), '/drivers/driver');
  assert.equal(resourcePath({ kind: 'vehicle', id: 'vehicle', name: 'Bus', isActive: true }), '/vehicles/vehicle');
});
