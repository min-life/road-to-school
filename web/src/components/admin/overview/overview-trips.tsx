'use client';

import Link from 'next/link';
import type { OverviewTrip } from '@/lib/admin-overview';

export function OverviewTrips({ trips, title, href }: { trips: OverviewTrip[]; title: string; href?: string }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-xs">
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <h2 className="font-bold text-foreground">{title}</h2>
      {href && <Link href={href} className="text-sm font-semibold text-slate-600 hover:underline">Xem tất cả →</Link>}
    </div>
    {trips.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500">Không có chuyến cần chú ý</p> :
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500"><tr>
          <th className="px-5 py-3">Giờ</th><th className="px-4 py-3">Chuyến</th><th className="px-4 py-3">Nhân sự</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3"><span className="sr-only">Thao tác</span></th>
        </tr></thead>
        <tbody className="divide-y divide-slate-100">{trips.map(trip => <tr key={trip.id} className="hover:bg-slate-50/60">
          <td className="whitespace-nowrap px-5 py-4 tabular-nums">{trip.scheduledStartTime || '—'}<span className="mt-1 block text-xs text-slate-500">{trip.serviceDate.split('-').reverse().join('/')}</span></td>
          <td className="px-4 py-4"><Link href={`/admin/trips/${trip.id}`} className="font-semibold hover:underline">{trip.name}</Link><span className="mt-1 block text-xs text-slate-500">{trip.schoolName} · {trip.vehiclePlate}</span></td>
          <td className="px-4 py-4"><span className="block">{trip.driverName}</span><span className="mt-1 block text-xs text-slate-500">{trip.attendantName}</span></td>
          <td className="whitespace-nowrap px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${trip.waitingAssignment ? 'bg-rose-50 text-rose-700' : trip.status === 'IN_PROGRESS' ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-800'}`}>{trip.waitingAssignment ? 'Chờ phân công' : trip.status === 'IN_PROGRESS' ? 'Đang chạy' : 'Chờ khởi hành'}</span></td>
          <td className="px-4 py-4"><Link href={`/admin/trips/${trip.id}`} aria-label={`Xem ${trip.name}`} className="font-semibold hover:underline">Xem</Link></td>
        </tr>)}</tbody>
      </table></div>}
  </section>;
}
