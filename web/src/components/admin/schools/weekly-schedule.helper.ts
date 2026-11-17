import type { DaySchedule, WeeklySchedule } from '../../../lib/types.ts';

export interface DayConfig {
  key: string;
  label: string;
}

export const DAYS_OF_WEEK: DayConfig[] = [
  { key: 'monday', label: 'Thứ 2' },
  { key: 'tuesday', label: 'Thứ 3' },
  { key: 'wednesday', label: 'Thứ 4' },
  { key: 'thursday', label: 'Thứ 5' },
  { key: 'friday', label: 'Thứ 6' },
  { key: 'saturday', label: 'Thứ 7' },
  { key: 'sunday', label: 'Chủ nhật' },
];

export const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Returns today's date formatted as YYYY-MM-DD according to Asia/Ho_Chi_Minh timezone.
 */
export function getVietnamToday(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Calculates the next calendar day string (YYYY-MM-DD) from a given date string (YYYY-MM-DD).
 * Safely handles month boundaries, leap years, and year-end rollovers.
 */
export function getNextCalendarDay(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return '';
  }
  const next = new Date(parts[0], parts[1] - 1, parts[2] + 1);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, '0');
  const d = String(next.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Validates a single day's schedule. Returns error string or null if valid.
 */
export function getDayScheduleError(dayData?: DaySchedule): string | null {
  if (!dayData) return null;
  if (!dayData.start || !TIME_REGEX.test(dayData.start)) {
    return 'Giờ bắt đầu học không hợp lệ (định dạng HH:mm).';
  }
  if (!dayData.end || !TIME_REGEX.test(dayData.end)) {
    return 'Giờ kết thúc học không hợp lệ (định dạng HH:mm).';
  }
  if (dayData.start === dayData.end) {
    return 'Giờ kết thúc học phải muộn hơn giờ bắt đầu (không được bằng nhau).';
  }
  if (dayData.start > dayData.end) {
    return `Giờ kết thúc học (${dayData.end}) phải muộn hơn giờ bắt đầu (${dayData.start}).`;
  }
  return null;
}

/**
 * Validates a WeeklySchedule object according to business rules:
 * 1. At least one day selected.
 * 2. Time format HH:mm.
 * 3. start < end (no overnight schedules).
 */
export function validateWeeklySchedule(schedule: WeeklySchedule): {
  valid: boolean;
  error?: string;
  invalidDayKey?: string;
  invalidField?: 'start' | 'end';
} {
  const activeDays = Object.entries(schedule).filter(
    ([, val]) => val !== undefined && val !== null,
  ) as [string, DaySchedule][];

  if (activeDays.length === 0) {
    return {
      valid: false,
      error: 'Vui lòng chọn ít nhất một ngày học trong tuần.',
    };
  }

  for (const [dayKey, dayVal] of activeDays) {
    const dayLabel = DAYS_OF_WEEK.find((d) => d.key === dayKey)?.label || String(dayKey);

    if (!dayVal.start || !TIME_REGEX.test(dayVal.start)) {
      return {
        valid: false,
        error: `${dayLabel}: Giờ bắt đầu học không hợp lệ (định dạng HH:mm).`,
        invalidDayKey: dayKey,
        invalidField: 'start',
      };
    }

    if (!dayVal.end || !TIME_REGEX.test(dayVal.end)) {
      return {
        valid: false,
        error: `${dayLabel}: Giờ kết thúc học không hợp lệ (định dạng HH:mm).`,
        invalidDayKey: dayKey,
        invalidField: 'end',
      };
    }

    if (dayVal.start >= dayVal.end) {
      return {
        valid: false,
        error: `${dayLabel}: Giờ bắt đầu học (${dayVal.start}) phải trước giờ kết thúc học (${dayVal.end}). Không cho phép lịch qua đêm.`,
        invalidDayKey: dayKey,
        invalidField: 'end',
      };
    }
  }

  return { valid: true };
}
