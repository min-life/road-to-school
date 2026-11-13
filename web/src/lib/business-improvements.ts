import type { TripAttendanceRoster, TripDetail } from './types';

/** Calendar dates in Vietnam, including when the browser runs in another time zone. */
export function vietnamDateKey(daysAhead = 0, now = new Date()) {
  const date = new Date(now.getTime() + daysAhead * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function tripAssignmentLock(trip: TripDetail, roster?: TripAttendanceRoster | null) {
  if (trip.status !== 'SCHEDULED' || trip.actualStartTime) return 'Chuyến đã bắt đầu hoặc không còn chờ xuất phát.';
  if (trip.attendantReadyAt || trip.isAttendantReady) return 'Giáo viên phụ xe đã xác nhận sẵn sàng.';
  if (roster && (roster.presentCount > 0 || roster.absentCount > 0)) return 'Chuyến đã ghi điểm danh học sinh.';
  if (trip.actualStartTime === undefined || trip.attendantReadyAt === undefined || !roster) return 'Đang chờ đủ dữ liệu để kiểm tra phân công.';
  return null;
}
