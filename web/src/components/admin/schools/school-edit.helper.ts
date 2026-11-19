import type { SchoolDetail, WeeklySchedule } from '../../../lib/types.ts';
import {
  getNextCalendarDay,
  validateWeeklySchedule,
} from './weekly-schedule.helper.ts';
import { vietnamDate } from '../../../lib/school-lifecycle.ts';

export const CANONICAL_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export interface SchoolEditBaseline {
  id: string;
  name: string;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  addressText: string;
  latitude: number | null;
  longitude: number | null;
  contractStartDate: string;
  contractEndDate: string;
  weeklySchedule: Record<string, { start: string; end: string }>;
}

export interface SchoolEditCurrentDraft {
  name: string;
  selectedFile: File | null;
  addressText: string;
  latitude: number | null;
  longitude: number | null;
  contractStartDate: string;
  contractEndDate: string;
  weeklySchedule: WeeklySchedule;
}

export interface SchoolEditChanges {
  isProfileChanged: boolean;
  isNameChanged: boolean;
  isImageChanged: boolean;
  isLocationChanged: boolean;
  isScheduleChanged: boolean;
  isContractChanged: boolean;
  hasChanges: boolean;
}

/**
 * Normalizes a weekly schedule object or JSON string into a canonical,
 * ordered dictionary where only active days with valid start/end are present.
 */
export function normalizeWeeklySchedule(
  schedule: WeeklySchedule | string | null | undefined,
): Record<string, { start: string; end: string }> {
  if (!schedule) return {};
  let parsed: unknown = schedule;
  if (typeof schedule === 'string') {
    try {
      parsed = JSON.parse(schedule);
    } catch {
      return {};
    }
  }

  if (!parsed || typeof parsed !== 'object') return {};

  const record = parsed as Record<string, unknown>;
  const normalized: Record<string, { start: string; end: string }> = {};

  for (const day of CANONICAL_DAYS) {
    const val = record[day];
    if (
      val &&
      typeof val === 'object' &&
      'start' in val &&
      'end' in val &&
      typeof (val as { start: unknown }).start === 'string' &&
      typeof (val as { end: unknown }).end === 'string'
    ) {
      const start = (val as { start: string }).start.trim();
      const end = (val as { end: string }).end.trim();
      if (start && end) {
        normalized[day] = { start, end };
      }
    }
  }

  return normalized;
}

/**
 * Compares two weekly schedules for equality, ignoring key ordering or JSON whitespace.
 */
export function areSchedulesEqual(
  a: WeeklySchedule | string | null | undefined,
  b: WeeklySchedule | string | null | undefined,
): boolean {
  const normA = normalizeWeeklySchedule(a);
  const normB = normalizeWeeklySchedule(b);
  return JSON.stringify(normA) === JSON.stringify(normB);
}

/**
 * Checks if two coordinates are considered equal within a 0.00001 threshold.
 */
export function areCoordinatesEqual(
  latA: number | null | undefined,
  lngA: number | null | undefined,
  latB: number | null | undefined,
  lngB: number | null | undefined,
  epsilon = 0.00001,
): boolean {
  const aValid =
    typeof latA === 'number' &&
    typeof lngA === 'number' &&
    !isNaN(latA) &&
    !isNaN(lngA);
  const bValid =
    typeof latB === 'number' &&
    typeof lngB === 'number' &&
    !isNaN(latB) &&
    !isNaN(lngB);

  if (!aValid && !bValid) return true;
  if (!aValid || !bValid) return false;

  return (
    Math.abs((latA as number) - (latB as number)) <= epsilon &&
    Math.abs((lngA as number) - (lngB as number)) <= epsilon
  );
}

/**
 * Creates an immutable baseline snapshot for an open school edit session.
 */
export function createSchoolEditBaseline(school: SchoolDetail): SchoolEditBaseline {
  return {
    id: school.id,
    name: (school.name || '').trim(),
    imageUrl: school.imageUrl ?? null,
    imagePublicId: school.imagePublicId ?? null,
    addressText: (school.addressText || '').trim(),
    latitude: typeof school.latitude === 'number' ? school.latitude : null,
    longitude: typeof school.longitude === 'number' ? school.longitude : null,
    contractStartDate: school.contractStartDate
      ? school.contractStartDate.slice(0, 10)
      : '',
    contractEndDate: school.contractEndDate
      ? school.contractEndDate.slice(0, 10)
      : '',
    weeklySchedule: normalizeWeeklySchedule(school.weeklySchedule),
  };
}

/**
 * Compares the current draft against the baseline to detect specific and overall changes.
 * Panning/zooming without coordinate change, key order differences in schedule,
 * or changing only effectiveDate does NOT count as a change.
 */
export function detectSchoolChanges(
  baseline: SchoolEditBaseline | null | undefined,
  draft: SchoolEditCurrentDraft,
): SchoolEditChanges {
  if (!baseline) {
    return {
      isProfileChanged: false,
      isNameChanged: false,
      isImageChanged: false,
      isLocationChanged: false,
      isScheduleChanged: false,
      isContractChanged: false,
      hasChanges: false,
    };
  }

  const isNameChanged = draft.name.trim() !== baseline.name.trim();
  const isImageChanged = draft.selectedFile !== null;
  const isProfileChanged = isNameChanged || isImageChanged;

  const addressChanged = draft.addressText.trim() !== baseline.addressText;
  const coordChanged = !areCoordinatesEqual(
    draft.latitude,
    draft.longitude,
    baseline.latitude,
    baseline.longitude,
  );
  const isLocationChanged = addressChanged || coordChanged;

  const isScheduleChanged = !areSchedulesEqual(
    draft.weeklySchedule,
    baseline.weeklySchedule,
  );

  const isContractChanged =
    draft.contractStartDate !== baseline.contractStartDate ||
    draft.contractEndDate !== baseline.contractEndDate;

  const hasChanges =
    isProfileChanged ||
    isLocationChanged ||
    isScheduleChanged ||
    isContractChanged;

  return {
    isProfileChanged,
    isNameChanged,
    isImageChanged,
    isLocationChanged,
    isScheduleChanged,
    isContractChanged,
    hasChanges,
  };
}

/**
 * Validates the draft form and returns an error with step target if invalid.
 */
export function validateSchoolEditForm(
  draft: SchoolEditCurrentDraft,
  changes: SchoolEditChanges,
  effectiveDate: string,
  userRole?: string,
  currentContractEndDate?: string,
): { valid: boolean; error?: string; stepTarget?: number } {
  if (userRole && userRole !== 'SYSTEM_ADMIN') {
    return {
      valid: false,
      error:
        'Chỉ Quản trị viên hệ thống (SYSTEM_ADMIN) mới có quyền chỉnh sửa thông tin trường học.',
    };
  }

  // Step 1: School profile (Name & Image)
  if (!draft.name.trim()) {
    return {
      valid: false,
      error: 'Vui lòng nhập tên trường học.',
      stepTarget: 1,
    };
  }
  if (draft.name.trim().length < 2) {
    return {
      valid: false,
      error: 'Tên trường học phải có ít nhất 2 ký tự.',
      stepTarget: 1,
    };
  }
  if (draft.selectedFile) {
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (draft.selectedFile.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: 'Kích thước ảnh vượt quá giới hạn 5MB.',
        stepTarget: 1,
      };
    }
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED_TYPES.includes(draft.selectedFile.type)) {
      return {
        valid: false,
        error: 'Định dạng ảnh không hợp lệ. Chỉ chấp nhận JPG, PNG hoặc WebP.',
        stepTarget: 1,
      };
    }
  }

  // Step 2: Location
  if (!draft.addressText.trim()) {
    return {
      valid: false,
      error: 'Vui lòng nhập địa chỉ chi tiết của trường học.',
      stepTarget: 2,
    };
  }
  if (draft.latitude === null || draft.longitude === null) {
    return {
      valid: false,
      error: 'Vui lòng chọn vị trí trường trên bản đồ hoặc từ gợi ý.',
      stepTarget: 2,
    };
  }

  // Step 3: Contract dates
  if (!draft.contractStartDate) {
    return {
      valid: false,
      error: 'Vui lòng chọn ngày bắt đầu hợp đồng.',
      stepTarget: 3,
    };
  }
  if (!draft.contractEndDate) {
    return {
      valid: false,
      error: 'Vui lòng chọn ngày kết thúc hợp đồng.',
      stepTarget: 3,
    };
  }
  const minEndDate = getNextCalendarDay(draft.contractStartDate);
  if (minEndDate && draft.contractEndDate < minEndDate) {
    return {
      valid: false,
      error: 'Ngày kết thúc hợp đồng phải sau ngày bắt đầu ít nhất 1 ngày.',
      stepTarget: 3,
    };
  }

  // Step 3: Weekly schedule
  const scheduleRes = validateWeeklySchedule(draft.weeklySchedule);
  if (!scheduleRes.valid) {
    return {
      valid: false,
      error: scheduleRes.error || 'Lịch học tuần không hợp lệ.',
      stepTarget: 3,
    };
  }

  if (changes.isLocationChanged || changes.isScheduleChanged) {
    const effDate = resolveSchoolEditEffectiveDate(effectiveDate, changes.isLocationChanged);
    const stepTarget = changes.isLocationChanged ? 2 : 3;
    if (effDate < vietnamDate()) {
      return {
        valid: false,
        error: 'Ngày áp dụng vị trí/lịch học mới phải từ hôm nay trở đi.',
        stepTarget,
      };
    }
    const contractEndSlice = schoolEditEffectiveDateLimit(draft.contractEndDate, currentContractEndDate);
    if (contractEndSlice && effDate > contractEndSlice) {
      return {
        valid: false,
        error:
          'Ngày áp dụng vị trí/lịch học mới không thể vượt quá ngày kết thúc hợp đồng.',
        stepTarget,
      };
    }
  }

  return { valid: true };
}

export function resolveSchoolEditEffectiveDate(effectiveDate: string, isLocationChanged: boolean): string {
  return effectiveDate || vietnamDate(isLocationChanged ? 0 : 1);
}

export function schoolEditEffectiveDateLimit(draftEnd: string, currentEnd?: string): string {
  const draftDate = draftEnd.slice(0, 10);
  const currentDate = currentEnd?.slice(0, 10);
  return currentDate && (!draftDate || currentDate < draftDate) ? currentDate : draftDate;
}
