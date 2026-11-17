import assert from 'node:assert/strict';
import test from 'node:test';
import { calendarMatches, calendarOccurrence, resolveSchoolDay } from './service-calendar.ts';

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

test('resolveSchoolDay resolves canonical day types: REGULAR, WEEKLY_OFF, HOLIDAY, MAKEUP, INACTIVE', () => {
  const standardSchedule = {
    monday: { start: '07:30', end: '16:30' },
    tuesday: { start: '07:30', end: '16:30' },
    wednesday: { start: '07:30', end: '16:30' },
    thursday: { start: '07:30', end: '16:30' },
    friday: { start: '07:30', end: '16:30' },
  };

  // 1. Regular school day (Monday 2026-11-16)
  const regular = resolveSchoolDay('2026-11-16', standardSchedule, [], 'school-1', []);
  assert.equal(regular.dayType, 'REGULAR');
  assert.equal(regular.start, '07:30');
  assert.equal(regular.end, '16:30');

  // 2. Weekly off (Sunday 2026-11-15)
  const weeklyOff = resolveSchoolDay('2026-11-15', standardSchedule, [], 'school-1', []);
  assert.equal(weeklyOff.dayType, 'WEEKLY_OFF');
  assert.equal(weeklyOff.label, 'Nghỉ theo lịch tuần');

  // 3. School Holiday takes precedence over regular schedule
  const schoolHolidayEntry = {
    id: 'entry-1',
    schoolId: 'school-1',
    title: 'Nghỉ lễ kỷ niệm',
    kind: 'HOLIDAY' as const,
    calendar: 'SOLAR' as const,
    recurrence: 'ONCE' as const,
    year: 2026,
    month: 11,
    day: 16,
    startTime: null,
    endTime: null,
    status: 'APPROVED' as const,
    createdAt: '2026-11-01T00:00:00Z',
  };
  const holiday = resolveSchoolDay('2026-11-16', standardSchedule, [schoolHolidayEntry], 'school-1', []);
  assert.equal(holiday.dayType, 'HOLIDAY');
  assert.equal(holiday.label, 'Nghỉ lễ kỷ niệm');

  // 4. Operator Holiday takes precedence
  const operatorHolidayEntry = {
    id: 'entry-op-1',
    schoolId: null,
    title: 'Nghỉ lễ nhà xe',
    kind: 'HOLIDAY' as const,
    calendar: 'SOLAR' as const,
    recurrence: 'ONCE' as const,
    year: 2026,
    month: 11,
    day: 17,
    startTime: null,
    endTime: null,
    status: 'APPROVED' as const,
    createdAt: '2026-11-01T00:00:00Z',
  };
  const opHoliday = resolveSchoolDay('2026-11-17', standardSchedule, [operatorHolidayEntry], 'school-1', []);
  assert.equal(opHoliday.dayType, 'HOLIDAY');
  assert.equal(opHoliday.label, 'Nghỉ lễ nhà xe');

  // 5. Makeup day on Saturday with hours
  const makeupEntry = {
    id: 'entry-makeup-1',
    schoolId: 'school-1',
    title: 'Học bù thứ Hai',
    kind: 'MAKEUP' as const,
    calendar: 'SOLAR' as const,
    recurrence: 'ONCE' as const,
    year: 2026,
    month: 11,
    day: 21,
    startTime: '08:00',
    endTime: '11:30',
    status: 'APPROVED' as const,
    createdAt: '2026-11-01T00:00:00Z',
  };
  const makeup = resolveSchoolDay('2026-11-21', standardSchedule, [makeupEntry], 'school-1', []);
  assert.equal(makeup.dayType, 'MAKEUP');
  assert.equal(makeup.label, 'Học bù thứ Hai');
  assert.equal(makeup.start, '08:00');
  assert.equal(makeup.end, '11:30');

  // 6. Inactive scheduled change
  const inactiveChange = {
    id: 'change-1',
    schoolId: 'school-1',
    type: 'INACTIVE' as const,
    effectiveDate: '2026-11-10',
    payload: { isActive: false },
    status: 'PENDING' as const,
    createdAt: '2026-11-01T00:00:00Z',
    appliedAt: null,
    cancelledAt: null,
    lastError: null,
  };
  const inactive = resolveSchoolDay('2026-11-16', standardSchedule, [], 'school-1', [inactiveChange]);
  assert.equal(inactive.dayType, 'INACTIVE');
  assert.equal(inactive.label, 'Ngừng hoạt động');
});
