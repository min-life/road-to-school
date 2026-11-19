import { ConflictException, GoneException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { frozenTripWhere } from '../../overview/operations-policy.js';
import { lockOperations } from '../../trips/utils/operations-lock.js';
import type { EnrollmentSession } from './enrollment-session.schema.js';
export const pending = (s: Pick<EnrollmentSession, 'state'>) =>
  s.state === 'COMMITTING' || s.state === 'RECONCILING';
export const effectiveOpen = (s: EnrollmentSession, now = Date.now()) =>
  s.isOpen && (pending(s) || s.expiresAt.getTime() > now);
export function enrollmentError(code: string, message: string): never {
  throw new ConflictException({ code, message });
}
export const VEHICLE_ENROLLMENT_BUSY = 'VEHICLE_ENROLLMENT_BUSY';
export const vehicleEnrollmentBusyMessage =
  'Xe đã sẵn sàng hoặc đang phục vụ chuyến. Chọn thiết bị khác hoặc thử lại sau.';

export function supportsAssignedEnrollment(version: string) {
  const release = /^(\d+)\.(\d+)\.\d+(?:[-+].+)?$/.exec(version);
  if (!release) return false;
  const major = Number(release[1]);
  return major > 1 || (major === 1 && Number(release[2]) >= 4);
}

export const needsLegacyEnrollmentLease = (version: string | undefined) =>
  /^1\.4\./.test(version ?? '');

export async function hasBusyEnrollmentVehicle(
  tx: Prisma.TransactionClient,
  vehicleId: string,
) {
  // Serialize with Ready, Start, attendance writes and changes in trip assignment.
  await lockOperations(tx);
  return !!(await tx.trip.findFirst({
    where: {
      assignedVehicleId: vehicleId,
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      AND: frozenTripWhere,
    },
    select: { id: true },
  }));
}
export function bindingMatchesSession(
  s: Pick<EnrollmentSession, 'operation' | 'expectedPreviousCardUid'>,
  currentUid: string | null,
) {
  return s.operation === 'REPLACE'
    ? !!s.expectedPreviousCardUid && currentUid === s.expectedPreviousCardUid
    : currentUid === null;
}
export function requireDifferentCard(
  currentUid: string | null,
  candidateUid: string,
) {
  if (currentUid === candidateUid)
    enrollmentError('SAME_CARD', 'Đây là thẻ hiện tại. Vui lòng quẹt thẻ mới.');
}
export function requireLive(s: EnrollmentSession, now = Date.now()) {
  if (!s.isOpen || (!pending(s) && s.expiresAt.getTime() <= now))
    throw new GoneException({
      code: 'SESSION_EXPIRED',
      message: 'Phiên đã kết thúc hoặc hết hạn. Mở phiên mới.',
    });
}
export function assertCaptureTime(
  s: EnrollmentSession,
  scannedAt: Date,
  now = Date.now(),
) {
  if (
    scannedAt.getTime() < s.startedAt.getTime() ||
    scannedAt.getTime() >= s.expiresAt.getTime() ||
    now >= s.expiresAt.getTime() ||
    now - scannedAt.getTime() > 120000 ||
    scannedAt.getTime() > now + 5000
  )
    enrollmentError(
      'STALE_SESSION',
      'Thời gian quẹt không thuộc phiên hiện tại',
    );
}
export function sameCapture(
  s: EnrollmentSession,
  d: { scanId: string; cardUid: string; scannedAt: string; cardType?: string },
) {
  return (
    s.capturedScanId === d.scanId &&
    s.capturedCardUid === d.cardUid &&
    s.capturedScannedAt?.getTime() === new Date(d.scannedAt).getTime() &&
    s.capturedCardType === d.cardType
  );
}
