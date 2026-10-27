import { Prisma, Role } from '@prisma/client';

export type NotificationTarget = 'TRIP' | 'INCIDENT' | 'LEAVE' | 'REQUEST' | 'PLAN' | 'SCHEDULE';
export interface NotificationEvent {
  eventKey: string; type: string; title: string; body: string; targetType: NotificationTarget; targetId: string;
  userIds: string[]; actorId?: string; push?: boolean; context?: Prisma.InputJsonObject;
}

/** Called with the business transaction client: the inbox and delivery intent commit together. */
export async function writeNotification(db: Prisma.TransactionClient, event: NotificationEvent): Promise<void> {
  const ids = [...new Set(event.userIds)].filter(id => id && id !== event.actorId);
  if (!ids.length) return;
  const users = await db.user.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true, role: true } });
  for (let offset = 0; offset < users.length; offset += 500) {
    await db.notification.createMany({ skipDuplicates: true, data: users.slice(offset, offset + 500).map(user => ({
      userId: user.id, eventKey: event.eventKey, type: event.type, title: event.title, body: event.body,
      targetType: event.targetType, targetId: event.targetId, context: event.context,
      pushState: event.push && [Role.DRIVER, Role.BUS_ATTENDANT, Role.PARENT].includes(user.role as 'DRIVER' | 'BUS_ATTENDANT' | 'PARENT') ? 'PENDING' : 'NONE',
      pushAfterAt: event.push ? new Date() : null,
    })) });
  }
}

export async function adminRecipients(db: Prisma.TransactionClient, role: Role, schoolId?: string): Promise<string[]> {
  const users = await db.user.findMany({ where: { role, isActive: true, ...(schoolId ? { schoolId } : {}) }, select: { id: true } });
  return users.map(user => user.id);
}

const tripAudience = {
  id: true, schoolId: true, serviceDate: true, assignedDriverId: true, assignedBusAttendantId: true,
  route: { select: { name: true } },
  attendances: { where: { excludedAt: null }, select: { studentId: true, status: true, student: { select: { parentLinks: { select: { parentId: true } } } } } },
} satisfies Prisma.TripSelect;

export async function notifyTrip(db: Prisma.TransactionClient, tripId: string, type: string, actorId?: string, studentId?: string, transitionKey?: string): Promise<void> {
  const trip = await db.trip.findUnique({ where: { id: tripId }, select: tripAudience });
  if (!trip) return;
  const titles: Record<string, string> = {
    READY: 'Giáo viên đã sẵn sàng', STARTED: 'Chuyến xe đã bắt đầu', ARRIVED: 'Xe đã đến trường',
    COMPLETED: 'Chuyến xe đã hoàn thành', BOARDING: 'Con đã lên xe', ALIGHTING: 'Con đã xuống xe',
    ATTENDANCE_CHANGED: 'Trạng thái điểm danh đã thay đổi',
  };
  const parents = trip.attendances.filter(attendance => (!studentId || attendance.studentId === studentId) && (type !== 'STARTED' || attendance.status !== 'ABSENT'))
    .flatMap(attendance => attendance.student.parentLinks.map(link => link.parentId));
  const userIds = type === 'READY' ? [trip.assignedDriverId] : studentId ? parents : [...parents, trip.assignedBusAttendantId];
  await writeNotification(db, { eventKey: `trip:${tripId}:${type}:${studentId ?? ''}:${transitionKey ?? ''}`, type: `TRIP_${type}`,
    title: titles[type] ?? 'Chuyến xe đã cập nhật', body: `${trip.route.name} · ${trip.serviceDate.toISOString().slice(0, 10)}`,
    targetType: 'TRIP', targetId: tripId, userIds, actorId, push: ['READY', 'STARTED', 'ALIGHTING'].includes(type), context: { tripId, schoolId: trip.schoolId, ...(studentId ? { studentId } : {}) } });
}

export async function notifyAssignment(db: Prisma.TransactionClient, tripId: string, oldUserId: string, newUserId: string, eventKey: string, actorId?: string): Promise<void> {
  if (oldUserId === newUserId) return;
  await writeNotification(db, { eventKey: `${eventKey}:assigned`, type: 'ASSIGNMENT', title: 'Bạn được phân công chuyến xe', body: 'Mở chuyến xe để xem lịch và thông tin phân công.', targetType: 'TRIP', targetId: tripId, userIds: [newUserId], actorId, push: true, context: { tripId } });
  await writeNotification(db, { eventKey: `${eventKey}:removed`, type: 'ASSIGNMENT_REMOVED', title: 'Phân công chuyến xe đã thay đổi', body: 'Xem lại lịch cá nhân của bạn.', targetType: 'SCHEDULE', targetId: 'current', userIds: [oldUserId], actorId, push: true });
}

/** Groups bulk cancellations by recipient and service date, rather than one push for every Trip. */
export async function notifyCancelledTrips(db: Prisma.TransactionClient, tripIds: string[], eventKey: string, actorId?: string): Promise<void> {
  const groups = new Map<string, { userId: string; day: string; ids: string[] }>();
  let systemAdmins: string[] | undefined;
  const schoolAdmins = new Map<string, string[]>();
  for (let offset = 0; offset < tripIds.length; offset += 200) {
    const trips = await db.trip.findMany({ where: { id: { in: tripIds.slice(offset, offset + 200) }, status: 'CANCELLED' }, select: tripAudience });
    for (const trip of trips) {
      systemAdmins ??= await adminRecipients(db, Role.SYSTEM_ADMIN);
      if (!schoolAdmins.has(trip.schoolId)) schoolAdmins.set(trip.schoolId, await adminRecipients(db, Role.SCHOOL_ADMIN, trip.schoolId));
      const day = trip.serviceDate.toISOString().slice(0, 10);
      const users = new Set([...systemAdmins, ...schoolAdmins.get(trip.schoolId)!, trip.assignedDriverId, trip.assignedBusAttendantId, ...trip.attendances.flatMap(att => att.student.parentLinks.map(link => link.parentId))]);
      for (const userId of users) {
        const key = `${userId}:${day}`, group = groups.get(key) ?? { userId, day, ids: [] };
        group.ids.push(trip.id); groups.set(key, group);
      }
    }
  }
  for (const group of groups.values()) await writeNotification(db, {
    eventKey: `${eventKey}:cancelled:${group.day}`, type: 'TRIP_CANCELLED', title: group.ids.length === 1 ? 'Chuyến xe đã hủy' : `${group.ids.length} chuyến xe đã hủy`,
    body: `Ngày ${group.day} · Xem lại lịch chuyến xe.`, targetType: group.ids.length === 1 ? 'TRIP' : 'SCHEDULE', targetId: group.ids.length === 1 ? group.ids[0] : group.day,
    userIds: [group.userId], actorId, push: true, context: { serviceDate: group.day },
  });
}
