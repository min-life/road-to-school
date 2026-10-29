'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { withReturnTo } from '@/lib/back-navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { useVisibleRefresh } from '@/hooks/use-visible-refresh';
import { getNotifications, getNotificationTarget, readNotification, type NotificationList as List } from '@/lib/notifications';
import { useNotifications } from './notification-provider';

export function NotificationList({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const { refresh: refreshSummary } = useNotifications();
  const [filter, setFilter] = useState('ALL');
  const [cursor, setCursor] = useState<string | undefined>();
  const identity = `${user?.id}:${user?.role}:${user?.schoolId}:${filter}:${cursor ?? ''}`;
  const identityRef = useRef(identity);
  useLayoutEffect(() => { identityRef.current = identity; }, [identity]);
  const [stored, setStored] = useState<{ identity: string; value: List } | null>(null);
  const [failure, setFailure] = useState<{ identity: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const data = stored?.identity === identity ? stored.value : null;
  const error = failure?.identity === identity ? failure.message : null;
  const refresh = useVisibleRefresh(`notification-list:${identity}`, async ({ isCurrent }) => {
    if (!user) return false;
    try { const value = await getNotifications(filter, cursor); if (isCurrent()) { setStored({ identity, value }); setFailure(null); } }
    catch (cause) { if (isCurrent()) setFailure({ identity, message: cause instanceof Error ? cause.message : 'Không thể tải thông báo' }); }
  }, 20000);
  async function open(id: string) {
    if (busy) return;
    const scope = identity;
    setBusy(true);
    try {
      const target = await getNotificationTarget(id);
      if (identityRef.current !== scope) return;
      await readNotification(id); refreshSummary(); refresh();
      if (identityRef.current !== scope) return;
      if (!target.available || !target.webPath?.startsWith('/admin/')) { setFailure({ identity, message: 'Nội dung không còn khả dụng' }); return; }
      onNavigate?.(); router.push(withReturnTo(target.webPath, window.location.pathname + window.location.search));
    } catch (cause) { setFailure({ identity, message: cause instanceof Error ? cause.message : 'Không thể mở thông báo' }); }
    finally { setBusy(false); }
  }
  async function readAll() {
    if (busy) return;
    setBusy(true);
    try { await readNotification(); refreshSummary(); refresh(); }
    catch { setFailure({ identity, message: 'Không thể đánh dấu đã đọc' }); }
    finally { setBusy(false); }
  }
  return <div>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
      <div className="flex gap-1">{[['ALL', 'Tất cả'], ['UNREAD', 'Chưa đọc'], ['ACTIONABLE', 'Cần xử lý']].map(([value, label]) => <button key={value} type="button" onClick={() => { setFilter(value); setCursor(undefined); }} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === value ? 'bg-primary text-foreground' : 'text-slate-500 hover:bg-slate-100'}`}>{label}</button>)}</div>
      <button type="button" onClick={readAll} disabled={busy} className="text-xs font-semibold text-slate-600 hover:underline disabled:opacity-50">Đánh dấu đã đọc</button>
    </div>
    {error && <div role="alert" className="px-4 py-3 text-sm text-rose-700">{error} <button type="button" onClick={refresh} className="underline">Thử lại</button></div>}
    {!data && !error && <p role="status" className="p-6 text-center text-sm text-slate-500">Đang tải…</p>}
    {data && <>
      <div className={compact ? 'max-h-96 overflow-y-auto' : ''}>{data.items.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Chưa có thông báo</p> : data.items.map(note => <button key={note.id} type="button" disabled={busy} onClick={() => { void open(note.id); }} className={`flex w-full gap-3 border-b border-slate-100 px-4 py-4 text-left hover:bg-slate-50 ${note.readAt ? 'bg-surface' : 'bg-amber-50/60'}`}>
        <span aria-hidden="true" className="mt-1 text-amber-700">{note.type === 'INCIDENT' ? '⚠' : '●'}</span><span className="min-w-0 flex-1"><span className={`block text-sm ${note.readAt ? 'font-medium' : 'font-bold'}`}>{note.title}</span><span className="mt-1 block text-xs text-slate-500">{note.body}</span><time className="mt-1 block text-xs text-slate-400" dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</time></span>{!note.readAt && <span aria-label="Chưa đọc" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-sky-500" />}
      </button>)}</div>
      {!compact && <div className="flex justify-center gap-4 p-4">{cursor && <button type="button" onClick={() => setCursor(undefined)} className="text-sm font-semibold">Mới nhất</button>}{data.hasMore && data.nextCursor && <button type="button" onClick={() => setCursor(data.nextCursor ?? undefined)} className="text-sm font-semibold">Thông báo cũ hơn →</button>}</div>}
    </>}
  </div>;
}
