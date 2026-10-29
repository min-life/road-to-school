'use client';
import { FilterToolbar, FilterField } from '@/components/ui/filter-toolbar';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/auth-provider';
import { SchoolSelectFilter } from '@/components/admin/common/school-select-filter';
import { OverviewTrips } from '@/components/admin/overview/overview-trips';
import { OverviewBanner } from '@/components/admin/overview/overview-banner';
import { useVisibleRefresh } from '@/hooks/use-visible-refresh';
import { getAdminOverview, vietnamToday, type AdminOverview } from '@/lib/admin-overview';
import { ApiError } from '@/lib/api-client';

const statuses = [
  { key: 'SCHEDULED', label: 'Chờ khởi hành', style: 'border-t-amber-400' },
  { key: 'IN_PROGRESS', label: 'Đang chạy', style: 'border-t-sky-500' },
  { key: 'COMPLETED', label: 'Hoàn thành', style: 'border-t-emerald-500' },
  { key: 'CANCELLED', label: 'Đã hủy', style: 'border-t-slate-400' },
] as const;

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const [date, setDate] = useState(vietnamToday);
  const [schoolId, setSchoolId] = useState('');
  const [result, setResult] = useState<{ identity: string; data: AdminOverview } | null>(null);
  const [failure, setFailure] = useState<{ identity: string; message: string } | null>(null);
  const system = user?.role === 'SYSTEM_ADMIN';
  const selectedSchool = system ? schoolId : user?.schoolId || '';
  const identity = JSON.stringify([user?.id, user?.role, user?.schoolId, date, selectedSchool]);
  const data = result?.identity === identity ? result.data : null;
  const error = failure?.identity === identity ? failure.message : null;
  const refresh = useVisibleRefresh(identity, async ({ isCurrent }) => {
    if (!user) return false;
    try {
      const response = await getAdminOverview(date, selectedSchool);
      if (!isCurrent()) return;
      setResult({ identity, data: response }); setFailure(null);
    } catch (cause) {
      if (!isCurrent()) return;
      setFailure({ identity, message: cause instanceof Error ? cause.message : 'Không thể tải tổng quan' });
      if (cause instanceof ApiError && [401, 403, 404].includes(cause.statusCode)) { setResult(null); return false; }
    }
  }, 20000);
  const listHref = (status?: string) => {
    const query = new URLSearchParams({ fromDate: date, toDate: date });
    if (selectedSchool) query.set('schoolId', selectedSchool);
    if (status) query.set('status', status);
    return `/admin/trips?${query}`;
  };
  return <div className="space-y-6">
    <OverviewBanner schoolName={data?.schoolName} />
      <FilterToolbar>
        {system && <FilterField label="Trường học">
          <SchoolSelectFilter value={schoolId} onChange={id => setSchoolId(id)} />
        </FilterField>
        }<FilterField label="Ngày phục vụ">
          <input aria-label="Ngày phục vụ" type="date" value={date} onChange={event => { if (event.target.value) setDate(event.target.value); }} className="w-full" />
        </FilterField>
        <button type="button" onClick={refresh} className="rounded-xl border border-slate-200 bg-surface px-3 py-2 text-sm font-semibold hover:bg-slate-50">Làm mới</button>
      </FilterToolbar>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}{data && ' · Đang hiển thị lần cập nhật trước.'}</div>}
    {!data && !error && <div role="status" className="rounded-2xl border border-slate-200 bg-surface p-10 text-center text-sm text-slate-500">Đang tải tổng quan…</div>}
    {data && <>
      <section aria-labelledby="overview-tasks">
        <div className="mb-3 flex flex-wrap items-baseline gap-2"><h2 id="overview-tasks" className="font-bold">Cần xử lý</h2><span className="text-xs text-slate-500">Đang chờ · Tất cả ngày</span></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{data.tasks.map(task => <Link key={task.kind} href={task.href} className={`flex items-center justify-between gap-3 rounded-2xl border p-4 transition-shadow hover:shadow-sm ${task.kind === 'INCIDENT' && task.count > 0 ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-slate-200 bg-surface'}`}>
          <span className="text-sm font-semibold">{task.label}</span><span className="text-2xl font-bold tabular-nums">{task.count}</span>
        </Link>)}</div>
      </section>
      <section aria-labelledby="overview-trips">
        <div className="mb-3 flex items-baseline justify-between gap-3"><h2 id="overview-trips" className="font-bold">Chuyến trong ngày</h2><span className="text-sm text-slate-500">Tổng: {data.trips.total}</span></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{statuses.map(status => <Link key={status.key} href={listHref(status.key)} className={`rounded-2xl border border-t-4 border-slate-200 bg-surface p-5 hover:shadow-sm ${status.style}`}>
          <span className="block text-sm text-slate-500">{status.label}</span><span className="mt-2 block text-3xl font-bold tabular-nums">{data.trips[status.key]}</span>
        </Link>)}</div>
        {data.trips.waitingAssignment > 0 && <p className="mt-2 text-xs text-amber-800">Trong số chuyến chờ khởi hành: {data.trips.waitingAssignment} chuyến chờ bố trí nhân sự</p>}
      </section>
      {data.overdueRunningTrips.length > 0 && <OverviewTrips trips={data.overdueRunningTrips} title="Chuyến từ ngày trước vẫn đang chạy" />}
      <OverviewTrips trips={data.attentionTrips} title="Chuyến cần chú ý" href={listHref()} />
      <section aria-labelledby="overview-inventory"><h2 id="overview-inventory" className="mb-3 font-bold">Hiện trạng</h2><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.inventory.map(item => <Link key={item.key} href={item.href || '/admin'} className="rounded-2xl border border-slate-200 bg-surface p-4 hover:shadow-sm"><span className="block text-sm text-slate-500">{item.label}</span><span className="mt-2 block text-2xl font-bold tabular-nums">{item.count}</span>{system && item.scope === 'OPERATOR' && <span className="mt-1 block text-xs text-slate-400">Toàn nhà xe</span>}</Link>)}
      </div></section>
      <p className="text-right text-xs text-slate-400">Cập nhật {new Date(data.generatedAt).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
    </>}
  </div>;
}
