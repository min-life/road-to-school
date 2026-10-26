/**
 * Utility functions for handling Vietnam timezone (Asia/Ho_Chi_Minh, UTC+7) dates and times.
 */

const VIETNAM_TZ = 'Asia/Ho_Chi_Minh';

export const DAY_OF_WEEK_MAP: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

export const DAY_OF_WEEK_VI_MAP: Record<string, string> = {
  monday: 'Thứ 2',
  tuesday: 'Thứ 3',
  wednesday: 'Thứ 4',
  thursday: 'Thứ 5',
  friday: 'Thứ 6',
  saturday: 'Thứ 7',
  sunday: 'Chủ nhật',
};

/**
 * Returns the day of week key ('monday'..'sunday') for a date string (YYYY-MM-DD) or Date object in VN timezone.
 */
export function getDayOfWeekKey(dateInput: string | Date): string {
  let y: number, m: number, d: number;
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('T')[0].split('-');
    y = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10) - 1;
    d = parseInt(parts[2], 10);
  } else {
    // Format Date in VN timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: VIETNAM_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.format(dateInput).split('-');
    y = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10) - 1;
    d = parseInt(parts[2], 10);
  }

  // Use UTC day of week for the exact calendar date
  const dt = new Date(Date.UTC(y, m, d, 12, 0, 0));
  return DAY_OF_WEEK_MAP[dt.getUTCDay()];
}

/**
 * Returns Vietnamese label for day of week ('Thứ 2'..'Chủ nhật')
 */
export function getDayOfWeekVietnamese(dayKey: string): string {
  return DAY_OF_WEEK_VI_MAP[dayKey.toLowerCase()] || dayKey;
}

/**
 * Formats a Date object to YYYY-MM-DD in Vietnam timezone.
 */
export function formatDateToVnYmd(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Given a calendar date YYYY-MM-DD and a local time HH:mm in Vietnam (UTC+7),
 * returns the exact JavaScript Date in UTC.
 * Example: '2026-10-26' and '06:15' -> 2026-10-25T23:15:00.000Z
 */
export function combineDateAndTimeUtc(dateYmd: string, timeHhMm: string): Date {
  const [yearStr, monthStr, dayStr] = dateYmd.split('-');
  const [hourStr, minStr] = timeHhMm.split(':');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  const hour = parseInt(hourStr, 10);
  const min = parseInt(minStr, 10);

  // Vietnam is UTC+7 -> UTC hour is local hour - 7
  return new Date(Date.UTC(year, month, day, hour - 7, min, 0, 0));
}

/**
 * Converts seconds from midnight (e.g. 22500) to HH:mm string (e.g. "06:15")
 */
export function secondsToTimeStr(sec: number): string {
  const norm = Math.max(0, sec) % 86400;
  const h = Math.floor(norm / 3600);
  const m = Math.floor((norm % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Converts HH:mm string to seconds from midnight
 */
export function timeStrToSeconds(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 3600 + (m || 0) * 60;
}

/**
 * Determines whether two time intervals overlap: [startA, endA) and [startB, endB)
 * Two intervals overlap if: startA < endB && startB < endA
 */
export function isTimeIntervalOverlapping(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  return startA.getTime() < endB.getTime() && startB.getTime() < endA.getTime();
}
