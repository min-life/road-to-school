'use client';
import { NotificationList } from '@/components/admin/notifications/notification-list';
export default function NotificationsPage() {
  return <div className="space-y-5"><h1 className="text-2xl font-bold">Thông báo</h1><div className="overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-xs"><NotificationList /></div></div>;
}
