import type { RoutePlanStatus } from './types';

export const ROUTE_PLAN_STATUS_LABELS: Record<RoutePlanStatus, string> = {
  DRAFT: 'Nháp',
  ACTIVE: 'Đã duyệt',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Hết hạn',
};

export function getRoutePlanStatusLabel(status: string | null | undefined): string {
  return status && Object.hasOwn(ROUTE_PLAN_STATUS_LABELS, status)
    ? ROUTE_PLAN_STATUS_LABELS[status as RoutePlanStatus]
    : 'Không xác định';
}
