import { computeDateFromLunarDate, computeDateToLunarDate } from 'amlich.js';
import type { ServiceCalendarEntry, SchoolScheduledChange } from './school-lifecycle';
import type { WeeklySchedule } from './types';

type CalendarDate = Pick<ServiceCalendarEntry, 'calendar' | 'recurrence' | 'year' | 'month' | 'day' | 'leapMonth'>;
/** UTC+7 calendar matching; amlich.js 1.0.6 returns a boolean lunarLeap. */
export function calendarMatches(entry: CalendarDate, date: string): boolean {
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);
  if (entry.calendar === 'SOLAR') return entry.month === month && entry.day === day && (entry.recurrence === 'ANNUAL' || entry.year === year);
  const value = computeDateToLunarDate(day, month, year, 7);
  return entry.month === value.lunarMonth && entry.day === value.lunarDay && Boolean(entry.leapMonth) === Boolean(value.lunarLeap)
    && (entry.recurrence === 'ANNUAL' || entry.year === value.lunarYear);
}
export function calendarOccurrence(entry: CalendarDate, year: number): string | null {
  let y = year, m = entry.month, d = entry.day;
  if (entry.calendar === 'LUNAR') {
    const value = computeDateFromLunarDate(d, m, y, Number(Boolean(entry.leapMonth)), 7);
    if (Array.isArray(value)) return null;
    y = value.year; m = value.month + 1; d = value.day;
  }
  const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
  return calendarMatches(entry, date) ? date : null;
}
export function resolveSchoolDay(date: string, schedule: WeeklySchedule, entries: ServiceCalendarEntry[], schoolId: string, changes: SchoolScheduledChange[] = []) {
  let weekly = schedule;
  let inactive = false;
  for (const change of [...changes].filter(row => row.status === 'PENDING' && row.effectiveDate.slice(0, 10) <= date).sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate) || a.createdAt.localeCompare(b.createdAt))) {
    if (change.type === 'SCHEDULE' && change.payload.weeklySchedule) weekly = change.payload.weeklySchedule;
    if (change.type === 'INACTIVE') inactive = true;
  }
  if (inactive) return { kind: 'HOLIDAY' as const, label: 'Ngừng hoạt động' };
  const eligible = entries.filter(row => (row.effectiveStatus ?? row.status) === 'APPROVED' && calendarMatches(row, date));
  const operatorHoliday = eligible.find(row => row.kind === 'HOLIDAY' && !row.schoolId);
  if (operatorHoliday) return { kind: 'HOLIDAY' as const, label: operatorHoliday.title };
  const makeup = eligible.find(row => row.kind === 'MAKEUP' && row.schoolId === schoolId && row.startTime && row.endTime);
  if (makeup) return { kind: 'MAKEUP' as const, label: makeup.title, start: makeup.startTime!, end: makeup.endTime! };
  const holiday = eligible.find(row => row.kind === 'HOLIDAY' && row.schoolId === schoolId);
  if (holiday) return { kind: 'HOLIDAY' as const, label: holiday.title };
  const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date(`${date}T00:00:00Z`).getUTCDay()];
  const hours = weekly[weekday];
  return hours?.start && hours.end ? { kind: 'REGULAR' as const, label: '', ...hours } : { kind: 'HOLIDAY' as const, label: 'Nghỉ' };
}
