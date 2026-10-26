/**
 * Vietnam Timezone (Asia/Ho_Chi_Minh, UTC+7) Date Utilities for Mobile
 * Pure calendar-date arithmetic to prevent UTC day-shift bugs across midnight.
 */

const VIETNAM_TZ = 'Asia/Ho_Chi_Minh';

/**
 * Returns today's calendar date in Vietnam timezone as YYYY-MM-DD.
 */
export function getVietnamToday(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: VIETNAM_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    // Fallback if Intl is not fully supported
    const now = new Date();
    // UTC+7 offset
    const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const y = vnTime.getUTCFullYear();
    const m = String(vnTime.getUTCMonth() + 1).padStart(2, '0');
    const d = String(vnTime.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

/**
 * Adds or subtracts days from a YYYY-MM-DD string using UTC calendar arithmetic.
 */
export function addDaysToDateStr(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number);
  const y = parts[0];
  const m = parts[1] - 1;
  const d = parts[2];
  const dt = new Date(Date.UTC(y, m, d + days));
  const resY = dt.getUTCFullYear();
  const resM = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const resD = String(dt.getUTCDate()).padStart(2, '0');
  return `${resY}-${resM}-${resD}`;
}

/**
 * Returns the Monday YYYY-MM-DD of the week containing dateStr (Monday to Sunday week).
 */
export function getMondayOfDateStr(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  const y = parts[0];
  const m = parts[1] - 1;
  const d = parts[2];
  const dt = new Date(Date.UTC(y, m, d));
  const dayOfWeek = dt.getUTCDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  return addDaysToDateStr(dateStr, diffToMonday);
}

export interface WeekDayItem {
  dateStr: string;
  dayLabel: string;
  dateNum: number;
  isToday: boolean;
}

/**
 * Generates 7 days (Monday -> Sunday) starting from mondayStr.
 */
export function getWeekDaysFromMonday(mondayStr: string): WeekDayItem[] {
  const todayStr = getVietnamToday();
  const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const result: WeekDayItem[] = [];

  for (let i = 0; i < 7; i++) {
    const dateStr = addDaysToDateStr(mondayStr, i);
    const parts = dateStr.split('-').map(Number);
    result.push({
      dateStr,
      dayLabel: labels[i],
      dateNum: parts[2],
      isToday: dateStr === todayStr,
    });
  }

  return result;
}

/**
 * Formats Monday and Sunday dateStr to "DD/MM – DD/MM".
 * Example: 2026-10-19 and 2026-10-25 -> "19/10 – 25/10"
 */
export function formatWeekHeaderRange(mondayStr: string, sundayStr: string): string {
  const formatDm = (str: string) => {
    const parts = str.split('-');
    return `${parts[2]}/${parts[1]}`;
  };
  return `${formatDm(mondayStr)} – ${formatDm(sundayStr)}`;
}
