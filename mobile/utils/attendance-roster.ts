import type { MobileTripDetailStop, TripAttendanceStudentItem } from '../services/api-client';

export function attendanceRosterGroups(
  students: readonly TripAttendanceStudentItem[],
  stops: readonly MobileTripDetailStop[],
  phase: 'boarding' | 'alighting',
  targetStopId: string | null | undefined,
) {
  const ordered = [...students].sort((a, b) => a.stopOrder - b.stopOrder);
  const applicable = phase === 'boarding' ? ordered : ordered.filter(student => student.status === 'PRESENT');
  const isPending = (student: TripAttendanceStudentItem) => phase === 'boarding'
    ? student.status === 'UNMARKED' : !student.isAlighted && !student.alightedAt;
  const pending = applicable.filter(isPending);
  const completed = applicable.filter(student => !isPending(student));
  const targetIndex = targetStopId ? stops.findIndex(stop => stop.id === targetStopId) : -1;
  const pendingById = new Map(pending.map(student => [student.studentId, student]));
  const ahead = targetIndex >= 0
    ? stops.slice(targetIndex).map(stop => stop.studentId ? pendingById.get(stop.studentId) : undefined).find(Boolean)
    : undefined;
  const next = ahead ?? pending[0];
  return { next, fromNavigation: !!ahead, pending: pending.filter(student => student.studentId !== next?.studentId), completed };
}
