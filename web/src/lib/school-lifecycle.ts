import type { RoutePlanStatus, TripStatus, WeeklySchedule } from './types';

export interface ScheduledChangeResult {
  scheduledChangeId?: string;
  effectiveDate?: string;
  changeStatus?: 'PENDING';
}
export interface SchoolOperatingSettings {
  id: string;
  name: string;
  addressText: string;
  contractStartDate: string;
  contractEndDate: string;
  weeklySchedule: WeeklySchedule;
  isActive: boolean;
}
export interface SchoolScheduledChange {
  id: string;
  schoolId: string;
  type: 'INACTIVE' | 'LOCATION' | 'SCHEDULE';
  effectiveDate: string;
  payload: { isActive?: boolean; addressText?: string; latitude?: number; longitude?: number; weeklySchedule?: WeeklySchedule };
  status: 'PENDING' | 'APPLIED' | 'CANCELLED' | 'FAILED';
  createdAt: string;
  appliedAt: string | null;
  cancelledAt: string | null;
  lastError: string | null;
}
export type CalendarStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'BLOCKED';
export interface CalendarEntryInput {
  schoolId?: string;
  title: string;
  kind: 'HOLIDAY' | 'MAKEUP';
  calendar: 'SOLAR' | 'LUNAR';
  recurrence: 'ONCE' | 'ANNUAL';
  year?: number;
  month: number;
  day: number;
  leapMonth?: boolean;
  startTime?: string;
  endTime?: string;
}
export interface ServiceCalendarEntry extends Omit<CalendarEntryInput, 'schoolId' | 'year' | 'startTime' | 'endTime'> {
  id: string;
  schoolId: string | null;
  year: number | null;
  startTime: string | null;
  endTime: string | null;
  status: Exclude<CalendarStatus, 'BLOCKED'>;
  effectiveStatus?: CalendarStatus;
  effectiveStatusReason?: 'OPERATOR_HOLIDAY' | null;
  reason?: string | null;
  createdAt: string;
}
export interface TripAdminFinalization {
  state: 'PENDING' | 'FINALIZED';
  trigger?: string;
  effectiveDate?: string;
  detectedAt?: string;
  previousStatus?: TripStatus;
  finalStatus?: 'COMPLETED' | 'CANCELLED';
  reason?: string;
  finalizedById?: string;
  finalizedAt?: string;
}
export interface AdminFinalizationTrip {
  id: string;
  schoolId: string;
  serviceDate: string;
  status: TripStatus;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
  routeSnapshot: { routeName?: string; name?: string; schoolName?: string } | null;
  adminFinalization: TripAdminFinalization | null;
}
export interface FinalizeTripInput {
  finalStatus: 'COMPLETED' | 'CANCELLED';
  expectedStatus: 'SCHEDULED' | 'IN_PROGRESS';
  reason: string;
}

export function vietnamDate(offsetDays = 0): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = (key: string) => Number(parts.find(part => part.type === key)?.value);
  return new Date(Date.UTC(value('year'), value('month') - 1, value('day') + offsetDays)).toISOString().slice(0, 10);
}
export function displayDate(value: string): string {
  const date = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split('-').reverse().join('/') : value;
}
export function effectivePlanStatus(plan: { status: RoutePlanStatus; effectiveStatus?: RoutePlanStatus }): RoutePlanStatus {
  return plan.effectiveStatus ?? plan.status;
}
export function lifecycleReason(reason?: string | null): string {
  const labels: Record<string, string> = {
    CONTRACT_EXPIRED: 'Hết hạn hợp đồng', SCHOOL_INACTIVE: 'Trường ngừng hoạt động',
    LOCATION_CHANGED: 'Trường thay đổi địa điểm', HOLIDAY: 'Ngày nghỉ', OPERATOR_HOLIDAY: 'Trùng ngày nghỉ nhà xe',
  };
  return reason ? labels[reason] ?? 'Thay đổi điều kiện vận hành' : '';
}
export function lifecycleError(error: unknown): string {
  const value = error as { statusCode?: number; message?: string };
  return value?.statusCode === 404
    ? 'API đang chạy chưa hỗ trợ chức năng này hoặc dữ liệu không còn tồn tại. Hãy kiểm tra phiên bản API rồi thử lại.'
    : value?.message || 'Không thể thực hiện thao tác. Vui lòng thử lại.';
}
