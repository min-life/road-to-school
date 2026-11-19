import assert from 'node:assert/strict';
import { test } from 'node:test';
import { attendanceRosterGroups } from '../utils/attendance-roster.ts';
import type { MobileTripDetailStop, TripAttendanceStudentItem } from '../services/api-client';

const student = (id: string, stopOrder: number, status: TripAttendanceStudentItem['status'] = 'UNMARKED', isAlighted = false) =>
  ({ studentId: id, studentCode: id, fullName: id, addressText: '', stopOrder, status, isAlighted });
const stop = (id: string, stopOrder: number, studentId?: string): MobileTripDetailStop =>
  ({ id, stopOrder, studentId, stopType: studentId ? 'PICKUP' : 'PARKING_START', latitude: 0, longitude: 0, addressText: '' });

test('puts the active child ahead of earlier unmarked stops and avoids duplicates', () => {
  const roster = [student('second', 3), student('first', 2), student('done', 4, 'ABSENT')];
  const groups = attendanceRosterGroups(roster, [stop('target', 3, 'second')], 'boarding', 'target');
  assert.equal(groups.next?.studentId, 'second');
  assert.equal(groups.fromNavigation, true);
  assert.deepEqual(groups.pending.map(item => item.studentId), ['first']);
  assert.deepEqual(groups.completed.map(item => item.studentId), ['done']);
});

test('skips a completed target and keeps only boarded children in the alighting list', () => {
  const roster = [student('first', 1, 'PRESENT'), student('done', 2, 'PRESENT', true),
    student('absent', 3, 'ABSENT'), student('next', 4, 'PRESENT')];
  const groups = attendanceRosterGroups(roster, [stop('first-stop', 1, 'first'), stop('target', 2, 'done'), stop('next-stop', 3, 'next')], 'alighting', 'target');
  assert.equal(groups.next?.studentId, 'next');
  assert.deepEqual(groups.pending.map(item => item.studentId), ['first']);
  assert.deepEqual(groups.completed.map(item => item.studentId), ['done']);
});

test('falls back to route order when navigation has no matched point', () => {
  const groups = attendanceRosterGroups([student('late', 3), student('early', 2)], [], 'boarding', 'old-stop');
  assert.equal(groups.next?.studentId, 'early');
  assert.equal(groups.fromNavigation, false);
});
