import { describe, it, expect, vi } from 'vitest';
import { Role, type Prisma } from '@prisma/client';
import { notifyIncident, notifyRequest } from './notification-events.js';
import { notifyCancelledTrips } from './notification-writer.js';

const transaction = (extra: Record<string, unknown>) => ({
  user: { findMany: vi.fn().mockImplementation(async ({ where }) => where.role ? [{ id: 'admin' }] : where.id.in.map((id: string) => ({ id, role: Role.PARENT }))) },
  notification: { createMany: vi.fn().mockResolvedValue({ count: 1 }) }, ...extra,
});
describe('business event recipients and durable inbox payloads; in-memory only', () => {
  it('routes missing attendants to the school admin, excluding the reporter and internal reasons', async () => {
    const db = transaction({ tripIncident: { findUnique: vi.fn().mockResolvedValue({ id: 'i', type: 'ATTENDANT_MISSING', status: 'WAITING_ASSIGNMENT', reportedById: 'driver', tripId: 't', reason: 'private', trip: { schoolId: 's', assignedBusAttendantId: 'teacher' } }) } });
    await notifyIncident(db as unknown as Prisma.TransactionClient, 'i', 'driver');
    expect(db.user.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({ where: { role: Role.SCHOOL_ADMIN, isActive: true, schoolId: 's' } }));
    const payload = db.notification.createMany.mock.calls[0][0];
    expect(payload.skipDuplicates).toBe(true);
    expect(payload.data[0]).toMatchObject({ userId: 'admin', eventKey: 'incident:i:WAITING_ASSIGNMENT', targetType: 'INCIDENT' });
    expect(JSON.stringify(payload)).not.toContain('private');
  });
  it('groups multiple cancelled Trips per recipient/day, and filters actual CANCELLED rows', async () => {
    const trip = { schoolId: 's', serviceDate: new Date('2026-10-27'), assignedDriverId: 'd', assignedBusAttendantId: 'a', attendances: [{ student: { parentLinks: [{ parentId: 'p' }, { parentId: 'p' }] } }] };
    const findMany = vi.fn().mockResolvedValue([{ ...trip, id: 'one' }, { ...trip, id: 'two' }]);
    const db = transaction({ trip: { findMany } });
    await notifyCancelledTrips(db as unknown as Prisma.TransactionClient, ['one', 'two'], 'cancel-event');
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ['one', 'two'] }, status: 'CANCELLED' } }));
    const rows = db.notification.createMany.mock.calls.flatMap(call => call[0].data);
    expect(rows).toHaveLength(4);
    expect(rows.every(row => row.targetType === 'SCHEDULE' && row.targetId === '2026-10-27')).toBe(true);
    expect(rows.filter(row => row.userId === 'p')).toHaveLength(1);
  });
  it('sends request outcomes only to the creator and distinguishes removal from rerouting', async () => {
    const db = transaction({ studentUpdateRequest: { findUnique: vi.fn().mockResolvedValue({ parentId: 'creator', schoolId: 's', studentId: 'child', status: 'APPROVED', resolution: { outcome: 'REMOVED_FROM_ROUTES' }, student: { parentLinks: [{ parentId: 'other-parent' }], routeStops: [] } }) } });
    await notifyRequest(db as unknown as Prisma.TransactionClient, 'request', 'admin');
    const rows = db.notification.createMany.mock.calls[0][0].data;
    expect(rows.map((row: { userId: string }) => row.userId)).toEqual(['creator']);
    expect(rows[0].title).toContain('Cần phân tuyến lại');
    expect(rows[0].targetType).toBe('REQUEST');
  });
});
