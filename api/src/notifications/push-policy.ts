import { createHash } from 'node:crypto';
import { type Prisma } from '@prisma/client';

export type PushEntry = { sessionId: string; tokenHash: string; ticketId?: string; state: 'RETRY' | 'RECEIPT' | 'SENT' | 'FAILED' };
export interface PushDeliveryState { version: 1; entries: PushEntry[]; receiptChecks: number }
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export function parseDelivery(value: Prisma.JsonValue): PushDeliveryState {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1 || !Array.isArray(value.entries)) return { version: 1, entries: [], receiptChecks: 0 };
  const entries: PushEntry[] = [];
  for (const item of value.entries) {
    if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.sessionId !== 'string' || typeof item.tokenHash !== 'string' || !['RETRY', 'RECEIPT', 'SENT', 'FAILED'].includes(String(item.state))) continue;
    if (item.state === 'RECEIPT' && typeof item.ticketId !== 'string') continue;
    entries.push({ sessionId: item.sessionId, tokenHash: item.tokenHash, state: item.state as PushEntry['state'], ...(typeof item.ticketId === 'string' ? { ticketId: item.ticketId } : {}) });
  }
  return { version: 1, entries, receiptChecks: typeof value.receiptChecks === 'number' && Number.isSafeInteger(value.receiptChecks) && value.receiptChecks >= 0 ? value.receiptChecks : 0 };
}
export function pushTtlMs(type: string): number {
  return type === 'TRIP_READY' || type === 'TRIP_STARTED' ? 15 * 60 * 1000 : type === 'INCIDENT' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
}
export function canSendPush(entry: PushEntry | undefined, options: { attempts: number; read: boolean; createdAt: Date; type: string; now: number }): boolean {
  return (!entry || entry.state === 'RETRY') && options.attempts < 5 && !options.read && options.now - options.createdAt.getTime() < pushTtlMs(options.type);
}
