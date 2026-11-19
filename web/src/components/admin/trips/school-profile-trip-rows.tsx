'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { ContextLink } from '@/components/admin/common/context-navigation';
import { getRouteDisplayName } from '@/components/admin/routes/route-display';
import { Table } from '@/components/ui/table';
import { displayDate } from '@/lib/school-lifecycle';
import { getTripStatusLabel } from '@/lib/status-labels';
import type { TripItem } from '@/lib/types';

const weekdays = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

export function SchoolProfileTripRows({ trips, loading, error, invalid, filters }: {
  trips: TripItem[]; loading: boolean; error: string | null; invalid: boolean;
  filters: { fromDate: string; toDate: string; status: string };
}) {
  const pathname = usePathname();
  const query = useSearchParams();
  const returnQuery = new URLSearchParams(query.toString());
  for (const [key, value] of Object.entries(filters)) {
    if (value) returnQuery.set(key, value);
    else returnQuery.delete(key);
  }
  const source = `${pathname}?${returnQuery}`;

  let state = '';
  if (invalid) state = 'Chọn lại khoảng ngày để xem chuyến xe.';
  else if (loading) state = 'Đang tải chuyến xe…';
  else if (error) state = error;
  else if (!trips.length) state = 'Không có chuyến xe phù hợp.';
  if (state) return <p className="school-trip-list-state" role={!invalid && !loading && error ? 'alert' : 'status'}>{state}</p>;

  const groups = new Map<string, TripItem[]>();
  for (const trip of trips) {
    const date = trip.serviceDate.slice(0, 10);
    const group = groups.get(date);
    if (group) group.push(trip);
    else groups.set(date, [trip]);
  }

  return (
    <div tabIndex={0} role="region" aria-label="Bảng chuyến xe của trường" className="school-trip-list-scroll">
      <Table className="school-trip-list" minWidth={720}>
        <thead><tr>
          <th scope="col">Tuyến và chiều</th>
          <th scope="col">Khung giờ</th>
          <th scope="col">Xe và nhân sự</th>
          <th scope="col" className="school-trip-count">Học sinh</th>
          <th scope="col">Trạng thái</th>
          <th scope="col" className="school-trip-action">Thao tác</th>
        </tr></thead>
        {[...groups].map(([date, rows]) => {
          const weekday = weekdays[new Date(`${date}T00:00:00Z`).getUTCDay()];
          return <tbody key={date}>
            <tr><th className="school-trip-date-heading" scope="rowgroup" colSpan={6}>
              {weekday ? `${weekday} · ` : ''}{displayDate(date)}
            </th></tr>
            {rows.sort((first, second) => first.scheduledStartTime.localeCompare(second.scheduledStartTime)).map(trip => {
              const name = getRouteDisplayName({ id: trip.routeId, name: trip.routeName, direction: trip.direction });
              const direction = trip.direction === 'TO_SCHOOL' ? 'Chiều đi' : 'Chiều về';
              const isExpected = trip.isVirtual || trip.type === 'VIRTUAL' || String(trip.status) === 'NOT_CREATED';
              return <tr key={trip.id} className="school-trip-row">
                <td>
                  <div className="school-trip-name">
                    <span className="school-trip-direction" data-direction={trip.direction} aria-hidden="true" />
                    <div>
                      <strong>{name}</strong>
                      {!/^Tuyến (đi|về)(?: \d+)?$/i.test(name) && <small>{direction}</small>}
                    </div>
                  </div>
                </td>
                <td className="school-trip-time">{trip.scheduledStartTime || '—'} – {trip.scheduledEndTime || '—'}</td>
                <td>
                  <strong>{trip.vehiclePlate || 'Chưa gán xe'}</strong>
                  <small>Tài xế {trip.driverName || 'chưa gán'} · Giáo viên {trip.busAttendantName || 'chưa gán'}</small>
                </td>
                <td className="school-trip-count">{trip.studentCount ?? '—'}</td>
                <td><span className="school-trip-status" data-status={isExpected ? 'NOT_CREATED' : trip.status}>
                  {isExpected ? 'Dự kiến' : getTripStatusLabel(trip.status)}
                </span></td>
                <td className="school-trip-action">{isExpected ? '—' :
                  <ContextLink href={`/admin/trips/${trip.id}`} source={source} className="school-trip-link">Xem chuyến <span aria-hidden="true">→</span></ContextLink>
                }</td>
              </tr>;
            })}
          </tbody>;
        })}
      </Table>
    </div>
  );
}
