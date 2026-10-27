'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useNotifications } from './notification-provider';
import { NotificationList } from './notification-list';

export function NotificationBell() {
  const { summary } = useNotifications();
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  const actionable = summary?.actionableIncidentCount ?? 0;
  return <div ref={container} className="relative">
    <button ref={trigger} type="button" aria-label={`Thông báo${summary ? `, ${summary.unreadCount} chưa đọc, ${actionable} sự cố cần xử lý` : ''}`} aria-expanded={open} aria-controls="admin-notifications" onClick={() => setOpen(value => !value)} className={`relative rounded-full p-2 hover:bg-slate-100 ${actionable > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
      {!!summary?.unreadCount && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-slate-700 px-1 text-[10px] leading-4 font-bold text-white">{summary.unreadCount > 99 ? '99+' : summary.unreadCount}</span>}
    </button>
    {open && <div id="admin-notifications" role="dialog" aria-label="Thông báo" className="fixed top-16 right-3 z-50 w-[calc(100vw-1.5rem)] max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-surface text-foreground shadow-xl sm:absolute sm:top-12 sm:right-0 sm:w-[420px]">
      <div className="flex items-center justify-between px-4 pt-4 pb-2"><h2 className="font-bold">Thông báo</h2><button type="button" aria-label="Đóng thông báo" onClick={() => { setOpen(false); trigger.current?.focus(); }} className="rounded p-1 text-slate-500">✕</button></div>
      {actionable > 0 && <Link href="/admin/incidents?status=WAITING_ASSIGNMENT&actionable=true" onClick={() => setOpen(false)} className="mx-4 mb-2 block rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">Có {actionable} sự cố cần xử lý →</Link>}
      <NotificationList compact onNavigate={() => setOpen(false)} />
      <Link href="/admin/notifications" onClick={() => setOpen(false)} className="block border-t border-slate-100 p-3 text-center text-sm font-semibold">Xem tất cả</Link>
    </div>}
  </div>;
}
