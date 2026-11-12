import { ConflictException, GoneException } from '@nestjs/common';
import type { Trip, TripAttendance } from '@prisma/client';
import { createHash } from 'node:crypto';
export type AttendancePhase = 'BOARDING' | 'ALIGHTING';
export function attendanceError(code: string, message: string): never {
  throw new ConflictException({ code, message });
}
export function attendancePhase(
  t: Pick<
    Trip,
    'direction' | 'status' | 'attendantReadyAt' | 'arrivedAtSchoolAt'
  >,
): AttendancePhase | null {
  if (!t.attendantReadyAt) return null;
  if (t.direction === 'TO_SCHOOL')
    return t.status === 'IN_PROGRESS'
      ? t.arrivedAtSchoolAt
        ? 'ALIGHTING'
        : 'BOARDING'
      : null;
  if (t.status === 'SCHEDULED') return 'BOARDING';
  return t.status === 'IN_PROGRESS' ? 'ALIGHTING' : null;
}
export function contextVersion(t: Trip) {
  return createHash('sha256')
    .update(
      JSON.stringify([
        t.id,
        t.serviceDate,
        t.direction,
        t.status,
        t.assignedVehicleId,
        t.assignedDriverId,
        t.assignedBusAttendantId,
        t.attendantReadyAt,
        t.arrivedAtSchoolAt,
        t.actualStartTime,
      ]),
    )
    .digest('hex');
}
export function receiptField(phase: AttendancePhase) {
  return phase === 'BOARDING' ? 'rfidBoardingScanId' : 'rfidAlightingScanId';
}
export function alreadyRecorded(
  a: Pick<TripAttendance, 'status' | 'alightedAt'>,
  phase: AttendancePhase,
) {
  return phase === 'BOARDING' ? a.status === 'PRESENT' : !!a.alightedAt;
}
export function candidateLive(expiresAt: Date, now = Date.now()) {
  if (expiresAt.getTime() <= now)
    throw new GoneException({
      code: 'CANDIDATE_EXPIRED',
      message: 'Lượt quẹt đã hết hạn. Quẹt lại hoặc dùng điểm danh thủ công.',
    });
}
export function attendanceAllowed(a: TripAttendance, phase: AttendancePhase) {
  if (a.excludedAt)
    attendanceError(
      'OUTSIDE_ROSTER',
      'Học sinh không thuộc danh sách đang phục vụ.',
    );
  if (a.status === 'ABSENT')
    attendanceError(
      'ABSENCE_REQUIRES_REVIEW',
      'Học sinh đã được ghi vắng. Phụ xe cần xử lý thủ công.',
    );
  if (a[receiptField(phase)] && !alreadyRecorded(a, phase))
    attendanceError(
      'MANUAL_OVERRIDE',
      'Điểm danh đã được sửa sau RFID. Vui lòng xử lý thủ công.',
    );
  if (phase === 'ALIGHTING' && a.status !== 'PRESENT')
    attendanceError('NOT_BOARDED', 'Học sinh chưa được xác nhận lên xe.');
}
