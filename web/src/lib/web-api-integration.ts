import type { Role, TripDetail, TripAttendanceRoster, TripIncident } from './types';

export function canCloseIncident(incident: TripIncident, role?: Role, schoolId?: string | null) {
  return (role === 'SYSTEM_ADMIN' || (role === 'SCHOOL_ADMIN' && schoolId === incident.schoolId))
    && ['NO_GUARDIAN_AT_STOP', 'TRAFFIC_DELAY', 'GPS_SIGNAL_LOST'].includes(incident.type)
    && ['WAITING_ASSIGNMENT', 'WAITING_CONFIRMATION'].includes(incident.status);
}
export function canCancelAllAbsent(trip: TripDetail, roster: TripAttendanceRoster | null, role?: Role, schoolId?: string | null) {
  return (role === 'SYSTEM_ADMIN' || (role === 'SCHOOL_ADMIN' && schoolId === trip.schoolId))
    && trip.direction === 'TO_PARKING' && trip.status === 'SCHEDULED'
    && trip.actualStartTime === null && !!trip.attendantReadyAt
    && roster?.tripId === trip.id && roster.students.length > 0
    && roster.students.every(student => student.status === 'ABSENT' && !!student.absenceReason?.trim() && !student.isAlighted && !student.alightedAt);
}
export function canReopenTrip(trip: TripDetail, roster: TripAttendanceRoster | null, role?: Role, now = Date.now()) {
  return role === 'SYSTEM_ADMIN' && trip.status === 'CANCELLED'
    && trip.actualStartTime === null && trip.actualEndTime === null
    && Number.isFinite(Date.parse(trip.scheduledStartAt)) && now < Date.parse(trip.scheduledStartAt)
    && roster?.tripId === trip.id
    && !roster.students.some(student => student.status === 'PRESENT' || student.isAlighted || !!student.alightedAt);
}
export interface OperationAuditItem {
  action: string; reason?: string; actorId?: string; occurredAt?: string; studentId?: string;
}
export function operationAuditItems(value: unknown): OperationAuditItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (!item || typeof item !== 'object' || typeof item.action !== 'string') return [];
    const text = (key: string) => typeof item[key] === 'string' ? item[key] as string : undefined;
    return [{ action: item.action, reason: text('reason'), actorId: text('actorId'), occurredAt: text('occurredAt'), studentId: text('studentId') }];
  });
}

export function overviewTaskHref(task: { kind: string; href: string }): string {
  if (task.kind !== 'ADMIN_FINALIZATION') return task.href;
  const query = new URLSearchParams(task.href.split('?')[1] || '');
  query.set('tab', 'finalizations');
  return '/admin/trips?' + query.toString();
}

export function selectVisibleStudents(previous: Set<string>, visibleIds: string[], selected: boolean) {
  const next = new Set(previous);
  for (const id of visibleIds) {
    if (selected) next.add(id);
    else next.delete(id);
  }
  return next;
}
