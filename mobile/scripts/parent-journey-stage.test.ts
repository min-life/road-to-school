import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { activeJourneyIncident, journeyMinutesBeforeSchedule, journeyScheduleCountdown, journeyServiceDate,
  journeyStagePosition, scheduledJourneyInstant, studentJourneyBadge } from '../utils/parent-journey-stage.ts';

// Pure enums, booleans, dates and clocks only. No Trip/Student fixtures or API response mocks.
describe('PO-approved workflow illustration', () => {
  it('waits at departure and jumps to two-thirds of the first leg when started', () => {
    assert.equal(journeyStagePosition('SCHEDULED', 'TO_SCHOOL', 'UNMARKED', false, false), 0);
    assert.equal(journeyStagePosition('IN_PROGRESS', 'TO_SCHOOL', 'UNMARKED', false, false), 1 / 3);
  });
  it('acknowledges boarding at pickup, then illustrates the school-bound leg', () => {
    assert.equal(journeyStagePosition('IN_PROGRESS', 'TO_SCHOOL', 'PRESENT', false, false, true), 0.5);
    assert.equal(journeyStagePosition('IN_PROGRESS', 'TO_SCHOOL', 'PRESENT', false, false), 5 / 6);
  });
  it('distinguishes reaching school from this child alighting', () => {
    assert.equal(journeyStagePosition('IN_PROGRESS', 'TO_SCHOOL', 'PRESENT', false, true), 1);
    assert.equal(studentJourneyBadge('PRESENT', false, true, false).label, 'Chưa xuống xe');
    assert.equal(studentJourneyBadge('PRESENT', true, true, false).label, 'Đã xuống xe');
    assert.equal(studentJourneyBadge('UNMARKED', false, true, false).label, 'Chưa điểm danh');
  });
  it('keeps return boarding at school until start, then jumps along the return leg', () => {
    assert.equal(journeyStagePosition('SCHEDULED', 'TO_PARKING', 'PRESENT', false, false), 0);
    assert.equal(journeyStagePosition('IN_PROGRESS', 'TO_PARKING', 'PRESENT', false, false), 2 / 3);
    assert.equal(journeyStagePosition('IN_PROGRESS', 'TO_PARKING', 'PRESENT', true, false), 1);
  });
  it('keeps an unmarked return bus visible without confirming boarding or arrival', () => {
    assert.equal(journeyStagePosition('IN_PROGRESS', 'TO_PARKING', 'UNMARKED', false, false), 0);
    assert.equal(journeyStagePosition('IN_PROGRESS', 'TO_PARKING', 'UNMARKED', true, true), 0);
    assert.equal(studentJourneyBadge('UNMARKED', false, false, false).label, 'Chưa điểm danh');
    assert.equal(studentJourneyBadge('UNMARKED', false, false, false).tone, 'warning');
    assert.equal(journeyStagePosition('IN_PROGRESS', 'TO_PARKING', 'ABSENT', false, false), null);
    assert.equal(journeyStagePosition('CANCELLED', 'TO_PARKING', 'UNMARKED', false, false), null);
    assert.equal(journeyStagePosition('COMPLETED', 'TO_PARKING', 'UNMARKED', false, false), null);
  });
  it('never illustrates a journey for absent/cancelled or an unverified completion', () => {
    assert.equal(journeyStagePosition('IN_PROGRESS', 'TO_SCHOOL', 'ABSENT', false, true), null);
    assert.equal(journeyStagePosition('CANCELLED', 'TO_SCHOOL', 'PRESENT', true, true), null);
    assert.equal(journeyStagePosition('COMPLETED', 'TO_SCHOOL', 'PRESENT', false, false), null);
    assert.equal(journeyStagePosition('IN_PROGRESS', 'TO_SCHOOL', 'UNMARKED', true, false), 1 / 3);
  });
  it('shows individual badges without copying a sibling attendance or active incident into attendance', () => {
    assert.equal(studentJourneyBadge('UNMARKED', false, false, false).tone, 'warning');
    assert.equal(studentJourneyBadge('PRESENT', false, false, false).tone, 'info');
    assert.equal(studentJourneyBadge('ABSENT', false, false, true).label, 'Đã báo nghỉ');
    assert.equal(studentJourneyBadge('ABSENT', false, false, false).label, 'Vắng mặt');
    assert.equal(studentJourneyBadge('PRESENT', true, false, false).tone, 'success');
  });
  it('uses the same alighting tags for return trips without asserting drop-off arrival', () => {
    const pending = studentJourneyBadge('PRESENT', false, false, false, 'TO_PARKING');
    const arrivedAtSchool = studentJourneyBadge('PRESENT', false, true, false, 'TO_SCHOOL');
    assert.deepEqual(pending, arrivedAtSchool);
    assert.deepEqual(studentJourneyBadge('PRESENT', true, false, false, 'TO_PARKING'),
      studentJourneyBadge('PRESENT', true, true, false, 'TO_SCHOOL'));
    assert.equal(studentJourneyBadge('UNMARKED', false, false, false, 'TO_PARKING').label, 'Chưa điểm danh');
    assert.equal(studentJourneyBadge('ABSENT', false, false, true, 'TO_PARKING').label, 'Đã báo nghỉ');
    assert.equal(studentJourneyBadge('ABSENT', false, false, false, 'TO_PARKING').label, 'Vắng mặt');
    assert.equal(studentJourneyBadge('PRESENT', false, false, false, 'TO_SCHOOL').label, 'Đã điểm danh');
    assert.equal(journeyStagePosition('IN_PROGRESS', 'TO_PARKING', 'PRESENT', false, false), 2 / 3);
  });
  it('uses the two actual pending incident statuses and excludes closed history', () => {
    for (const status of ['WAITING_ASSIGNMENT', 'WAITING_CONFIRMATION'] as const) assert.equal(activeJourneyIncident(status), true);
    for (const status of ['RESOLVED', 'CONFIRMED', 'CLOSED'] as const) assert.equal(activeJourneyIncident(status), false);
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
