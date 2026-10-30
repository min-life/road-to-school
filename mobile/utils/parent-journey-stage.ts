import type { OperationalStateResponse, ParentHomeCardItem, TripIncident, TripIncidentStatus } from '../services/api-client';
import type { JourneyTone } from '../constants/parent-journey';
import { journeyClock } from './parent-journey';

export type StudentJourneyBadge = { label: string; tone: JourneyTone; icon: 'alert-circle-outline' | 'checkmark-circle-outline' | 'time-outline' | 'log-out-outline' | 'close-circle-outline' };

export function parentJourneyCard(card: ParentHomeCardItem, operation?: OperationalStateResponse): ParentHomeCardItem {
  if (!operation || operation.tripId !== card.tripId || (operation.direction && operation.direction !== card.direction)) return card;
  const child = operation.children?.find(c => c.studentId === card.studentId);
  return { ...card, tripStatus: operation.status, ...(child ? {
    attendanceStatus: child.attendanceStatus, markedAt: child.markedAt ?? null,
    absenceReason: child.absenceReason ?? null, childIsAlighted: child.isAlighted, childAlightedAt: child.alightedAt ?? null,
  } : {}) };
}

export function studentJourneyBadge(attendance: ParentHomeCardItem['attendanceStatus'], alighted: boolean, schoolArrived: boolean,
  hasLeaveNotice: boolean, direction?: ParentHomeCardItem['direction']): StudentJourneyBadge {
  if (attendance === 'ABSENT') return { label: hasLeaveNotice ? 'Đã báo nghỉ' : 'Vắng mặt', tone: 'danger', icon: 'close-circle-outline' };
  if (attendance === 'UNMARKED') return { label: 'Chưa điểm danh', tone: 'warning', icon: 'alert-circle-outline' };
  if (alighted) return { label: 'Đã xuống xe', tone: 'success', icon: 'checkmark-circle-outline' };
  if (schoolArrived || direction === 'TO_PARKING') return { label: 'Chưa xuống xe', tone: 'purple', icon: 'log-out-outline' };
  return { label: 'Đã điểm danh', tone: 'info', icon: 'checkmark-circle-outline' };
}

/** PO-approved illustration: these fractions represent workflow stages, never GPS or distance. */
export function journeyStagePosition(status: ParentHomeCardItem['tripStatus'], direction: ParentHomeCardItem['direction'],
  attendance: ParentHomeCardItem['attendanceStatus'], alighted: boolean, schoolArrived: boolean, boardingFrame = false) {
  if (status === 'CANCELLED' || attendance === 'ABSENT') return null;
  if ((attendance === 'PRESENT' && alighted) || (direction === 'TO_SCHOOL' && schoolArrived)) return 1;
  if (status === 'SCHEDULED') return 0;
  if (status === 'COMPLETED') return null; // No invented child-arrival milestone.
  if (direction === 'TO_PARKING') {
    // Keep a visible origin fallback until this child's boarding is confirmed.
    return attendance === 'PRESENT' ? 2 / 3 : 0;
  }
  if (attendance === 'UNMARKED') return 1 / 3; // 2/3 of the departure → pickup leg.
  return boardingFrame ? 1 / 2 : 5 / 6; // Pickup, then 2/3 of the pickup → school leg.
}

export function journeySchoolArrived(operation?: OperationalStateResponse, tripId?: string) {
  if (tripId && operation?.tripId !== tripId) return false;
  return Boolean(operation?.isSchoolArrived || (operation?.arrivedAtSchoolAt && Number.isFinite(Date.parse(operation.arrivedAtSchoolAt))));
}

export function activeJourneyIncident(status: TripIncidentStatus) {
  return status === 'WAITING_ASSIGNMENT' || status === 'WAITING_CONFIRMATION';
}

export function journeyIncidentLabel(type: TripIncident['type']) {
  switch (type) {
    case 'ATTENDANT_MISSING': return 'Thiếu giáo viên phụ xe';
    case 'DRIVER_MISSING': return 'Thiếu tài xế';
    case 'OFF_ROUTE': return 'Xe lệch tuyến';
    case 'LATE_STOP': return 'Chuyến có điểm dừng trễ';
  }
}

export function journeyServiceDate(value: string) {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
}

export function scheduledJourneyInstant(serviceDate: string, clock?: string | null) {
  const time = journeyClock(clock);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate) || !time) return null;
  const date = new Date(`${serviceDate}T${time}:00+07:00`);
  return Number.isFinite(date.getTime()) && new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10) === serviceDate ? date.getTime() : null;
}

export function journeyMinutesBeforeSchedule(serviceDate: string, clock: string | null, actual?: string | null) {
  const planned = scheduledJourneyInstant(serviceDate, clock), arrived = Date.parse(actual ?? '');
  return planned !== null && Number.isFinite(arrived) ? Math.round((planned - arrived) / 60000) : null;
}

export function journeyScheduleCountdown(serviceDate: string, clock: string | null, now: number) {
  const planned = scheduledJourneyInstant(serviceDate, clock);
  if (planned === null || !Number.isFinite(now) || planned <= now) return null;
  return Math.ceil((planned - now) / 60000);
}
