'use client';
import { getTripStatusLabel } from '@/lib/status-labels';

import React, { useEffect, useState } from 'react';
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
import { CalendarIcon, RouteIcon, SpinnerIcon } from '@/components/icons';

function initialRange() {
  const from = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
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

export function TeacherSchedule({
  teacherId,
  schoolId,
}: {
  teacherId: string;
  schoolId?: string | null;
}) {
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
        const first = await apiClient.listTrips({
          schoolId: schoolId || undefined,
          ...range,
          page: 1,
          limit: 100,
        });
        const all = [...first.items];
        for (let next = 2; next <= first.totalPages; next += 4) {
          if (!active) return;
          const pages = await Promise.all(
            Array.from(
              { length: Math.min(4, first.totalPages - next + 1) },
              (_, index) =>
                apiClient.listTrips({
                  schoolId: schoolId || undefined,
                  ...range,
                  page: next + index,
                  limit: 100,
                }),
            ),
          );
          all.push(...pages.flatMap((result) => result.items));
        }
        if (!active) return;
        const matching = [
          ...new Map(
            all
              .filter((item) => item.busAttendantId === teacherId)
              .map((item) => [item.id, item]),
          ).values(),
        ];
        matching.sort((a, b) =>
          `${a.serviceDate} ${a.scheduledStartTime || ''}`.localeCompare(
            `${b.serviceDate} ${b.scheduledStartTime || ''}`,
          ),
        );
        setItems(matching);
        setPage(1);
      } catch (cause) {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : 'Không thể tải lịch phụ trách chuyến xe.',
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [teacherId, schoolId, range, reload]);

  const invalidRange = !fromDate || !toDate || fromDate > toDate;
  const totalPages = Math.max(1, Math.ceil(items.length / limit));
  const visibleItems = items.slice((page - 1) * limit, page * limit);

  return (
    <Card className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden" aria-busy={loading}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-amber-500" />
            Lịch phụ trách chuyến xe
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Các chuyến xe giáo viên được phân công làm phụ xe / điểm danh học sinh.
          </p>
        </div>

        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (invalidRange) return;
            setRange({ fromDate, toDate });
            setReload((value) => value + 1);
          }}
        >
          <FilterToolbar className="flex items-center gap-2 p-0 border-0 shadow-none bg-transparent">
            <FilterField label="Từ ngày">
              <Input
                type="date"
                required
                value={fromDate}
                max={toDate || undefined}
                onChange={(event) => setFromDate(event.target.value)}
                className="text-xs"
              />
            </FilterField>
            <FilterField label="Đến ngày">
              <Input
                type="date"
                required
                value={toDate}
                min={fromDate || undefined}
                onChange={(event) => setToDate(event.target.value)}
                className="text-xs"
              />
            </FilterField>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="text-xs whitespace-nowrap self-end h-8 cursor-pointer"
              disabled={loading || invalidRange}
            >
              Xem lịch
            </Button>
          </FilterToolbar>
        </form>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
          <SpinnerIcon className="w-5 h-5 animate-spin text-amber-500" />
          <span className="text-xs">Đang tải lịch phụ trách chuyến xe...</span>
        </div>
      ) : error ? (
        <div className="py-10 px-4 text-center space-y-2">
          <p className="text-xs text-rose-600 font-medium">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setReload((value) => value + 1)}
            className="text-xs"
          >
            Thử lại
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 px-4 text-center">
          <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400 space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
              <RouteIcon className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-xs font-semibold text-slate-700">Chưa có lịch phụ trách chuyến xe</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Giáo viên này chưa được phân công phụ trách chuyến xe nào trong khoảng thời gian đã chọn.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table minWidth={900} className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <th className="p-3 pl-4">Ngày</th>
                  <th className="p-3">Giờ chạy</th>
                  <th className="p-3">Tuyến / Trường</th>
                  <th className="p-3">Chiều</th>
                  <th className="p-3">Phương tiện</th>
                  <th className="p-3">Tài xế</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3 pr-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleItems.map((item) => {
                  const virtual =
                    item.type === 'VIRTUAL' ||
                    item.isVirtual ||
                    String(item.status) === 'NOT_CREATED';
                  const status = statuses[virtual ? 'NOT_CREATED' : item.status];
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 pl-4 font-medium text-slate-700 whitespace-nowrap">
                        {new Date(
                          `${item.serviceDate.slice(0, 10)}T00:00:00`,
                        ).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {item.displayTime}
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-800 block">{item.routeName}</span>
                        <span className="text-[11px] text-slate-400 block">{item.schoolName}</span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {item.direction === 'TO_SCHOOL' ? 'Đến trường' : 'Về bãi'}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-mono text-xs font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {item.vehiclePlate || 'Chưa gán'}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-700">
                        {item.driverName || 'Chưa gán'}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <Badge className={status?.className}>
                          {getTripStatusLabel(virtual ? 'NOT_CREATED' : item.status)}
                        </Badge>
                      </td>
                      <td className="p-3 pr-4 text-right whitespace-nowrap">
                        <TableActions
                          actions={[
                            {
                              label: virtual ? 'Xem tuyến' : 'Xem chuyến',
                              href: virtual
                                ? `/admin/routes/${item.routeId}`
                                : `/admin/trips/${item.id}`,
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
          <div className="p-4 border-t border-slate-100">
            <PaginationControl
              page={page}
              totalPages={totalPages}
              total={items.length}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={(value) => {
                setLimit(value);
                setPage(1);
              }}
            />
          </div>
        </>
      )}
    </Card>
  );
}
