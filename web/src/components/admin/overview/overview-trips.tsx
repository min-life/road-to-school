'use client';

import { Table } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

import { ContextLink } from '@/components/admin/common/context-navigation';
import type { OverviewTrip } from '@/lib/admin-overview';

export function OverviewTrips({ trips, title, href }: { trips: OverviewTrip[]; title: string; href?: string }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-xs">
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <h2 className="font-bold text-foreground">{title}</h2>
      {href && <ContextLink href={href} className="text-sm font-semibold text-slate-600 hover:underline">Xem tất cả →</ContextLink>}
    </div>
    {trips.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500">Không có chuyến cần chú ý</p> :
      <div className="overflow-x-auto"><Table className="w-full text-left text-sm" minWidth={815}>
            <colgroup><col style={{ width: 110 }} /><col /><col style={{ width: 210 }} /><col style={{ width: 175 }} /><col style={{ width: 80 }} /></colgroup>
        <thead className="bg-slate-50 text-xs text-slate-500"><tr>
          <th className="px-5 py-3">Giờ</th><th className="px-4 py-3">Chuyến</th><th className="px-4 py-3">Nhân sự</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3"><span className="sr-only">Thao tác</span></th>
        </tr></thead>
        <tbody className="divide-y divide-slate-100">{trips.map(trip => <tr key={trip.id} className="hover:bg-slate-50/60">
          <td className="whitespace-nowrap px-5 py-4 tabular-nums">{trip.scheduledStartTime || '—'}<span className="mt-1 block text-xs text-slate-500">{trip.serviceDate.split('-').reverse().join('/')}</span></td>
          <td className="px-4 py-4"><ContextLink href={`/admin/trips/${trip.id}`} className="font-semibold hover:underline">{trip.name}</ContextLink><span className="mt-1 block text-xs text-slate-500">{trip.schoolName} · {trip.vehiclePlate}</span></td>
          <td className="px-4 py-4"><span className="block">{trip.driverName}</span><span className="mt-1 block text-xs text-slate-500">{trip.attendantName}</span></td>
          <td className="whitespace-nowrap px-4 py-4"><Badge className={`rounded-full px-2.5 py-1 text-xs font-semibold ${trip.waitingAssignment ? 'bg-rose-50 text-rose-700' : trip.status === 'IN_PROGRESS' ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-800'}`}>{trip.waitingAssignment ? 'Chờ phân công' : trip.status === 'IN_PROGRESS' ? 'Đang chạy' : 'Chờ khởi hành'}</Badge></td>
          <td className="px-4 py-4"><ContextLink href={`/admin/trips/${trip.id}`} aria-label={`Xem ${trip.name}`} className="font-semibold hover:underline">Xem</ContextLink></td>
        </tr>)}</tbody>
      </Table></div>}
  </section>;
}
