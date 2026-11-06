import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { activeJourneyIncident, journeyMinutesBeforeSchedule, journeyScheduleCountdown, journeyServiceDate,
  journeyStagePosition, scheduledJourneyInstant, studentJourneyBadge, journeyReadinessBadge, journeyTripLabel } from '../utils/parent-journey-stage.ts';
import { journeyEventTime } from '../utils/parent-journey.ts';

// Pure existing enums, booleans and clocks only; no business DTO fixtures or API responses.
describe('outbound operational workflow', () => {
  it('waits at departure before and after the attendant is ready', () => {
    assert.equal(journeyStagePosition('SCHEDULED', 'TO_SCHOOL', 'UNMARKED', false, false), 0);
    assert.equal(journeyReadinessBadge('SCHEDULED', false)?.label, 'Chờ giáo viên');
    assert.equal(journeyReadinessBadge('SCHEDULED', true)?.label, 'Giáo viên sẵn sàng');
    assert.equal(journeyTripLabel('SCHEDULED', 'TO_SCHOOL', false), 'Chờ khởi hành');
  });
  it('moves toward pickup only after the trip starts and toward school only after boarding', () => {
    assert.equal(journeyStagePosition('IN_PROGRESS', 'TO_SCHOOL', 'UNMARKED', false, false), 1 / 3);
    assert.equal(journeyStagePosition('IN_PROGRESS', 'TO_SCHOOL', 'PRESENT', false, false), 5 / 6);
    assert.equal(studentJourneyBadge('PRESENT', false, false, false, 'TO_SCHOOL', 'IN_PROGRESS').label, 'Đã điểm danh lên');
  });
  it('distinguishes school arrival from alighting and trip completion', () => {
    assert.equal(journeyStagePosition('IN_PROGRESS', 'TO_SCHOOL', 'PRESENT', false, true), 1);
    assert.equal(journeyTripLabel('IN_PROGRESS', 'TO_SCHOOL', true), 'Đã đến trường');
    assert.equal(studentJourneyBadge('PRESENT', false, true, false, 'TO_SCHOOL', 'IN_PROGRESS').label, 'Chưa xuống xe');
    assert.equal(studentJourneyBadge('PRESENT', true, true, false, 'TO_SCHOOL', 'IN_PROGRESS').label, 'Đã xuống xe');
    assert.equal(journeyTripLabel('IN_PROGRESS', 'TO_SCHOOL', true), 'Đã đến trường');
    assert.equal(journeyTripLabel('COMPLETED', 'TO_SCHOOL', true), 'Kết thúc chuyến');
  });
});

describe('return operational workflow', () => {
  it('keeps the bus at school before departure, including ready and boarded states', () => {
    for (const attendance of ['UNMARKED', 'PRESENT'] as const) {
      assert.equal(journeyStagePosition('SCHEDULED', 'TO_PARKING', attendance, false, false), 0);
    }
    assert.equal(studentJourneyBadge('UNMARKED', false, false, false, 'TO_PARKING', 'SCHEDULED').label, 'Chưa điểm danh lên');
    const boarded = studentJourneyBadge('PRESENT', false, false, false, 'TO_PARKING', 'SCHEDULED');
    assert.equal(boarded.label, 'Đã điểm danh lên');
    assert.equal(boarded.tone, 'info');
    assert.equal(journeyTripLabel('SCHEDULED', 'TO_PARKING', false), 'Chờ khởi hành');
  });
  it('moves two-thirds toward the child dropoff, not to parking', () => {
    assert.equal(journeyStagePosition('IN_PROGRESS', 'TO_PARKING', 'PRESENT', false, false), 1 / 3);
    assert.equal(studentJourneyBadge('PRESENT', false, false, false, 'TO_PARKING', 'IN_PROGRESS').label, 'Chưa xuống xe');
  });
  it('keeps each child at their own dropoff milestone until the route ends', () => {
    assert.equal(journeyStagePosition('IN_PROGRESS', 'TO_PARKING', 'PRESENT', true, false), 1 / 2);
    assert.equal(journeyStagePosition('IN_PROGRESS', 'TO_PARKING', 'PRESENT', false, false), 1 / 3);
    assert.equal(studentJourneyBadge('PRESENT', true, false, false, 'TO_PARKING', 'IN_PROGRESS').label, 'Đã xuống xe');
    assert.equal(journeyTripLabel('IN_PROGRESS', 'TO_PARKING', false), 'Đang di chuyển');
    assert.equal(journeyStagePosition('COMPLETED', 'TO_PARKING', 'PRESENT', true, false), 1);
    assert.equal(journeyTripLabel('COMPLETED', 'TO_PARKING', false), 'Kết thúc chuyến');
  });
  it('keeps a bus fallback without inventing boarding for inconsistent unmarked travel', () => {
    assert.equal(journeyStagePosition('IN_PROGRESS', 'TO_PARKING', 'UNMARKED', false, false), 0);
    assert.equal(journeyStagePosition('IN_PROGRESS', 'TO_PARKING', 'UNMARKED', true, true), 0);
    assert.equal(studentJourneyBadge('UNMARKED', true, true, false, 'TO_PARKING', 'IN_PROGRESS').label, 'Chưa điểm danh lên');
  });
});

describe('readiness, terminal states and per-child facts', () => {
  it('uses only confirmed readiness and keeps unavailable distinct from not ready', () => {
    assert.equal(journeyReadinessBadge('SCHEDULED')?.label, 'Chưa cập nhật GV');
    assert.equal(journeyReadinessBadge('SCHEDULED', undefined, null)?.label, 'Chờ giáo viên');
    assert.equal(journeyReadinessBadge('SCHEDULED', undefined, 'invalid')?.label, 'Chưa cập nhật GV');
    assert.equal(journeyReadinessBadge('SCHEDULED', true, '2026-10-30T00:00:00Z')?.label, 'Giáo viên sẵn sàng · 07:00');
    assert.equal(journeyReadinessBadge('SCHEDULED', false, '2026-10-30T00:00:00Z')?.label, 'Chờ giáo viên');
    for (const status of ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const) assert.equal(journeyReadinessBadge(status, true), undefined);
  });
  it('never equates route completion with a missing child attendance or alighting record', () => {
    for (const direction of ['TO_SCHOOL', 'TO_PARKING'] as const) {
      assert.equal(journeyStagePosition('COMPLETED', direction, 'PRESENT', false, false), 1);
      assert.equal(studentJourneyBadge('PRESENT', false, false, false, direction, 'COMPLETED').label, 'Chưa xuống xe');
      assert.equal(studentJourneyBadge('UNMARKED', false, false, false, direction, 'COMPLETED').label, 'Chưa điểm danh lên');
    }
  });
  it('does not draw a participating child journey for absence or cancellation', () => {
    for (const direction of ['TO_SCHOOL', 'TO_PARKING'] as const) {
      assert.equal(journeyStagePosition('IN_PROGRESS', direction, 'ABSENT', false, true), null);
      assert.equal(journeyStagePosition('CANCELLED', direction, 'PRESENT', true, true), null);
    }
    assert.equal(studentJourneyBadge('ABSENT', false, false, true).label, 'Đã báo nghỉ');
    assert.equal(studentJourneyBadge('ABSENT', false, false, false).label, 'Vắng mặt');
  });
  it('keeps colors and labels consistent for actual alighting in both directions', () => {
    assert.deepEqual(studentJourneyBadge('PRESENT', false, false, false, 'TO_PARKING', 'IN_PROGRESS'),
      studentJourneyBadge('PRESENT', false, true, false, 'TO_SCHOOL', 'IN_PROGRESS'));
    assert.deepEqual(studentJourneyBadge('PRESENT', true, false, false, 'TO_PARKING', 'IN_PROGRESS'),
      studentJourneyBadge('PRESENT', true, true, false, 'TO_SCHOOL', 'IN_PROGRESS'));
    assert.equal(studentJourneyBadge('UNMARKED', false, false, false).tone, 'warning');
  });
  it('keeps every actual enum combination bounded without mutating child facts', () => {
    for (const status of ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const)
      for (const direction of ['TO_SCHOOL', 'TO_PARKING'] as const)
        for (const attendance of ['UNMARKED', 'PRESENT', 'ABSENT'] as const)
          for (const down of [false, true]) for (const arrived of [false, true]) {
            const position = journeyStagePosition(status, direction, attendance, down, arrived);
            assert.ok(position === null || (position >= 0 && position <= 1));
            assert.ok(studentJourneyBadge(attendance, down, arrived, false, direction, status).label.length > 0);
          }
  });
  it('uses only the actual pending incident statuses', () => {
    for (const status of ['WAITING_ASSIGNMENT', 'WAITING_CONFIRMATION'] as const) assert.equal(activeJourneyIncident(status), true);
    for (const status of ['RESOLVED', 'CONFIRMED', 'CLOSED'] as const) assert.equal(activeJourneyIncident(status), false);
  });
  it('keeps planned and confirmed milestone clocks separate even when an actual clock is missing', () => {
    assert.deepEqual(journeyEventTime(false, '18:00'), { value: '18:00', kind: 'scheduled', scheduledValue: '18:00' });
    assert.deepEqual(journeyEventTime(true, '18:00', '2026-10-30T10:50:00Z'), { value: '17:50', kind: 'actual', scheduledValue: '18:00' });
    assert.deepEqual(journeyEventTime(true, '18:00'), { value: null, kind: 'actual', scheduledValue: '18:00' });
  });
});

describe('planned versus actual clock information', () => {
  it('compares timestamps against the Vietnam service day without guessing an ETA', () => {
    assert.equal(journeyMinutesBeforeSchedule('2026-10-30', '07:15', '2026-10-30T00:05:00Z'), 10);
    assert.equal(journeyMinutesBeforeSchedule('2026-10-30', '07:15', '2026-10-30T00:20:00Z'), -5);
    assert.equal(journeyMinutesBeforeSchedule('2026-10-30', '07:15', '2026-10-30T00:15:00Z'), 0);
    assert.equal(journeyMinutesBeforeSchedule('2026-10-30', null, '2026-10-30T00:15:00Z'), null);
  });
  it('counts only until the published schedule and does not fabricate zero or negative arrival minutes', () => {
    assert.equal(journeyScheduleCountdown('2026-10-30', '07:15', Date.parse('2026-10-30T00:05:00Z')), 10);
    assert.equal(journeyScheduleCountdown('2026-10-30', '07:15', Date.parse('2026-10-30T00:20:00Z')), null);
    assert.equal(journeyScheduleCountdown('2026-10-30', null, Date.now()), null);
    assert.equal(scheduledJourneyInstant('2026-02-30', '07:15'), null);
  });
  it('formats the API service date without replacing it with today', () => {
    assert.equal(journeyServiceDate('2026-10-30'), '30/10/2026');
    assert.equal(journeyServiceDate('unknown'), 'unknown');
  });
});
