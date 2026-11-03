import assert from 'node:assert/strict';
import test from 'node:test';
import { calendarMatches, calendarOccurrence } from './service-calendar.ts';

// Pure date arithmetic only: no users, schools, trips, API calls or database fixtures.
test('rejects invalid solar dates and preserves February 29 for annual recurrence', () => {
  const leapDay = { calendar: 'SOLAR', recurrence: 'ANNUAL', year: null, day: 29, month: 2, leapMonth: false } as const;
  assert.equal(calendarOccurrence(leapDay, 2026), null);
  assert.equal(calendarOccurrence(leapDay, 2028), '2028-02-29');
  assert.equal(calendarMatches(leapDay, '2028-02-29'), true);
  assert.equal(calendarOccurrence({ ...leapDay, month: 4, day: 31 }, 2028), null);
});

test('matches Vietnamese lunar new year using UTC+7', () => {
  const lunarNewYear = { calendar: 'LUNAR', recurrence: 'ONCE', year: 2026, day: 1, month: 1, leapMonth: false } as const;
  assert.equal(calendarOccurrence(lunarNewYear, 2026), '2026-02-17');
  assert.equal(calendarMatches(lunarNewYear, '2026-02-17'), true);
  assert.equal(calendarMatches(lunarNewYear, '2026-02-16'), false);
  assert.equal(calendarMatches(lunarNewYear, '2027-02-06'), false);
});

test('distinguishes lunar leap month from ordinary month and skips nonexistent leap months', () => {
  const leapMonth = { calendar: 'LUNAR', recurrence: 'ANNUAL', year: null, day: 1, month: 2, leapMonth: true } as const;
  assert.equal(calendarOccurrence(leapMonth, 2023), '2023-03-22');
  assert.equal(calendarMatches(leapMonth, '2023-03-22'), true);
  assert.equal(calendarMatches({ ...leapMonth, leapMonth: false }, '2023-03-22'), false);
  assert.equal(calendarOccurrence(leapMonth, 2026), null);
});
