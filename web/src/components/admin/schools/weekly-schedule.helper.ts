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

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Validates a WeeklySchedule object according to business rules:
 * 1. At least one day selected.
 * 2. Time format HH:mm.
 * 3. start < end (no overnight schedules).
 */
export function validateWeeklySchedule(schedule: WeeklySchedule): {
  valid: boolean;
  error?: string;
} {
  const activeDays = Object.entries(schedule).filter(
    ([_, val]) => val !== undefined && val !== null,
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
      };
    }

    if (!dayVal.end || !TIME_REGEX.test(dayVal.end)) {
      return {
        valid: false,
        error: `${dayLabel}: Giờ kết thúc học không hợp lệ (định dạng HH:mm).`,
      };
    }

    if (dayVal.start >= dayVal.end) {
      return {
        valid: false,
        error: `${dayLabel}: Giờ bắt đầu học (${dayVal.start}) phải trước giờ kết thúc học (${dayVal.end}). Không cho phép lịch qua đêm.`,
      };
    }
  }

  return { valid: true };
}
