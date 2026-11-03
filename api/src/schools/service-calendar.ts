import { createRequire } from 'node:module';
import type { ServiceCalendarEntry } from '@prisma/client';

const lunar = createRequire(import.meta.url)('amlich.js') as {
  computeDateToLunarDate(
    d: number,
    m: number,
    y: number,
    tz: number,
  ): {
    lunarDay: number;
    lunarMonth: number;
    lunarYear: number;
    lunarLeap: number;
  };
  computeDateFromLunarDate(
    d: number,
    m: number,
    y: number,
    leap: number,
    tz: number,
  ): { day: number; month: number; year: number } | number[];
};
type CalendarDate = Pick<
  ServiceCalendarEntry,
  'calendar' | 'year' | 'month' | 'day' | 'leapMonth' | 'recurrence'
>;
export function calendarMatches(entry: CalendarDate, date: string): boolean {
  const [year, month, day] = date.split('-').map(Number);
  if (entry.calendar === 'SOLAR')
    return (
      entry.month === month &&
      entry.day === day &&
      (entry.recurrence === 'ANNUAL' || entry.year === year)
    );
  const value = lunar.computeDateToLunarDate(day, month, year, 7);
  return (
    entry.month === value.lunarMonth &&
    entry.day === value.lunarDay &&
    Number(entry.leapMonth) === value.lunarLeap &&
    (entry.recurrence === 'ANNUAL' || entry.year === value.lunarYear)
  );
}
/** Round-trip rejects library normalization of nonexistent days/months. */
export function calendarOccurrence(
  entry: CalendarDate,
  year: number,
): string | null {
  let y = year,
    m = entry.month,
    d = entry.day;
  if (entry.calendar === 'LUNAR') {
    const value = lunar.computeDateFromLunarDate(
      d,
      m,
      y,
      Number(entry.leapMonth),
      7,
    );
    if (Array.isArray(value)) return null;
    // amlich.js returns a zero-based solar month.
    y = value.year;
    m = value.month + 1;
    d = value.day;
  }
  const result = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const parsed = new Date(`${result}T00:00:00Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== result
  )
    return null;
  return calendarMatches(entry, result) ? result : null;
}
