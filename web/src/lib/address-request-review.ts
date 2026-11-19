import type { SystemRequestRoutingPreviewResponse } from './types';

export function addressApprovalOutcome(preview: SystemRequestRoutingPreviewResponse | null) {
  if (!preview || preview.overallFeasibility === 'UNAVAILABLE') return null;
  if (preview.routes.length === 0) {
    return preview.overallFeasibility === 'FEASIBLE' ? 'DIRECT_UPDATE' : null;
  }
  if (preview.overallFeasibility === 'INFEASIBLE') return 'REMOVED_FROM_ROUTES';
  return preview.previewToken && preview.expectedFingerprint ? 'REOPTIMIZED' : null;
}

export function validateRoutingInputs(minutesText: string, secondsText: string) {
  const maxRouteDurationMinutes = Number(minutesText);
  const defaultStopServiceSeconds = Number(secondsText);
  const minutesError = !minutesText.trim() || !Number.isFinite(maxRouteDurationMinutes) || maxRouteDurationMinutes < 10 || maxRouteDurationMinutes > 180
    ? 'Nhập thời gian từ 10 đến 180 phút.' : null;
  const secondsError = !secondsText.trim() || !Number.isInteger(defaultStopServiceSeconds) || defaultStopServiceSeconds < 10 || defaultStopServiceSeconds > 300
    ? 'Nhập số nguyên từ 10 đến 300 giây.' : null;
  return { minutesError, secondsError, maxRouteDurationMinutes, defaultStopServiceSeconds };
}

export function isServiceAreaRejection(message: string | null) {
  return Boolean(message && /^(Điểm đón vượt bán kính phục vụ|Điểm đón khác tỉnh\/thành với trường)/.test(message));
}
