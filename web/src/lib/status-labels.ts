import type { LeaveNoticeStatus, RoutePlanStatus, TripStatus } from './types';

/** Display labels only. API enum values and workflow decisions remain unchanged. */
export const ROUTE_PLAN_STATUS_LABELS = {
  DRAFT: 'Chưa duyệt',
  ACTIVE: 'Đang hoạt động',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Hết hạn hợp đồng',
} satisfies Record<RoutePlanStatus, string>;

export const TRIP_STATUS_LABELS = {
  SCHEDULED: 'Đã lên lịch',
  IN_PROGRESS: 'Đang chạy',
  COMPLETED: 'Đã hoàn thành',
  CANCELLED: 'Đã hủy',
  NOT_CREATED: 'Chưa tạo (Dự kiến)',
} satisfies Record<TripStatus | 'NOT_CREATED', string>;

export const LEAVE_NOTICE_STATUS_LABELS = {
  RECORDED: 'Đã ghi nhận',
  PENDING_REPLACEMENT: 'Chờ phân công',
  REPLACED: 'Đã bố trí',
  WITHDRAWN: 'Đã hủy',
  TRIP_CANCELLED: 'Chuyến đã hủy',
} satisfies Record<LeaveNoticeStatus, string>;

function labelFor(labels: Record<string, string>, status: string | null | undefined) {
  return status && Object.prototype.hasOwnProperty.call(labels, status)
    ? labels[status]
    : 'Không xác định';
}

export const getRoutePlanStatusLabel = (status: string | null | undefined) => labelFor(ROUTE_PLAN_STATUS_LABELS, status);
export const getTripStatusLabel = (status: string | null | undefined) => labelFor(TRIP_STATUS_LABELS, status);
export const getLeaveNoticeStatusLabel = (status: string | null | undefined) => labelFor(LEAVE_NOTICE_STATUS_LABELS, status);
