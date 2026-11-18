'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { PageHeader } from '@/components/ui/page-header';
import { FilterToolbar, FilterField } from '@/components/ui/filter-toolbar';
import { Button } from '@/components/ui/button';
import { SchoolSelectFilter } from '@/components/admin/common/school-select-filter';
import { OverviewTrips } from './_components/overview-trips';
import { useVisibleRefresh } from '@/hooks/use-visible-refresh';
import {
  getAdminOverview,
  vietnamToday,
  overviewTaskHref,
  type AdminOverview,
} from '@/lib/admin-overview';
import { ApiError } from '@/lib/api-client';

const statuses = [
  { key: 'SCHEDULED', label: 'Chờ khởi hành', style: 'border-t-amber-400', barColor: 'bg-amber-400' },
  { key: 'IN_PROGRESS', label: 'Đang chạy', style: 'border-t-sky-500', barColor: 'bg-sky-500' },
  { key: 'COMPLETED', label: 'Hoàn thành', style: 'border-t-emerald-500', barColor: 'bg-emerald-500' },
  { key: 'CANCELLED', label: 'Đã hủy', style: 'border-t-slate-400', barColor: 'bg-slate-400' },
] as const;

function getTaskPresentation(
  kind: string,
  isSystemAdmin: boolean,
): { label: string; order: number; isBlocker: boolean } {
  if (isSystemAdmin) {
    switch (kind) {
      case 'INCIDENT':
        return { label: 'Thiếu tài xế chờ bố trí', order: 1, isBlocker: true };
      case 'LEAVE':
        return { label: 'Tài xế báo nghỉ chờ bố trí', order: 2, isBlocker: true };
      case 'ADMIN_FINALIZATION':
        return { label: 'Chuyến cần chốt hành chính', order: 3, isBlocker: true };
      case 'REQUEST':
        return { label: 'Yêu cầu đổi địa chỉ đang chờ', order: 4, isBlocker: false };
      case 'REOPTIMIZATION':
        return { label: 'Phương án cần tối ưu lại', order: 5, isBlocker: false };
      case 'PLAN':
        return { label: 'Phương án nháp', order: 6, isBlocker: false };
      default:
        return { label: kind, order: 99, isBlocker: false };
    }
  } else {
    switch (kind) {
      case 'INCIDENT':
        return { label: 'Thiếu giáo viên phụ trách chờ bố trí', order: 1, isBlocker: true };
      case 'LEAVE':
        return { label: 'Giáo viên phụ trách báo nghỉ chờ bố trí', order: 2, isBlocker: true };
      case 'REQUEST':
        return { label: 'Yêu cầu đang chờ trường xử lý', order: 3, isBlocker: false };
      case 'PLAN':
        return { label: 'Phương án nháp', order: 4, isBlocker: false };
      default:
        return { label: kind, order: 99, isBlocker: false };
    }
  }
}

function getInventoryPresentation(
  item: { key: string; label: string; count: number; href: string | null; scope: 'SCOPE' | 'OPERATOR' },
  isSystemAdmin: boolean,
  isSingleSchoolSelected: boolean,
  schoolName?: string | null,
): {
  label: string;
  scopeText: string;
  displayValue: React.ReactNode;
} {
  if (isSystemAdmin) {
    switch (item.key) {
      case 'activePlans':
        return {
          label: 'Phương án đang hoạt động',
          scopeText: isSingleSchoolSelected && schoolName ? schoolName : 'Theo bộ lọc trường',
          displayValue: (
            <span className="mt-2 block text-2xl font-bold tabular-nums text-foreground">
              {item.count}
            </span>
          ),
        };
      case 'schools':
        if (isSingleSchoolSelected) {
          const isActive = item.count === 1;
          return {
            label: 'Trạng thái trường',
            scopeText: schoolName || 'Trường đã chọn',
            displayValue: (
              <div className="mt-2 flex items-center">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                    }`}
                >
                  {isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                </span>
              </div>
            ),
          };
        }
        return {
          label: 'Trường đang hoạt động',
          scopeText: 'Toàn nhà xe',
          displayValue: (
            <span className="mt-2 block text-2xl font-bold tabular-nums text-foreground">
              {item.count}
            </span>
          ),
        };
      case 'vehicles':
        return {
          label: 'Tổng phương tiện',
          scopeText: 'Toàn nhà xe',
          displayValue: (
            <span className="mt-2 block text-2xl font-bold tabular-nums text-foreground">
              {item.count}
            </span>
          ),
        };
      case 'drivers':
        return {
          label: 'Tài xế đang hoạt động',
          scopeText: 'Toàn nhà xe',
          displayValue: (
            <span className="mt-2 block text-2xl font-bold tabular-nums text-foreground">
              {item.count}
            </span>
          ),
        };
      default:
        return {
          label: item.label,
          scopeText: item.scope === 'OPERATOR' ? 'Toàn nhà xe' : 'Theo bộ lọc trường',
          displayValue: (
            <span className="mt-2 block text-2xl font-bold tabular-nums text-foreground">
              {item.count}
            </span>
          ),
        };
    }
  } else {
    // SCHOOL_ADMIN
    switch (item.key) {
      case 'activePlans':
        return {
          label: 'Phương án đang hoạt động',
          scopeText: schoolName || 'Trường của bạn',
          displayValue: (
            <span className="mt-2 block text-2xl font-bold tabular-nums text-foreground">
              {item.count}
            </span>
          ),
        };
      case 'students':
        return {
          label: 'Học sinh đang hoạt động',
          scopeText: schoolName || 'Trường của bạn',
          displayValue: (
            <span className="mt-2 block text-2xl font-bold tabular-nums text-foreground">
              {item.count}
            </span>
          ),
        };
      case 'unassigned':
        return {
          label: 'Học sinh chưa có tuyến',
          scopeText: 'Chưa gắn điểm đón/trả',
          displayValue: (
            <span className="mt-2 block text-2xl font-bold tabular-nums text-foreground">
              {item.count}
            </span>
          ),
        };
      case 'attendants':
        return {
          label: 'Giáo viên đang hoạt động',
          scopeText: schoolName || 'Trường của bạn',
          displayValue: (
            <span className="mt-2 block text-2xl font-bold tabular-nums text-foreground">
              {item.count}
            </span>
          ),
        };
      default:
        return {
          label: item.label,
          scopeText: 'Trường của bạn',
          displayValue: (
            <span className="mt-2 block text-2xl font-bold tabular-nums text-foreground">
              {item.count}
            </span>
          ),
        };
    }
  }
}

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

  const refresh = useVisibleRefresh(
    identity,
    async ({ isCurrent }) => {
      if (!user) return false;
      try {
        const response = await getAdminOverview(date, selectedSchool);
        if (!isCurrent()) return;
        setResult({ identity, data: response });
        setFailure(null);
      } catch (cause) {
        if (!isCurrent()) return;
        setFailure({
          identity,
          message: cause instanceof Error ? cause.message : 'Không thể tải tổng quan',
        });
        if (cause instanceof ApiError && [401, 403, 404].includes(cause.statusCode)) {
          setResult(null);
          return false;
        }
      }
    },
    20000,
  );

  const listHref = (status?: string) => {
    const query = new URLSearchParams({ fromDate: date, toDate: date });
    if (selectedSchool) query.set('schoolId', selectedSchool);
    if (status) query.set('status', status);
    return `/admin/trips?${query}`;
  };

  const configuredTasks = (data?.tasks ?? [])
    .map((task) => {
      const meta = getTaskPresentation(task.kind, system);
      return {
        ...task,
        displayLabel: meta.label,
        order: meta.order,
        isBlocker: meta.isBlocker,
        resolvedHref: overviewTaskHref(task),
      };
    })
    .sort((a, b) => a.order - b.order);

  const refreshButton = (
    <Button
      type="button"
      variant="outline"
      onClick={refresh}
      className="ui-filter-refresh flex items-center gap-2"
    >
      <RefreshCw className="h-4 w-4" aria-hidden="true" />
      <span>Làm mới tổng quan</span>
    </Button>
  );

  return (
    <div className="space-y-6">
      {/* 1. Header & Filter theo vai trò */}
      {system ? (
        <>
          <PageHeader
            title="Tổng quan"
            actions={
              data?.schoolName ? (
                <span className="text-sm font-medium text-slate-500" title={data.schoolName}>
                  {data.schoolName}
                </span>
              ) : undefined
            }
          />

          <FilterToolbar aria-label="Bộ lọc và thao tác tổng quan">
            <FilterField label="Trường học" grow>
              <SchoolSelectFilter value={schoolId} onChange={(id) => setSchoolId(id)} />
            </FilterField>
            <div className="ui-filter-actions">
              {refreshButton}
            </div>
          </FilterToolbar>
        </>
      ) : (
        <PageHeader className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-foreground leading-snug">
              Tổng quan
            </h1>
            {data?.schoolName && (
              <p className="mt-1 text-sm font-medium text-slate-500 break-words" title={data.schoolName}>
                {data.schoolName}
              </p>
            )}
          </div>
          <div className="ui-page-header-actions shrink-0">
            {refreshButton}
          </div>
        </PageHeader>
      )}

      {/* Error alert */}
      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
          {data && ' · Đang hiển thị lần cập nhật trước.'}
        </div>
      )}

      {/* Loading placeholder */}
      {!data && !error && (
        <div role="status" className="rounded-2xl border border-slate-200 bg-surface p-10 text-center text-sm text-slate-500">
          Đang tải tổng quan…
        </div>
      )}

      {/* Main Content */}
      {data && (
        <>
          {/* 3. Chuyến theo ngày kèm thanh phân bổ */}
          <section
            aria-labelledby="overview-trips-heading"
            className="rounded-2xl border border-slate-200 bg-surface p-5 shadow-xs"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 id="overview-trips-heading" className="text-base font-bold text-foreground">
                  Chuyến theo ngày
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {data.trips.total} chuyến đã được tạo
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="overview-service-date"
                  className="text-xs font-medium text-slate-500 whitespace-nowrap"
                >
                  Ngày phục vụ:
                </label>
                <input
                  id="overview-service-date"
                  aria-label="Ngày phục vụ"
                  type="date"
                  value={date}
                  onChange={(event) => {
                    if (event.target.value) setDate(event.target.value);
                  }}
                  className="rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-amber-400"
                />
              </div>
            </div>

            <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {statuses.map((status) => {
                const count = data.trips[status.key];
                return (
                  <Link
                    key={status.key}
                    href={listHref(status.key)}
                    className={`group flex flex-col justify-between rounded-xl border border-t-4 border-slate-200 bg-surface p-4 transition hover:shadow-xs ${status.style}`}
                  >
                    <div>
                      <span className="block text-xs font-medium text-slate-500">
                        {status.label}
                      </span>
                      <span className="mt-1 block text-2xl font-bold tabular-nums text-foreground">
                        {count}
                      </span>
                    </div>
                    {status.key === 'SCHEDULED' && data.trips.waitingAssignment > 0 && (
                      <div className="mt-2.5 inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        {data.trips.waitingAssignment} chờ bố trí nhân sự
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Thanh phân bổ */}
            {data.trips.total > 0 && (
              <div className="mt-4" aria-label="Thanh phân bổ trạng thái chuyến" role="img">
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 gap-0.5">
                  {statuses.map((status) => {
                    const count = data.trips[status.key];
                    if (count <= 0) return null;
                    const percentage = (count / data.trips.total) * 100;
                    return (
                      <div
                        key={status.key}
                        style={{ width: `${percentage}%` }}
                        className={`${status.barColor} h-full transition-all`}
                        title={`${status.label}: ${count} chuyến (${Math.round(percentage)}%)`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* 4. Desktop side-by-side: Theo dõi chuyến bên trái cạnh Công việc bên phải */}
            <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-12 items-start">
              {/* Cột trái: Theo dõi chuyến */}
              <div className="min-w-0 lg:col-span-7 xl:col-span-8 flex flex-col">
                <OverviewTrips
                  className="flex flex-col"
                  attentionTrips={data.attentionTrips}
                  overdueRunningTrips={data.overdueRunningTrips}
                  href={listHref()}
                />
              </div>

              {/* Cột phải: Công việc */}
              <div className="min-w-0 lg:col-span-5 xl:col-span-4 flex flex-col">
                <section
                  aria-labelledby="overview-tasks-heading"
                  className="flex flex-col rounded-2xl border border-slate-200 bg-surface p-5 shadow-xs"
                >
                  <div className="flex items-baseline justify-between gap-2 border-b border-slate-100 pb-3 mb-3 flex-shrink-0">
                    <h2 id="overview-tasks-heading" className="font-bold text-foreground">
                      Công việc
                    </h2>
                    <span className="text-xs font-medium text-slate-500">
                      Tất cả ngày
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-surface overflow-hidden">
                    {configuredTasks.map((task) => {
                      const isUrgent = task.count > 0 && task.isBlocker;
                      return (
                        <Link
                          key={task.kind}
                          href={task.resolvedHref}
                          className={`flex items-center justify-between gap-3 px-3.5 py-2.5 transition hover:bg-slate-50/80 ${isUrgent ? 'bg-rose-50/40 hover:bg-rose-50/70' : ''
                            }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isUrgent && (
                              <span
                                className="h-2 w-2 rounded-full bg-rose-500 flex-shrink-0"
                                aria-hidden="true"
                              />
                            )}
                            <span
                              className={`text-xs font-semibold leading-snug truncate ${isUrgent ? 'text-rose-900' : 'text-slate-700'
                                }`}
                            >
                              {task.displayLabel}
                            </span>
                          </div>
                          <span
                            className={`text-sm font-bold tabular-nums ml-2 flex-shrink-0 ${isUrgent
                                ? 'text-rose-700'
                                : task.count > 0
                                  ? 'text-foreground'
                                  : 'text-slate-400'
                              }`}
                          >
                            {task.count}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              </div>
            </div>

            {/* 5. Hiện trạng */}
            <section aria-labelledby="overview-inventory-heading">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h2 id="overview-inventory-heading" className="font-bold text-foreground">
                  Hiện trạng
                </h2>
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {data.inventory.map((item) => {
                  const meta = getInventoryPresentation(
                    item,
                    system,
                    Boolean(selectedSchool),
                    data.schoolName,
                  );
                  const CardContent = (
                    <>
                      <span className="block text-xs font-medium text-slate-500">
                        {meta.label}
                      </span>
                      {meta.displayValue}
                      <span className="mt-1 block text-xs text-slate-400 truncate" title={meta.scopeText}>
                        {meta.scopeText}
                      </span>
                    </>
                  );

                  if (item.href) {
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        className="rounded-2xl border border-slate-200 bg-surface p-4 transition hover:border-slate-300 hover:shadow-xs flex flex-col justify-between"
                      >
                        {CardContent}
                      </Link>
                    );
                  }
                  return (
                    <div
                      key={item.key}
                      className="rounded-2xl border border-slate-200 bg-surface p-4 flex flex-col justify-between"
                    >
                      {CardContent}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Timestamp */}
            <p className="text-right text-xs text-slate-400">
              Cập nhật{' '}
              {new Date(data.generatedAt).toLocaleTimeString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
          </>
      )}
        </div>
      );
}
