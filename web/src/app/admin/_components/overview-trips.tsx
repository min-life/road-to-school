'use client';

import React from 'react';
import { TableActions } from '@/components/admin/common/table-actions';
import { Table } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ContextLink } from '@/components/admin/common/context-navigation';
import { AlertTriangleIcon } from '@/components/icons';
import type { OverviewTrip } from '@/lib/admin-overview';

export interface OverviewTripsProps {
  attentionTrips?: OverviewTrip[];
  overdueRunningTrips?: OverviewTrip[];
  trips?: OverviewTrip[];
  title?: string;
  href?: string;
  className?: string;
}

export function OverviewTrips({
  attentionTrips,
  overdueRunningTrips = [],
  trips,
  title = 'Theo dõi chuyến',
  href,
  className = '',
}: OverviewTripsProps) {
  const items = trips ?? attentionTrips ?? [];
  const overdue = overdueRunningTrips ?? [];
  const waitingTrips = items.filter((trip) => trip.waitingAssignment);
  const activeOrUpcomingTrips = items.filter((trip) => !trip.waitingAssignment);

  return (
    <section
      className={`min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-xs flex flex-col ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 flex-shrink-0">
        <h2 className="font-bold text-foreground">{title}</h2>
        {href && (
          <ContextLink
            href={href}
            className="text-xs font-semibold text-slate-600 hover:text-foreground hover:underline"
          >
            Tất cả chuyến trong ngày →
          </ContextLink>
        )}
      </div>

      {/* Cảnh báo Chuyến từ ngày trước vẫn đang chạy */}
      {overdue.length > 0 && (
        <div className="border-b border-amber-200 bg-amber-50/80 p-4 flex-shrink-0">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangleIcon className="h-4 w-4 text-amber-700 flex-shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Chuyến từ ngày trước vẫn đang chạy ({overdue.length})
            </h3>
          </div>
          <div className="relative overflow-x-auto rounded-xl border border-amber-200/80 bg-surface">
            <Table className="w-full text-left text-sm" minWidth={700}>
              <colgroup>
                <col style={{ width: 110 }} />
                <col />
                <col style={{ width: 190 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 90 }} />
              </colgroup>
              <thead className="bg-amber-100/40 text-xs text-amber-900">
                <tr>
                  <th className="px-4 py-2.5">Ngày / Giờ</th>
                  <th className="px-4 py-2.5">Chuyến</th>
                  <th className="px-4 py-2.5">Nhân sự</th>
                  <th className="px-4 py-2.5">Trạng thái</th>
                  <th className="px-4 py-2.5">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100/60">
                {overdue.map((trip) => (
                  <tr key={trip.id} className="hover:bg-amber-50/50">
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                      <span className="font-semibold text-rose-700">
                        {trip.serviceDate.split('-').reverse().join('/')}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {trip.scheduledStartTime || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ContextLink
                        href={`/admin/trips/${trip.id}`}
                        className="font-semibold text-foreground hover:underline"
                      >
                        {trip.name}
                      </ContextLink>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {trip.schoolName} · {trip.vehiclePlate}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block text-foreground">{trip.driverName}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {trip.attendantName}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Badge className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                        Đang chạy
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <TableActions
                        actions={[
                          {
                            label: 'Chi tiết',
                            href: `/admin/trips/${trip.id}`,
                            title: `Xem ${trip.name}`,
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      )}

      {/* Danh sách theo dõi chuyến trong ngày */}
      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-500 min-h-[160px]">
          Không có chuyến để theo dõi trong ngày
        </div>
      ) : (
        <div className="relative overflow-x-auto flex-1">
          <Table className="w-full text-left text-sm" minWidth={750}>
            <colgroup>
              <col style={{ width: 110 }} />
              <col />
              <col style={{ width: 200 }} />
              <col style={{ width: 160 }} />
              <col style={{ width: 100 }} />
            </colgroup>
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-5 py-3">Giờ</th>
                <th className="px-4 py-3">Chuyến</th>
                <th className="px-4 py-3">Nhân sự</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {waitingTrips.length > 0 && (
                <>
                  <tr className="bg-amber-50/70 text-xs font-semibold text-amber-900">
                    <td colSpan={5} className="px-5 py-2">
                      Chờ bố trí nhân sự ({waitingTrips.length})
                    </td>
                  </tr>
                  {waitingTrips.map((trip) => (
                    <tr key={trip.id} className="hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-5 py-4 tabular-nums">
                        {trip.scheduledStartTime || '—'}
                        <span className="mt-1 block text-xs text-slate-500">
                          {trip.serviceDate.split('-').reverse().join('/')}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <ContextLink
                          href={`/admin/trips/${trip.id}`}
                          className="font-semibold text-foreground hover:underline"
                        >
                          {trip.name}
                        </ContextLink>
                        <span className="mt-1 block text-xs text-slate-500">
                          {trip.schoolName} · {trip.vehiclePlate}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="block text-foreground">{trip.driverName}</span>
                        <span className="mt-1 block text-xs text-slate-500">{trip.attendantName}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <Badge className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                          Chờ phân công
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <TableActions
                          actions={[
                            {
                              label: 'Chi tiết',
                              href: `/admin/trips/${trip.id}`,
                              title: `Xem ${trip.name}`,
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </>
              )}

              {activeOrUpcomingTrips.length > 0 && (
                <>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-700">
                    <td colSpan={5} className="px-5 py-2">
                      Đang chạy và sắp khởi hành ({activeOrUpcomingTrips.length})
                    </td>
                  </tr>
                  {activeOrUpcomingTrips.map((trip) => (
                    <tr key={trip.id} className="hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-5 py-4 tabular-nums">
                        {trip.scheduledStartTime || '—'}
                        <span className="mt-1 block text-xs text-slate-500">
                          {trip.serviceDate.split('-').reverse().join('/')}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <ContextLink
                          href={`/admin/trips/${trip.id}`}
                          className="font-semibold text-foreground hover:underline"
                        >
                          {trip.name}
                        </ContextLink>
                        <span className="mt-1 block text-xs text-slate-500">
                          {trip.schoolName} · {trip.vehiclePlate}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="block text-foreground">{trip.driverName}</span>
                        <span className="mt-1 block text-xs text-slate-500">{trip.attendantName}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <Badge
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            trip.status === 'IN_PROGRESS'
                              ? 'bg-sky-50 text-sky-700'
                              : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          {trip.status === 'IN_PROGRESS' ? 'Đang chạy' : 'Chờ khởi hành'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <TableActions
                          actions={[
                            {
                              label: 'Chi tiết',
                              href: `/admin/trips/${trip.id}`,
                              title: `Xem ${trip.name}`,
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </Table>
        </div>
      )}
    </section>
  );
}
