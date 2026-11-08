import assert from 'node:assert/strict';
import test from 'node:test';
import { canCloseIncident, canCancelAllAbsent, canReopenTrip, operationAuditItems, overviewTaskHref, selectVisibleStudents } from './web-api-integration.ts';
import type { TripDetail, TripAttendanceRoster, TripIncident } from './types';
const trip = { id: 'trip', schoolId: 'school', direction: 'TO_PARKING', status: 'SCHEDULED', actualStartTime: null, actualEndTime: null, attendantReadyAt: 'ready' } as TripDetail;
const roster = { tripId: 'trip', students: [{ status: 'ABSENT', absenceReason: 'reason', isAlighted: false }] } as TripAttendanceRoster;
test('cancel-all-absent fails closed for missing roster, wrong scope, missing Ready or incomplete attendance', () => {
  assert.equal(canCancelAllAbsent(trip, roster, 'SYSTEM_ADMIN'), true);
  assert.equal(canCancelAllAbsent(trip, roster, 'SCHOOL_ADMIN', 'school'), true);
  assert.equal(canCancelAllAbsent(trip, roster, 'SCHOOL_ADMIN', 'other'), false);
  assert.equal(canCancelAllAbsent(trip, null, 'SYSTEM_ADMIN'), false);
  assert.equal(canCancelAllAbsent(trip, { ...roster, students: [] }, 'SYSTEM_ADMIN'), false);
  assert.equal(canCancelAllAbsent({ ...trip, attendantReadyAt: null }, roster, 'SYSTEM_ADMIN'), false);
  assert.equal(canCancelAllAbsent({ ...trip, direction: 'TO_SCHOOL' }, roster, 'SYSTEM_ADMIN'), false);
  assert.equal(canCancelAllAbsent(trip, { ...roster, students: [{ ...roster.students[0], absenceReason: ' ' }] }, 'SYSTEM_ADMIN'), false);
});
test('reopen only offers system admin a future unoperated cancelled trip', () => {
  const cancelled = { ...trip, status: 'CANCELLED', scheduledStartAt: '2026-11-20T00:00:00Z' } as TripDetail;
  const before = Date.parse('2026-11-19T00:00:00Z');
  assert.equal(canReopenTrip(cancelled, roster, 'SYSTEM_ADMIN', before), true);
  assert.equal(canReopenTrip(cancelled, roster, 'SCHOOL_ADMIN', before), false);
  assert.equal(canReopenTrip(cancelled, roster, 'SYSTEM_ADMIN', Date.parse(cancelled.scheduledStartAt)), false);
  assert.equal(canReopenTrip(cancelled, null, 'SYSTEM_ADMIN', before), false);
  assert.equal(canReopenTrip({ ...cancelled, actualEndTime: 'ended' }, roster, 'SYSTEM_ADMIN', before), false);
  assert.equal(canReopenTrip(cancelled, { ...roster, students: [{ ...roster.students[0], status: 'PRESENT' }] }, 'SYSTEM_ADMIN', before), false);
});
test('incident close does not grant admin correction, confirmation or other-school access', () => {
  const incident = { type: 'GPS_SIGNAL_LOST', status: 'WAITING_CONFIRMATION', schoolId: 'school' } as TripIncident;
  assert.equal(canCloseIncident(incident, 'SYSTEM_ADMIN'), true);
  assert.equal(canCloseIncident(incident, 'SCHOOL_ADMIN', 'school'), true);
  assert.equal(canCloseIncident(incident, 'SCHOOL_ADMIN', 'other'), false);
  assert.equal(canCloseIncident(incident, 'BUS_ATTENDANT', 'school'), false);
  for (const status of ['CLOSED', 'RESOLVED', 'CONFIRMED'] as const) assert.equal(canCloseIncident({ ...incident, status }, 'SYSTEM_ADMIN'), false);
  assert.equal(canCloseIncident({ ...incident, type: 'OFF_ROUTE' }, 'SYSTEM_ADMIN'), false);
});
test('audit parser discards malformed entries and large snapshot payloads', () => {
  assert.deepEqual(operationAuditItems(null), []);
  assert.deepEqual(operationAuditItems([null, {}, { action: 4 }]), []);
  assert.deepEqual(operationAuditItems([{ action: 'REOPENED', reason: 'reason', before: { secret: 'hidden' }, actorId: 3 }]), [
    { action: 'REOPENED', reason: 'reason', actorId: undefined, occurredAt: undefined, studentId: undefined },
  ]);
});
test('overview finalization link retains school scope and new task kinds retain their links', () => {
  assert.equal(overviewTaskHref({ kind: 'ADMIN_FINALIZATION', href: '/admin/trips/admin-finalizations?schoolId=scope' }), '/admin/trips?schoolId=scope&tab=finalizations');
  assert.equal(overviewTaskHref({ kind: 'FUTURE', href: '/admin/requests' }), '/admin/requests');
});

test('visible selection preserves hidden students and does not mutate the previous set', () => {
  const original = new Set(['hidden', 'visible']);
  assert.deepEqual([...selectVisibleStudents(original, ['new'], true)], ['hidden', 'visible', 'new']);
  assert.deepEqual([...selectVisibleStudents(original, ['visible'], false)], ['hidden']);
  assert.deepEqual([...selectVisibleStudents(original, [], false)], ['hidden', 'visible']);
  assert.deepEqual([...original], ['hidden', 'visible']);
});
