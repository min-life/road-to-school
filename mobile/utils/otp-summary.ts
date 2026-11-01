const UNKNOWN = 'Chưa có thông tin';

/** Presentation parsing only; callers retain the original request JSON for verification. */
export function readSummaryObject(value?: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(value || '');
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function summaryText(value: unknown, fallback = UNKNOWN): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function summaryDate(value?: string): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return UNKNOWN;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return UNKNOWN;
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

export function summaryTimeRange(start?: string, end?: string): string {
  const clock = (value?: string) => value && /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value) ? value.slice(0, 5) : null;
  const first = clock(start), last = clock(end);
  if (!first && !last) return 'Theo lịch';
  return `${first || UNKNOWN} – ${last || UNKNOWN}`;
}

export function summaryCoordinates(latitude: unknown, longitude: unknown): string {
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude)
    || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return UNKNOWN;
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}
