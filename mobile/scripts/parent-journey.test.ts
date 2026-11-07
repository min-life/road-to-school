import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { journeyArrivalClock, journeyClock, journeyDiagramPosition, journeyRecordedClock, journeyScheduleRange,
  locateOnJourney, progressForJourneyFix, studentJourneyMilestone, validCoordinate, type JourneyPath } from '../utils/parent-journey.ts';
import { cumulativeDistances } from '../utils/trip-navigation.ts';

// Pure enum mappings and mathematical coordinates only. No Trip/User/Student fixtures or API mocks.
describe('per-student journey labels', () => {
  it('keeps every actual trip/attendance enum combination defined in both directions', () => {
    for (const status of ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const)
      for (const attendance of ['UNMARKED', 'PRESENT', 'ABSENT'] as const)
        for (const direction of ['TO_SCHOOL', 'TO_PARKING'] as const)
          for (const down of [false, true]) {
            const value = studentJourneyMilestone(status, direction, attendance, down);
            assert.ok(value.label.length > 0);
            if (status === 'CANCELLED' || attendance === 'ABSENT') assert.equal(value.progress, null);
          }
  });
  it('does not mistake shared trip completion for a child alighting', () => {
    assert.equal(studentJourneyMilestone('COMPLETED', 'TO_SCHOOL', 'PRESENT', false).progress, null);
    assert.equal(studentJourneyMilestone('COMPLETED', 'TO_SCHOOL', 'UNMARKED', false).progress, null);
    assert.equal(studentJourneyMilestone('IN_PROGRESS', 'TO_SCHOOL', 'PRESENT', true).label, 'Đã đến trường');
    assert.equal(studentJourneyMilestone('IN_PROGRESS', 'TO_PARKING', 'PRESENT', true).label, 'Đã về điểm trả');
  });
  it('keeps siblings independent when only one has boarded/alighted', () => {
    assert.equal(studentJourneyMilestone('IN_PROGRESS', 'TO_SCHOOL', 'PRESENT', false).label, 'Đang trên xe');
    assert.equal(studentJourneyMilestone('IN_PROGRESS', 'TO_SCHOOL', 'UNMARKED', false).progress, null);
    assert.equal(studentJourneyMilestone('IN_PROGRESS', 'TO_SCHOOL', 'PRESENT', true).progress, 1);
    assert.equal(studentJourneyMilestone('IN_PROGRESS', 'TO_SCHOOL', 'ABSENT', true).progress, null);
  });
  it('does not move a scheduled return trip even after boarding at school', () => {
    assert.equal(studentJourneyMilestone('SCHEDULED', 'TO_PARKING', 'PRESENT', false).progress, 0);
  });
});

describe('observed route geometry (mathematics only)', () => {
  const coords: [number, number][] = [[0, 0], [0, 0.01], [0, 0.02]];
  const total = cumulativeDistances(coords).at(-1)!;
  const path: JourneyPath = { coords, start: 0, end: total, home: total / 2, boarding: total / 2, homeFraction: 0.5 };
  it('projects along actual line length and advances only with a fresh observed fix', () => {
    assert.ok(Math.abs(locateOnJourney(coords, [0, 0.005])! / total - 0.25) < 1e-6);
    assert.ok(Math.abs(progressForJourneyFix(path, [0, 0.015], true, 1000, true)! - 0.75) < 1e-6);
  });
  it('returns no new progress for stale, future, missing-time or off-route samples', () => {
    assert.equal(progressForJourneyFix(path, [0, 0.015], false, 1000, true), null);
    for (const age of [15001, -5001, NaN]) assert.equal(progressForJourneyFix(path, [0, 0.015], true, age, true), null);
    assert.equal(progressForJourneyFix(path, [1, 0.015], true, 1000, true), null);
  });
  it('rejects invalid coordinates, degenerate paths and ambiguous self-crossings', () => {
    assert.equal(validCoordinate([NaN, 0]), false);
    assert.equal(validCoordinate([91, 0]), false);
    assert.equal(locateOnJourney([], [0, 0]), null);
    assert.equal(locateOnJourney([[0, 0], [0, 0.01], [0.01, 0.01], [0, 0]], [0, 0]), null);
  });
  it('uses this child boarding point outbound, and school departure on the return leg', () => {
    assert.equal(progressForJourneyFix(path, [0, 0.005], true, 1000, true), null);
    assert.ok(progressForJourneyFix({ ...path, boarding: 0 }, [0, 0.005], true, 1000, true)! > 0);
  });
});

describe('milestone clocks and schematic layout (no API data)', () => {
  it('normalizes valid clocks and refuses invalid or missing values', () => {
    assert.equal(journeyClock('6:05:00'), '06:05');
    for (const value of ['', '24:00', '10:60', '08:30:99', 'not a time']) assert.equal(journeyClock(value), null);
    assert.equal(journeyClock(undefined), null);
  });
  it('reads the existing schedule range without inventing missing endpoints', () => {
    assert.deepEqual(journeyScheduleRange('06:30 - 07:15'), { start: '06:30', end: '07:15' });
    assert.deepEqual(journeyScheduleRange(' - 07:15'), { start: null, end: '07:15' });
    assert.deepEqual(journeyScheduleRange('unavailable'), { start: null, end: null });
  });
  it('never presents parking-lot arrival as the return drop-off time', () => {
    assert.equal(journeyArrivalClock('TO_PARKING', null, '18:00'), null);
    assert.equal(journeyArrivalClock('TO_PARKING', '17:25', '18:00'), '17:25');
    assert.equal(journeyArrivalClock('TO_SCHOOL', null, '07:15'), '07:15');
  });
  it('formats recorded arrival in Vietnam and refuses an invalid timestamp', () => {
    assert.equal(journeyRecordedClock('2026-01-01T00:15:00Z'), '07:15');
    assert.equal(journeyRecordedClock('invalid'), null);
  });
  it('anchors pickup to the middle schematic node without treating it as half the distance', () => {
    for (const home of [0.02, 0.15, 0.98]) {
      assert.equal(journeyDiagramPosition(0, home, true), 0);
      assert.equal(journeyDiagramPosition(home, home, true), 0.5);
      assert.equal(journeyDiagramPosition(1, home, true), 1);
      assert.equal(journeyDiagramPosition(home / 2, home, true), 0.25);
      assert.ok(Math.abs(journeyDiagramPosition(home + (1 - home) / 2, home, true)! - 0.75) < 1e-12);
    }
  });
  it('preserves neutral/missing data rather than assuming an intermediate bus position', () => {
    assert.equal(journeyDiagramPosition(0.3, undefined, true), null);
    assert.equal(journeyDiagramPosition(null, 0.4, true), null);
    assert.equal(journeyDiagramPosition(NaN, 0.4, true), null);
    assert.equal(journeyDiagramPosition(0, undefined, true), 0);
    assert.equal(journeyDiagramPosition(1, undefined, true), 1);
    assert.equal(journeyDiagramPosition(0.3, undefined, false), 0.3);
  });
});
