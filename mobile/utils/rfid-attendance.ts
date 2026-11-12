import type {
  RfidAttendanceEvent,
  RfidPhase,
} from '../services/rfid-attendance';

export const isRfidPending = (state: string) =>
  state === 'COMMITTING' || state === 'RECONCILING';
export const phaseLabel = (phase: RfidPhase) =>
  phase === 'BOARDING' ? 'lên xe' : 'xuống xe';
export function canConfirmRfid(
  event: RfidAttendanceEvent,
  phase: RfidPhase | null,
  serverNow: number,
) {
  return (
    event.state === 'WAITING_CONFIRMATION' &&
    !!event.studentId &&
    event.phase === phase &&
    new Date(event.expiresAt).getTime() > serverNow
  );
}
const reasons: Record<string, string> = {
  UNKNOWN_CARD: 'Thẻ chưa đăng ký.',
  OUTSIDE_ROSTER: 'Học sinh không thuộc danh sách chuyến.',
  STUDENT_INACTIVE: 'Học sinh hoặc trường đã ngừng hoạt động.',
  ABSENCE_REQUIRES_REVIEW:
    'Đã ghi vắng. Vui lòng xử lý bằng điểm danh thủ công.',
  NOT_BOARDED: 'Chưa xác nhận học sinh lên xe.',
  MANUAL_OVERRIDE: 'Điểm danh đã được sửa. Tiếp tục xử lý thủ công.',
  RECEIPT_NOT_CONFIRMED:
    'Chưa xác nhận được kết quả. Kiểm tra điểm danh trước khi quẹt lại.',
  STALE_CONTEXT: 'Chuyến hoặc giai đoạn đã thay đổi. Vui lòng quẹt lại.',
  STALE_STUDENT: 'Thẻ hoặc hồ sơ đã thay đổi. Vui lòng quẹt lại.',
  CANDIDATE_EXPIRED: 'Lượt quẹt đã hết hạn.',
  CONFIRMATION_PENDING: 'Đang đối soát kết quả.',
};
export function rfidOutcome(event: RfidAttendanceEvent) {
  if (isRfidPending(event.state))
    return 'Đang đối soát. Giữ nguyên lượt quẹt này để kiểm tra kết quả.';
  if (event.state === 'APPLIED')
    return event.current
      ? `Đã xác nhận ${phaseLabel(event.phase)}.`
      : 'Lượt đã xử lý; điểm danh hiện tại đã thay đổi.';
  if (event.state === 'ALREADY_RECORDED')
    return event.current
      ? 'Học sinh đã được ghi nhận.'
      : 'Lượt đã xử lý; hãy xem điểm danh hiện tại.';
  if (event.state === 'DISMISSED') return 'Đã bỏ qua lượt quẹt.';
  if (event.state === 'EXPIRED') return 'Lượt quẹt đã hết hạn.';
  return reasons[event.resultCode ?? ''] ?? 'Lượt quẹt chưa được ghi nhận.';
}
export function rfidError(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  return (
    (code && reasons[code]) ||
    (error instanceof Error
      ? error.message.slice(0, 240)
      : 'Chưa hoàn tất thao tác. Kiểm tra lại kết quả.')
  );
}
export function rfidResultUnknown(error: unknown) {
  if (error instanceof Error && error.message === 'Đang xử lý thao tác trước')
    return false;
  const status = (error as { statusCode?: number } | null)?.statusCode;
  return status === undefined || status === 0 || status >= 500;
}
