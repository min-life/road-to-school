'use client';
import { PageHeader } from '@/components/ui/page-header';
import { NotificationList } from '@/components/admin/notifications/notification-list';
export default function NotificationsPage() {
  return <div className="ui-list-page"><PageHeader title="Thông báo" /><div className="overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-xs"><NotificationList /></div></div>;
}
