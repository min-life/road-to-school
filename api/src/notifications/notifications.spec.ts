import { describe, it, expect, vi } from 'vitest';
import { Role, type Prisma, type User } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service.js';
import { writeNotification } from './notification-writer.js';
import { NotificationTargetsService } from './notification-targets.service.js';
import { NotificationsService } from './notifications.service.js';
import { PushDeliveryService } from './push-delivery.service.js';
import { canSendPush, parseDelivery, tokenHash } from './push-policy.js';
import { ConfigService } from '@nestjs/config';

const actor = (role: Role, schoolId: string | null = null) => ({ id: 'reader', role, schoolId }) as User;
const db = (value: object) => value as PrismaService;

describe('notification ownership, durable intent and privacy (in-memory only)', () => {
  it('writes deduplicated per-recipient intent with the supplied transaction and excludes the actor', async () => {
    const tx = { user: { findMany: vi.fn().mockResolvedValue([{ id: 'other', role: Role.PARENT }]) }, notification: { createMany: vi.fn().mockResolvedValue({ count: 1 }) } };
    await writeNotification(tx as unknown as Prisma.TransactionClient, { eventKey: 'event:transition', type: 'TRIP_STARTED', title: 'Chuyến xe đã bắt đầu', body: '', targetType: 'TRIP', targetId: 'trip', userIds: ['reader', 'other', 'other'], actorId: 'reader', push: true });
    expect(tx.user.findMany).toHaveBeenCalledWith({ where: { id: { in: ['other'] }, isActive: true }, select: { id: true, role: true } });
    expect(tx.notification.createMany).toHaveBeenCalledWith({ skipDuplicates: true, data: [expect.objectContaining({ userId: 'other', eventKey: 'event:transition', pushState: 'PENDING' })] });
  });
  it('does not query or create a self-notification', async () => {
    const tx = { user: { findMany: vi.fn() } };
    await writeNotification(tx as unknown as Prisma.TransactionClient, { eventKey: 'event', type: 'READY', title: '', body: '', targetType: 'TRIP', targetId: 'trip', userIds: ['reader'], actorId: 'reader' });
    expect(tx.user.findMany).not.toHaveBeenCalled();
  });
  it('mark-all-read is owner-only and does not resolve an incident or mark future notifications', async () => {
    const client = db({ notification: { updateMany: vi.fn().mockResolvedValue({ count: 3 }) }, tripIncident: { updateMany: vi.fn() } });
    const service = new NotificationsService(client, {} as NotificationTargetsService);
    await service.read(actor(Role.SYSTEM_ADMIN));
    expect(client.notification.updateMany).toHaveBeenCalledWith({ where: { userId: 'reader', readAt: null, createdAt: { lte: expect.any(Date) } }, data: { readAt: expect.any(Date) } });
    expect(client.tripIncident.updateMany).not.toHaveBeenCalled();
  });
  it('keeps the red business count independent of read state and scopes the School Admin', async () => {
    const client = db({ notification: { count: vi.fn().mockResolvedValue(0) }, tripIncident: { count: vi.fn().mockResolvedValue(2) } });
    const service = new NotificationsService(client, {} as NotificationTargetsService);
    expect(await service.summary(actor(Role.SCHOOL_ADMIN, 'school'))).toEqual({ unreadCount: 0, actionableIncidentCount: 2 });
    expect(client.tripIncident.count).toHaveBeenCalledWith({ where: { type: 'ATTENDANT_MISSING', status: 'WAITING_ASSIGNMENT', trip: { schoolId: 'school', status: 'SCHEDULED', actualStartTime: null } } });
  });
  it('rejects another recipient notification ID without resolving its target', async () => {
    const client = db({ notification: { findFirst: vi.fn().mockResolvedValue(null) } });
    const targets = { resolve: vi.fn() };
    await expect(new NotificationsService(client, targets as unknown as NotificationTargetsService).target(actor(Role.PARENT), 'foreign')).rejects.toThrow('Không tìm thấy');
    expect(targets.resolve).not.toHaveBeenCalled();
    expect(client.notification.findFirst).toHaveBeenCalledWith({ where: { id: 'foreign', userId: 'reader' } });
  });
  it('does not let Parent retain request details after losing their child link', async () => {
    const client = db({ studentUpdateRequest: { findUnique: vi.fn().mockResolvedValue({ schoolId: 'school', parentId: 'reader', studentId: 'child', type: 'ADDRESS_UPDATE' }) }, parentStudentLink: { findUnique: vi.fn().mockResolvedValue(null) } });
    expect(await new NotificationTargetsService(client).resolve(actor(Role.PARENT), { type: 'REQUEST', targetType: 'REQUEST', targetId: 'request', context: null })).toEqual({ available: false, webPath: null, mobilePath: null });
  });
  it('blocks an old Driver from a Trip target but allows their own minimal incident history', async () => {
    const client = db({ trip: { findUnique: vi.fn().mockResolvedValue({ schoolId: 'school', assignedDriverId: 'replacement', assignedBusAttendantId: 'attendant' }) }, tripIncident: { findUnique: vi.fn().mockResolvedValue({ tripId: 'trip', reportedById: 'reader', processedById: null, status: 'RESOLVED' }) } });
    const targets = new NotificationTargetsService(client);
    expect((await targets.resolve(actor(Role.DRIVER), { type: 'TRIP', targetType: 'TRIP', targetId: 'trip', context: null })).available).toBe(false);
    expect((await targets.resolve(actor(Role.DRIVER), { type: 'INCIDENT', targetType: 'INCIDENT', targetId: 'incident', context: null })).mobilePath).toBe('/incidents/incident');
  });
  it('does not allow stale child-specific notifications through a different child on the same Trip', async () => {
    const client = db({ tripAttendance: { findFirst: vi.fn().mockResolvedValue(null) }, trip: { findUnique: vi.fn() } });
    expect((await new NotificationTargetsService(client).resolve(actor(Role.PARENT), { type: 'TRIP_ALIGHTING', targetType: 'TRIP', targetId: 'trip', context: { studentId: 'removed-child' } })).available).toBe(false);
    expect(client.trip.findUnique).not.toHaveBeenCalled();
  });
});

describe('push delivery policy; no external provider calls', () => {
  const now = Date.parse('2026-10-27T00:00:00Z');
  const options = { attempts: 0, read: false, createdAt: new Date(now), type: 'INCIDENT', now };
  it('does not resend a provider ticket awaiting receipt, including after state serialization', () => {
    const state = parseDelivery(JSON.parse(JSON.stringify({ version: 1, entries: [{ sessionId: 'session', tokenHash: tokenHash('token'), state: 'RECEIPT', ticketId: 'ticket' }], receiptChecks: 0 })));
    expect(state.entries).toHaveLength(1);
    expect(canSendPush(state.entries[0], options)).toBe(false);
    expect(canSendPush({ ...state.entries[0], state: 'SENT' }, options)).toBe(false);
  });
  it('bounds retries and suppresses stale/read notifications', () => {
    expect(canSendPush(undefined, options)).toBe(true);
    expect(canSendPush(undefined, { ...options, attempts: 5 })).toBe(false);
    expect(canSendPush(undefined, { ...options, read: true })).toBe(false);
    expect(canSendPush(undefined, { ...options, now: now + 3600000 })).toBe(false);
    expect(canSendPush(undefined, { ...options, type: 'TRIP_READY', now: now + 900000 })).toBe(false);
  });
  it('rejects incomplete receipt entries and uses token fingerprints rather than storing raw tokens', () => {
    expect(parseDelivery({ version: 1, entries: [{ sessionId: 's', state: 'RECEIPT' }], receiptChecks: -1 })).toEqual({ version: 1, entries: [], receiptChecks: 0 });
    expect(tokenHash('token')).toHaveLength(64); expect(tokenHash('token')).not.toBe(tokenHash('rotated'));
  });
  it('the worker is inert when explicitly disabled; no query or network is performed', async () => {
    const client = db({ notification: { findMany: vi.fn() } });
    const fetch = vi.spyOn(globalThis, 'fetch');
    try { await new PushDeliveryService(client, new ConfigService({ PUSH_NOTIFICATIONS_ENABLED: 'false' }), {} as NotificationTargetsService).tick();
      expect(client.notification.findMany).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
    } finally { fetch.mockRestore(); }
  });
});
