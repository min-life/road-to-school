import { BadRequestException } from '@nestjs/common';

export interface DaySchedule {
  start: string;
  end: string;
}

export type WeeklyScheduleMap = Record<string, DaySchedule>;

const ALLOWED_DAYS = new Set([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

const TIME_24H_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Kiểm tra tính hợp lệ của chuỗi ngày theo lịch thực tế (tránh ngày như 2026-02-30).
 */
export function isValidCalendarDate(dateStr: string): boolean {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Xác thực và chuẩn hóa cấu trúc lịch học tuần (Weekly Schedule JSONB).
 * - Phải là JSON string hoặc Object hợp lệ
 * - Không được là mảng, không được rỗng
 * - Chỉ chấp nhận các khóa ngày: monday..sunday
 * - Mỗi ngày phải có "start" và "end" định dạng 24h (HH:mm)
 * - start < end (không hỗ trợ lịch học qua đêm)
 */
export function validateWeeklySchedule(scheduleInput: unknown): WeeklyScheduleMap {
  let parsed: unknown;

  if (typeof scheduleInput === 'string') {
    try {
      parsed = JSON.parse(scheduleInput);
    } catch {
      throw new BadRequestException('Lịch học tuần không đúng định dạng JSON hợp lệ');
    }
  } else {
    parsed = scheduleInput;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new BadRequestException('Lịch học tuần phải là một JSON Object');
  }

  const days = Object.keys(parsed);
  if (days.length === 0) {
    throw new BadRequestException('Lịch học tuần phải có ít nhất một ngày học');
  }

  const result: WeeklyScheduleMap = {};

  for (const day of days) {
    if (!ALLOWED_DAYS.has(day)) {
      throw new BadRequestException(
        `Ngày học không hợp lệ: "${day}". Chỉ chấp nhận các ngày từ monday đến sunday`,
      );
    }

    const dayConfig = (parsed as Record<string, unknown>)[day];
    if (!dayConfig || typeof dayConfig !== 'object' || Array.isArray(dayConfig)) {
      throw new BadRequestException(`Cấu hình lịch học cho ngày "${day}" không hợp lệ`);
    }

    const { start, end } = dayConfig as { start?: unknown; end?: unknown };

    if (typeof start !== 'string' || !TIME_24H_REGEX.test(start)) {
      throw new BadRequestException(
        `Giờ bắt đầu học cho ngày "${day}" phải có định dạng HH:mm 24 giờ (ví dụ: 07:00)`,
      );
    }

    if (typeof end !== 'string' || !TIME_24H_REGEX.test(end)) {
      throw new BadRequestException(
        `Giờ kết thúc học cho ngày "${day}" phải có định dạng HH:mm 24 giờ (ví dụ: 17:30)`,
      );
    }

    if (start >= end) {
      throw new BadRequestException(
        `Giờ kết thúc học (${end}) phải lớn hơn giờ bắt đầu học (${start}) cho ngày "${day}"`,
      );
    }

    result[day] = { start, end };
  }

  return result;
}
