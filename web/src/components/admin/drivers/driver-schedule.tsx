'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { TripItem } from '@/lib/types';
import { PaginationControl } from '@/components/admin/common/pagination-control';
import { Table } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableActions } from '@/components/admin/common/table-actions';
import { FilterToolbar, FilterField } from '@/components/ui/filter-toolbar';

function initialRange() {
  const from = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const end = new Date(`${from}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  return { fromDate: from, toDate: end.toISOString().slice(0, 10) };
}

const statuses: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: 'Đã lên lịch', className: 'bg-blue-50 text-blue-700' },
  IN_PROGRESS: { label: 'Đang chạy', className: 'bg-amber-50 text-amber-800' },
  COMPLETED: { label: 'Hoàn thành', className: 'bg-emerald-50 text-emerald-700' },
  CANCELLED: { label: 'Đã hủy', className: 'bg-slate-100 text-slate-600' },
  NOT_CREATED: { label: 'Dự kiến', className: 'bg-slate-100 text-slate-600' },
};

export function DriverSchedule({ driverId }: { driverId: string }) {
  const [range, setRange] = useState(initialRange);
  const [fromDate, setFromDate] = useState(range.fromDate);
  const [toDate, setToDate] = useState(range.toDate);
  const [items, setItems] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      setItems([]);
      try {
        // The endpoint paginates all drivers. Filter only after retrieving every page.
        const first = await apiClient.listTrips({ ...range, page: 1, limit: 100 });
        const all = [...first.items];
        for (let next = 2; next <= first.totalPages; next += 4) {
          if (!active) return;
          const pages = await Promise.all(Array.from({ length: Math.min(4, first.totalPages - next + 1) }, (_, index) =>
            apiClient.listTrips({ ...range, page: next + index, limit: 100 })));
          all.push(...pages.flatMap(result => result.items));
        }
        if (!active) return;
        const matching = [...new Map(all.filter(item => item.driverId === driverId).map(item => [item.id, item])).values()];
        matching.sort((a, b) => `${a.serviceDate} ${a.scheduledStartTime || ''}`.localeCompare(`${b.serviceDate} ${b.scheduledStartTime || ''}`));
        setItems(matching);
        setPage(1);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Không thể tải lịch chạy.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [driverId, range, reload]);

  const invalidRange = !fromDate || !toDate || fromDate > toDate;
  const totalPages = Math.max(1, Math.ceil(items.length / limit));
  const visibleItems = items.slice((page - 1) * limit, page * limit);

  return (
    <Card className="driver-schedule" aria-busy={loading}>
      <div className="driver-schedule-heading">
        <h2>Lịch chạy</h2>
        <form className="driver-schedule-filters" onSubmit={event => {
          event.preventDefault();
          if (invalidRange) return;
          setRange({ fromDate, toDate });
          setReload(value => value + 1);
        }}>
          <FilterToolbar className="driver-schedule-toolbar">
            <FilterField label="Từ ngày"><Input type="date" required value={fromDate} max={toDate || undefined} onChange={event => setFromDate(event.target.value)} /></FilterField>
            <FilterField label="Đến ngày"><Input type="date" required value={toDate} min={fromDate || undefined} onChange={event => setToDate(event.target.value)} /></FilterField>
            <Button type="submit" variant="outline" className="ui-filter-refresh" disabled={loading || invalidRange}>Xem lịch</Button>
          </FilterToolbar>
        </form>
      </div>
      {loading ? <p className="driver-schedule-message" role="status">Đang tải lịch chạy…</p>
        : error ? <div className="driver-schedule-message" role="alert"><p>{error}</p><Button type="button" variant="outline" onClick={() => setReload(value => value + 1)}>Thử lại</Button></div>
          : items.length === 0 ? <p className="driver-schedule-message" role="status">Không có lịch chạy trong khoảng ngày đã chọn.</p>
            : <>
              <div className="driver-schedule-table">
                <Table minWidth={900}>
                  <thead><tr><th>Ngày</th><th>Giờ</th><th>Tuyến / Trường</th><th>Chiều</th><th>Xe</th><th>Trạng thái</th><th className="text-right">Thao tác</th></tr></thead>
                  <tbody>{visibleItems.map(item => {
                    const virtual = item.type === 'VIRTUAL' || item.isVirtual || String(item.status) === 'NOT_CREATED';
                    const status = statuses[virtual ? 'NOT_CREATED' : item.status];
                    return <tr key={item.id}>
                      <td>{new Date(`${item.serviceDate.slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN')}</td>
                      <td className="whitespace-nowrap">{item.scheduledStartTime || '—'} – {item.scheduledEndTime || '—'}</td>
                      <td><strong>{item.routeName}</strong><span className="driver-schedule-school">{item.schoolName}</span></td>
                      <td>{item.direction === 'TO_SCHOOL' ? 'Đến trường' : 'Về bãi'}</td>
                      <td className="whitespace-nowrap">{item.vehiclePlate || 'Chưa gán'}</td>
                      <td><Badge className={status?.className}>{status?.label || item.status}</Badge></td>
                      <td><TableActions actions={[{ label: virtual ? 'Xem tuyến' : 'Xem chuyến', href: virtual ? `/admin/routes/${item.routeId}` : `/admin/trips/${item.id}` }]} /></td>
                    </tr>;
                  })}</tbody>
                </Table>
              </div>
              <PaginationControl page={page} totalPages={totalPages} total={items.length} limit={limit} onPageChange={setPage}
                onLimitChange={value => { setLimit(value); setPage(1); }} />
            </>}
    </Card>
  );
}
