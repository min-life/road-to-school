import { Injectable } from '@nestjs/common';
import { Role, type Notification, type User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

export interface ResolvedNotificationTarget { available: boolean; webPath: string | null; mobilePath: string | null }
const unavailable: ResolvedNotificationTarget = { available: false, webPath: null, mobilePath: null };
@Injectable()
export class NotificationTargetsService {
  constructor(private readonly prisma: PrismaService) {}
  private async tripAccess(user: User, tripId: string): Promise<boolean> {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId }, select: { schoolId: true, assignedDriverId: true, assignedBusAttendantId: true } });
    if (!trip) return false;
    if (user.role === Role.SYSTEM_ADMIN) return true;
    if (user.role === Role.SCHOOL_ADMIN) return !!user.schoolId && trip.schoolId === user.schoolId;
    if (user.role === Role.DRIVER) return trip.assignedDriverId === user.id;
    if (user.role === Role.BUS_ATTENDANT) return trip.assignedBusAttendantId === user.id;
    return !!await this.prisma.tripAttendance.findFirst({ where: { tripId, excludedAt: null, student: { parentLinks: { some: { parentId: user.id } } } }, select: { id: true } });
  }
  async resolve(user: User, note: Pick<Notification, 'targetType' | 'targetId' | 'type' | 'context'>): Promise<ResolvedNotificationTarget> {
    const id = encodeURIComponent(note.targetId);
    if (note.targetType === 'SCHEDULE') return { available: true, webPath: `/admin/trips${/^\d{4}-\d{2}-\d{2}$/.test(note.targetId) ? `?fromDate=${id}&toDate=${id}` : ''}`, mobilePath: user.role === Role.PARENT ? '/(tabs)/tracking' : `/(tabs)/schedule${/^\d{4}-\d{2}-\d{2}$/.test(note.targetId) ? `?serviceDate=${id}` : ''}` };
    if (note.targetType === 'TRIP') {
      const studentId = note.context && typeof note.context === 'object' && !Array.isArray(note.context) && typeof note.context.studentId === 'string' ? note.context.studentId : undefined;
      if (user.role === Role.PARENT && studentId && !await this.prisma.tripAttendance.findFirst({ where: { tripId: note.targetId, studentId, excludedAt: null, student: { parentLinks: { some: { parentId: user.id } } } }, select: { id: true } })) return unavailable;
      return await this.tripAccess(user, note.targetId) ? { available: true, webPath: `/admin/trips/${id}`, mobilePath: `/trip/${id}` } : unavailable;
    }
    if (note.targetType === 'INCIDENT') {
      const incident = await this.prisma.tripIncident.findUnique({ where: { id: note.targetId }, select: { tripId: true, reportedById: true, processedById: true, status: true } });
      if (!incident) return unavailable;
      if (await this.tripAccess(user, incident.tripId)) return { available: true, webPath: `/admin/incidents?incidentId=${id}`, mobilePath: `/trip/${incident.tripId}?incidentId=${id}` };
      if (incident.reportedById === user.id || (incident.processedById === user.id && incident.status === 'CONFIRMED')) return { available: true, webPath: null, mobilePath: `/incidents/${id}` };
      return unavailable;
    }
    if (note.targetType === 'LEAVE') {
      const leave = await this.prisma.leaveNotice.findUnique({ where: { id: note.targetId }, select: { tripId: true, reportedById: true, studentId: true, kind: true } });
      if (!leave) return unavailable;
      if (user.role === Role.PARENT) {
        if (!leave.studentId || !await this.prisma.parentStudentLink.findUnique({ where: { parentId_studentId: { parentId: user.id, studentId: leave.studentId } }, select: { id: true } })) return unavailable;
      } else if (leave.reportedById !== user.id && !await this.tripAccess(user, leave.tripId)) return unavailable;
      return { available: true, webPath: `/admin/leave-notices?noticeId=${id}&kind=${leave.kind}`, mobilePath: `/leave-notices/${id}` };
    }
    if (note.targetType === 'REQUEST') {
      const request = await this.prisma.studentUpdateRequest.findUnique({ where: { id: note.targetId }, select: { schoolId: true, parentId: true, studentId: true, type: true } });
      if (!request) return unavailable;
      const allowed = user.role === Role.SYSTEM_ADMIN ? request.type === 'ADDRESS_UPDATE' : user.role === Role.SCHOOL_ADMIN ? !!user.schoolId && request.schoolId === user.schoolId : user.role === Role.PARENT && request.parentId === user.id;
      if (user.role === Role.PARENT && !await this.prisma.parentStudentLink.findUnique({ where: { parentId_studentId: { parentId: user.id, studentId: request.studentId } }, select: { id: true } })) return unavailable;
      return allowed ? { available: true, webPath: `/admin/requests?requestId=${id}`, mobilePath: `/parent/update-requests/detail/${id}` } : unavailable;
    }
    if (note.targetType === 'PLAN') {
      const plan = await this.prisma.routePlan.findUnique({ where: { id: note.targetId }, select: { schoolId: true } });
      return plan && (user.role === Role.SYSTEM_ADMIN || (user.role === Role.SCHOOL_ADMIN && !!user.schoolId && plan.schoolId === user.schoolId)) ? { available: true, webPath: `/admin/routes/plans/${id}`, mobilePath: null } : unavailable;
    }
    return unavailable;
  }
}
