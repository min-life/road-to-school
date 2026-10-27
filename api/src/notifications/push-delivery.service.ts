import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { Prisma, type Notification, type User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationTargetsService } from './notification-targets.service.js';
import { canSendPush, parseDelivery, pushTtlMs, tokenHash, type PushDeliveryState } from './push-policy.js';

type PushRow = Notification & { user: User };
interface Lease { expiresAt: Date }
/** The inbox is also the durable outbox. OFF unless explicitly enabled by the operator. */
@Injectable()
export class PushDeliveryService {
  private readonly logger = new Logger(PushDeliveryService.name);
  private running = false;
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly targets: NotificationTargetsService) {}

  private async call(path: 'send' | 'getReceipts', body: unknown): Promise<unknown> {
    const secret = this.config.get<string>('EXPO_PUSH_ACCESS_TOKEN');
    const response = await fetch(`https://exp.host/--/api/v2/push/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(secret ? { Authorization: `Bearer ${secret}` } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Push provider HTTP ${response.status}`);
    return response.json();
  }
  @Interval(15000)
  async tick(): Promise<void> {
    if (this.running || this.config.get<string>('PUSH_NOTIFICATIONS_ENABLED') !== 'true') return;
    this.running = true;
    try {
      const rows = await this.prisma.notification.findMany({ where: { pushState: { in: ['PENDING', 'RECEIPT', 'PROCESSING'] }, pushAfterAt: { lte: new Date() } }, orderBy: [{ pushAfterAt: 'asc' }, { id: 'asc' }], take: 20, include: { user: true } });
      for (const row of rows) {
        const lease: Lease = { expiresAt: new Date(Date.now() + 120000) };
        const claim = await this.prisma.notification.updateMany({ where: { id: row.id, pushState: row.pushState, pushAfterAt: row.pushAfterAt }, data: { pushState: 'PROCESSING', pushAfterAt: lease.expiresAt } });
        if (!claim.count) continue;
        try { await this.deliver(row, lease); }
        catch {
          await this.prisma.notification.updateMany({ where: { id: row.id, pushState: 'PROCESSING', pushAfterAt: lease.expiresAt }, data: { pushState: row.pushAttempts >= 4 ? 'FAILED' : 'PENDING', pushAttempts: { increment: 1 }, pushAfterAt: new Date(Date.now() + Math.min(900000, 30000 * 2 ** row.pushAttempts)) } });
          this.logger.warn('Push delivery deferred; inbox remains available.');
        }
      }
    } catch { this.logger.warn('Push worker unavailable; will retry.'); }
    finally { this.running = false; }
  }
  private async save(id: string, lease: Lease, data: Prisma.NotificationUpdateManyMutationInput, extend = false) {
    const nextExpiry = extend ? new Date(Date.now() + 120000) : null;
    const result = await this.prisma.notification.updateMany({ where: { id, pushState: 'PROCESSING', pushAfterAt: lease.expiresAt }, data: { ...data, ...(nextExpiry ? { pushAfterAt: nextExpiry } : {}) } });
    if (!result.count) throw new Error('Push delivery lease changed');
    if (nextExpiry) lease.expiresAt = nextExpiry;
  }
  private async stillRelevant(row: PushRow): Promise<boolean> {
    if (!row.user.isActive || !await this.targets.resolve(row.user, row).then(target => target.available)) return false;
    if (row.type === 'TRIP_READY') return !!await this.prisma.trip.findFirst({ where: { id: row.targetId, status: 'SCHEDULED', assignedDriverId: row.userId }, select: { id: true } });
    if (row.targetType === 'INCIDENT' && row.context && typeof row.context === 'object' && !Array.isArray(row.context) && row.context.pendingAction === true) {
      return !!await this.prisma.tripIncident.findFirst({ where: { id: row.targetId, OR: [{ status: 'WAITING_ASSIGNMENT', trip: { status: 'SCHEDULED' } }, { status: 'WAITING_CONFIRMATION', trip: { status: 'IN_PROGRESS', assignedBusAttendantId: row.userId } }] }, select: { id: true } });
    }
    return true;
  }
  private async deliver(row: PushRow, lease: Lease): Promise<void> {
    const state = parseDelivery(row.pushDelivery);
    const sessions = await this.prisma.session.findMany({ where: { userId: row.userId, revokedAt: null, expiresAt: { gt: new Date() }, pushToken: { not: null } }, select: { id: true, pushToken: true }, orderBy: { createdAt: 'desc' }, take: 30 });
    const sessionMap = new Map(sessions.map(session => [session.id, session]));
    for (const entry of state.entries) if (!sessionMap.has(entry.sessionId) || tokenHash(sessionMap.get(entry.sessionId)!.pushToken!) !== entry.tokenHash) entry.state = 'FAILED';
    const pendingReceipts = state.entries.filter(entry => entry.state === 'RECEIPT' && entry.ticketId);
    if (pendingReceipts.length) {
      await this.save(row.id, lease, {}, true);
      const result = await this.call('getReceipts', { ids: pendingReceipts.map(entry => entry.ticketId) }) as { data?: Record<string, { status?: string; details?: { error?: string } }> };
      for (const entry of pendingReceipts) {
        const receipt = result.data?.[entry.ticketId!];
        if (!receipt) continue;
        entry.state = receipt.status === 'ok' ? 'SENT' : 'FAILED';
        if (receipt.details?.error === 'DeviceNotRegistered') await this.clearToken(entry.sessionId, sessionMap.get(entry.sessionId)?.pushToken);
      }
      state.receiptChecks++;
      if (state.receiptChecks >= 60) for (const entry of state.entries) if (entry.state === 'RECEIPT') entry.state = 'FAILED';
      await this.persistDelivery(row.id, lease, state);
    }
    const relevant = await this.stillRelevant(row);
    if (!relevant || row.readAt || Date.now() - row.createdAt.getTime() >= pushTtlMs(row.type)) {
      for (const entry of state.entries) if (entry.state === 'RETRY') entry.state = 'FAILED';
    } else {
      for (const session of sessions) {
        const hash = tokenHash(session.pushToken!);
        let entry = state.entries.find(item => item.sessionId === session.id && item.tokenHash === hash);
        if (!canSendPush(entry, { attempts: row.pushAttempts, read: !!row.readAt, createdAt: row.createdAt, type: row.type, now: Date.now() })) continue;
        // Recheck this exact registration, current user and read state immediately before external delivery.
        const current = await this.prisma.session.findFirst({ where: { id: session.id, userId: row.userId, pushToken: session.pushToken, revokedAt: null, expiresAt: { gt: new Date() }, user: { isActive: true } }, select: { id: true } });
        const unread = await this.prisma.notification.findFirst({ where: { id: row.id, readAt: null }, select: { id: true } });
        if (!current || !unread || !await this.stillRelevant(row)) continue;
        if (!entry) { entry = { sessionId: session.id, tokenHash: hash, state: 'RETRY' }; state.entries.push(entry); }
        await this.persistDelivery(row.id, lease, state);
        const result = await this.call('send', {
          to: session.pushToken, title: row.title, body: 'Mở RoadToSchool để xem thông tin mới nhất.',
          data: { notificationId: row.id }, sound: 'default', channelId: 'operations', ttl: Math.max(1, Math.floor((pushTtlMs(row.type) - (Date.now() - row.createdAt.getTime())) / 1000)),
        }) as { data?: { status?: string; id?: string; details?: { error?: string } } };
        if (result.data?.status === 'ok' && result.data.id) { entry.state = 'RECEIPT'; entry.ticketId = result.data.id; }
        else { entry.state = result.data?.details?.error === 'DeviceNotRegistered' ? 'FAILED' : 'RETRY'; if (entry.state === 'FAILED') await this.clearToken(session.id, session.pushToken); }
        await this.persistDelivery(row.id, lease, state);
      }
    }
    const waiting = state.entries.some(entry => entry.state === 'RECEIPT');
    const retry = state.entries.some(entry => entry.state === 'RETRY') && row.pushAttempts < 5;
    await this.save(row.id, lease, {
      pushState: waiting ? 'RECEIPT' : retry ? 'PENDING' : state.entries.some(entry => entry.state === 'SENT') ? 'SENT' : state.entries.length ? 'FAILED' : 'SKIPPED',
      pushAttempts: { increment: retry ? 1 : 0 }, pushAfterAt: new Date(Date.now() + (waiting ? 60000 : 60000 * 2 ** Math.min(row.pushAttempts, 4))),
      pushDelivery: state as unknown as Prisma.InputJsonValue,
    });
  }
  private persistDelivery(id: string, lease: Lease, state: PushDeliveryState) { return this.save(id, lease, { pushDelivery: state as unknown as Prisma.InputJsonValue }, true); }
  private async clearToken(sessionId: string, token?: string | null) {
    if (token) await this.prisma.session.updateMany({ where: { id: sessionId, pushToken: token }, data: { pushToken: null } });
  }
}
