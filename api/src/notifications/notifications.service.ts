import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role, type User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { actionableIncidentWhere, adminSchoolScope } from '../overview/operations-policy.js';
import { NotificationTargetsService } from './notification-targets.service.js';
import type { NotificationsQueryDto, NotificationListDto, NotificationSummaryDto } from './notifications.dto.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService, private readonly targets: NotificationTargetsService) {}
  async summary(user: User): Promise<NotificationSummaryDto> {
    const admin = user.role === Role.SYSTEM_ADMIN || user.role === Role.SCHOOL_ADMIN;
    const incidentWhere: Prisma.TripIncidentWhereInput | null = admin ? actionableIncidentWhere(user.role, adminSchoolScope(user)) : user.role === Role.BUS_ATTENDANT ? {
      status: 'WAITING_CONFIRMATION', type: { in: ['OFF_ROUTE', 'LATE_STOP'] }, trip: { status: 'IN_PROGRESS', assignedBusAttendantId: user.id },
    } : null;
    const [unreadCount, actionableIncidentCount] = await Promise.all([
      this.prisma.notification.count({ where: { userId: user.id, readAt: null } }),
      incidentWhere ? this.prisma.tripIncident.count({ where: incidentWhere }) : Promise.resolve(0),
    ]);
    return { unreadCount, actionableIncidentCount };
  }
  async list(user: User, query: NotificationsQueryDto): Promise<NotificationListDto> {
    const limit = Math.min(50, query.limit ?? 20);
    const where: Prisma.NotificationWhereInput = { userId: user.id, ...(query.filter === 'UNREAD' ? { readAt: null } : {}) };
    const cursor = query.cursor ? await this.prisma.notification.findFirst({ where: { id: query.cursor, userId: user.id }, select: { createdAt: true, id: true } }) : null;
    if (query.cursor && !cursor) throw new NotFoundException('Không tìm thấy thông báo');
    if (query.filter === 'ACTIONABLE') {
      if (![Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN, Role.BUS_ATTENDANT].includes(user.role as 'SYSTEM_ADMIN' | 'SCHOOL_ADMIN' | 'BUS_ATTENDANT')) return { items: [], hasMore: false, nextCursor: null };
      const admin = user.role !== Role.BUS_ATTENDANT;
      const schoolId = admin ? adminSchoolScope(user) : undefined;
      const condition = admin ? Prisma.sql`i.status = 'WAITING_ASSIGNMENT' AND t.status = 'SCHEDULED' AND t.actual_start_time IS NULL AND i.type::text = ${user.role === Role.SYSTEM_ADMIN ? 'DRIVER_MISSING' : 'ATTENDANT_MISSING'} ${schoolId ? Prisma.sql`AND t.school_id = ${schoolId}` : Prisma.empty}`
        : Prisma.sql`i.status = 'WAITING_CONFIRMATION' AND t.status = 'IN_PROGRESS' AND t.assigned_bus_attendant_id = ${user.id} AND i.type IN ('OFF_ROUTE', 'LATE_STOP')`;
      const ids = await this.prisma.$queryRaw<{ id: string }[]>`SELECT n.id FROM notifications n WHERE n.user_id = ${user.id} AND n.target_type = 'INCIDENT'
        ${cursor ? Prisma.sql`AND (n.created_at, n.id) < (${cursor.createdAt}, ${cursor.id})` : Prisma.empty}
        AND EXISTS (SELECT 1 FROM trip_incidents i JOIN trips t ON t.id = i.trip_id WHERE i.id = n.target_id AND ${condition})
        ORDER BY n.created_at DESC, n.id DESC LIMIT ${limit + 1}`;
      where.id = { in: ids.map(row => row.id) };
    }
    if (cursor && query.filter !== 'ACTIONABLE') where.OR = [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }];
    const rows = await this.prisma.notification.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit + 1 });
    const visible = rows.slice(0, limit);
    const items = await Promise.all(visible.map(async row => {
      const target = await this.targets.resolve(user, row);
      return { id: row.id, type: row.type, title: target.available ? row.title : 'Nội dung không còn khả dụng', body: target.available ? row.body : '', createdAt: row.createdAt.toISOString(), readAt: row.readAt?.toISOString() ?? null, available: target.available };
    }));
    return { items, hasMore: rows.length > limit, nextCursor: rows.length > limit ? visible.at(-1)?.id ?? null : null };
  }
  async target(user: User, id: string) {
    const row = await this.prisma.notification.findFirst({ where: { id, userId: user.id } });
    if (!row) throw new NotFoundException('Không tìm thấy thông báo');
    return this.targets.resolve(user, row);
  }
  async read(user: User, id?: string) {
    if (id && !await this.prisma.notification.findFirst({ where: { id, userId: user.id }, select: { id: true } })) throw new NotFoundException('Không tìm thấy thông báo');
    await this.prisma.notification.updateMany({ where: { userId: user.id, ...(id ? { id } : { createdAt: { lte: new Date() } }), readAt: null }, data: { readAt: new Date() } });
    return { success: true };
  }
  async register(user: User, sessionId: string, token: string | null) {
    await this.prisma.$transaction(async tx => {
      if (token) await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${token}))`;
      // Revocation/logout of this Session races safely with registration; it never revives a Session.
      await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${sessionId} FOR UPDATE`;
      const session = await tx.session.findUnique({ where: { id: sessionId } });
      if (!session || session.userId !== user.id || session.revokedAt || session.expiresAt <= new Date()) throw new NotFoundException('Phiên không còn hiệu lực');
      if (token) await tx.session.updateMany({ where: { pushToken: token, id: { not: sessionId } }, data: { pushToken: null } });
      await tx.session.update({ where: { id: sessionId }, data: { pushToken: token } });
    });
    return { success: true };
  }
}
