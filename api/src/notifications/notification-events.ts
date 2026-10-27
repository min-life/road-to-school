import { Role, type Prisma } from '@prisma/client';
import { adminRecipients, writeNotification } from './notification-writer.js';
import { effectiveMembership } from '../overview/operations-policy.js';

export async function notifyIncident(db: Prisma.TransactionClient, id: string, actorId?: string): Promise<void> {
  const incident = await db.tripIncident.findUnique({ where: { id }, include: { trip: { select: { schoolId: true, assignedBusAttendantId: true } } } });
  if (!incident) return;
  const pending = incident.status === 'WAITING_ASSIGNMENT';
  const auto = incident.status === 'WAITING_CONFIRMATION';
  if (!pending && !auto && incident.status !== 'RESOLVED') return;
  const userIds = pending ? await adminRecipients(db, incident.type === 'DRIVER_MISSING' ? Role.SYSTEM_ADMIN : Role.SCHOOL_ADMIN, incident.type === 'ATTENDANT_MISSING' ? incident.trip.schoolId : undefined)
    : auto ? [incident.trip.assignedBusAttendantId] : incident.reportedById ? [incident.reportedById] : [];
  const title = auto ? 'Chuyến có sự cố cần xác nhận' : pending ? incident.type === 'DRIVER_MISSING' ? 'Tài xế chưa đến' : 'Giáo viên chưa đến' : 'Sự cố nhân sự đã được xử lý';
  await writeNotification(db, { eventKey: `incident:${id}:${incident.status}`, type: 'INCIDENT', title, body: auto ? incident.type === 'OFF_ROUTE' ? 'Lệch tuyến · Mở chuyến để xác nhận.' : 'Đón trả chậm · Mở chuyến để xác nhận.' : 'Mở sự cố để xem thông tin và kết quả xử lý.',
    targetType: 'INCIDENT', targetId: id, userIds, actorId, push: auto || !pending,
    context: { tripId: incident.tripId, schoolId: incident.trip.schoolId, pendingAction: pending || auto } });
}

export async function notifyLeave(db: Prisma.TransactionClient, id: string, actorId?: string): Promise<void> {
  const notice = await db.leaveNotice.findUnique({ where: { id }, include: { trip: { select: { schoolId: true, serviceDate: true } }, student: { select: { parentLinks: { select: { parentId: true } } } } } });
  if (!notice) return;
  const pending = notice.status === 'PENDING_REPLACEMENT';
  if (notice.status === 'TRIP_CANCELLED') return; // The cancellation notification already covers this change.
  const userIds = notice.kind === 'STUDENT' ? notice.student?.parentLinks.map(link => link.parentId) ?? [] : pending
    ? await adminRecipients(db, notice.kind === 'DRIVER' ? Role.SYSTEM_ADMIN : Role.SCHOOL_ADMIN, notice.kind === 'BUS_ATTENDANT' ? notice.trip.schoolId : undefined)
    : [notice.reportedById];
  const title = pending ? 'Có báo nghỉ cần bố trí thay thế' : notice.status === 'REPLACED' ? 'Báo nghỉ đã được bố trí thay thế' : notice.status === 'WITHDRAWN' ? 'Báo nghỉ đã hủy' : 'Báo nghỉ đã được ghi nhận';
  await writeNotification(db, { eventKey: `leave:${id}:${notice.status}`, type: 'LEAVE', title, body: `Ngày ${notice.trip.serviceDate.toISOString().slice(0, 10)}`,
    targetType: 'LEAVE', targetId: id, userIds, actorId, push: notice.status === 'REPLACED', context: { tripId: notice.tripId, schoolId: notice.trip.schoolId, kind: notice.kind } });
}

export async function notifyRequest(db: Prisma.TransactionClient, id: string, actorId?: string): Promise<void> {
  const request = await db.studentUpdateRequest.findUnique({ where: { id }, include: { student: { select: { parentLinks: { select: { parentId: true } }, routeStops: { where: effectiveMembership, select: { id: true }, take: 1 } } } } });
  if (!request || request.status === 'CANCELLED') return;
  const pending = request.status === 'PENDING';
  const recipients = pending ? request.type === 'INFORMATION_UPDATE' ? await adminRecipients(db, Role.SCHOOL_ADMIN, request.schoolId)
    : [...await adminRecipients(db, Role.SYSTEM_ADMIN), ...(request.student.routeStops.length ? [] : await adminRecipients(db, Role.SCHOOL_ADMIN, request.schoolId))]
    : [request.parentId]; // Other linked Parents do not gain creator-only request access.
  const resolution = request.resolution;
  const outcome = resolution && typeof resolution === 'object' && !Array.isArray(resolution) ? resolution.outcome : null;
  const title = pending ? 'Có yêu cầu cập nhật học sinh' : request.status === 'REJECTED' ? 'Yêu cầu cập nhật bị từ chối' : outcome === 'REMOVED_FROM_ROUTES' ? 'Đã cập nhật địa chỉ · Cần phân tuyến lại' : outcome === 'REOPTIMIZED' ? 'Đã cập nhật địa chỉ và tuyến' : 'Yêu cầu cập nhật đã được xử lý';
  await writeNotification(db, { eventKey: `request:${id}:${request.status}`, type: 'REQUEST', title, body: 'Mở yêu cầu để xem kết quả mới nhất.', targetType: 'REQUEST', targetId: id,
    userIds: recipients, actorId, push: !pending, context: { schoolId: request.schoolId, studentId: request.studentId } });
}

export async function notifyPlan(db: Prisma.TransactionClient, id: string, actorId?: string): Promise<void> {
  const plan = await db.routePlan.findUnique({ where: { id }, select: { schoolId: true, status: true, name: true, createdById: true } });
  if (!plan) return;
  const users = plan.status === 'DRAFT' ? await adminRecipients(db, Role.SCHOOL_ADMIN, plan.schoolId)
    : [...await adminRecipients(db, Role.SYSTEM_ADMIN), ...await adminRecipients(db, Role.SCHOOL_ADMIN, plan.schoolId)];
  await writeNotification(db, { eventKey: `plan:${id}:${plan.status}`, type: 'PLAN', title: plan.status === 'DRAFT' ? 'Phương án tuyến mới cần duyệt' : plan.status === 'ACTIVE' ? 'Phương án tuyến đã được duyệt' : plan.status === 'EXPIRED' ? 'Phương án tuyến đã hết hạn' : 'Phương án tuyến đã hủy',
    body: plan.name, targetType: 'PLAN', targetId: id, userIds: users, actorId, context: { schoolId: plan.schoolId } });
}
