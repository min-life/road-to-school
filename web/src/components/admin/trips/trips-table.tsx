'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useVisibleRefresh } from '@/hooks/use-visible-refresh';
import type { RefreshContext } from '@/lib/refresh-loop';
import { useAuth } from '@/components/auth/auth-provider';
import { apiClient, ApiError } from '@/lib/api-client';
import { TripItem, Role } from '@/lib/types';
import { RouteIcon, SpinnerIcon, AlertIcon, BusIcon } from '@/components/icons';
import { PaginationControl } from '@/components/admin/common/pagination-control';
import { SchoolSelectFilter } from '@/components/admin/common/school-select-filter';

interface TripsTableProps {
  fixedSchoolId?: string;
  refreshKey?: number;
  currentUserRole: Role | null;
  onOpenManualGenerate?: () => void;
}

export function TripsTable({
  fixedSchoolId,
  refreshKey = 0,
  currentUserRole,
  onOpenManualGenerate,
}: TripsTableProps) {
  const { user } = useAuth();
  const isSystemAdmin = currentUserRole === 'SYSTEM_ADMIN';
  const effectiveSchoolId = fixedSchoolId || '';

  // Filters state
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const formatDateStr = (d: Date) => d.toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState<string>(formatDateStr(today));
  const [toDate, setToDate] = useState<string>(formatDateStr(nextWeek));
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(effectiveSchoolId);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);

  // Contract dates for selected school (Requirement 08)
  const [contractBounds, setContractBounds] = useState<{ start?: string; end?: string }>({});

  // Data state
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const activeSchoolId = fixedSchoolId || selectedSchoolId;

  // When activeSchoolId changes, fetch school contract dates
  useEffect(() => {
    let current = true;
    if (activeSchoolId) {
      apiClient
        .getSchoolDetail(activeSchoolId)
        .then((school) => {
          if (!current) return;
          if (school?.contractStartDate && school?.contractEndDate) {
            const start = school.contractStartDate.split('T')[0];
            const end = school.contractEndDate.split('T')[0];
            setContractBounds({ start, end });

            // Clamp current dates within contract
            setFromDate((curr) => {
              if (curr < start) return start;
              if (curr > end) return end;
              return curr;
            });
            setToDate((curr) => {
              if (curr > end) return end;
              if (curr < start) return start;
              return curr;
            });
          }
        })
        .catch(() => {
          if (!current) return;
          setContractBounds({});
        });
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Remove bounds from the previously selected school.
      setContractBounds({});
    }
    return () => { current = false; };
  }, [activeSchoolId]);

  // Load trips
  const fetchTrips = async ({ isCurrent }: RefreshContext) => {
    if (!currentUserRole) return;
    try {
      setError(null);
      const res = await apiClient.listTrips({
        schoolId: activeSchoolId || undefined,
        status: selectedStatus || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        limit,
      });
      if (!isCurrent()) return;
      const maxPage = Math.max(1, res.totalPages || 1);
      if (page > maxPage) { setPage(maxPage); return; }
      setTrips(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: unknown) {
      if (!isCurrent()) return;
      if (err instanceof ApiError && (err.statusCode === 403 || err.statusCode === 404)) {
        setTrips([]); setTotal(0); setTotalPages(1); setError(err.message); return false;
      }
      if (!trips.length) setError(err instanceof Error ? err.message : 'Không thể tải danh sách chuyến xe');
    } finally {
      if (isCurrent()) setLoading(false);
    }
  };
  const scope = JSON.stringify([user?.id, user?.schoolId, currentUserRole, activeSchoolId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Never retain private rows across a scope change.
  useEffect(() => { setTrips([]); setTotal(0); setLoading(true); }, [scope]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Only query changes show loading; background polling stays silent.
  useEffect(() => { setLoading(true); }, [scope, selectedStatus, fromDate, toDate, page, limit]);
  const identity = JSON.stringify([scope, selectedStatus, fromDate, toDate, page, limit, refreshKey]);
  useVisibleRefresh(identity, fetchTrips);

  // Reset page when filters change
  const handleFilterChange = () => {
    setPage(1);
  };

  // Helper: Format day of week and date in Vietnamese
  const formatServiceDateLabel = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dt = new Date(Date.UTC(y, m, d, 12, 0, 0));
      const dayIndex = dt.getUTCDay();
      const viDays = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      return {
        dayLabel: viDays[dayIndex],
        dateFormatted: `${String(d).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`,
      };
    } catch {
      return { dayLabel: '', dateFormatted: dateStr };
    }
  };

  // Compute rowSpan for dates within the current page (strictly per page)
  const dateRowSpans = useMemo(() => {
    const map = new Map<number, number>();
    let i = 0;
    while (i < trips.length) {
      let count = 1;
      while (i + count < trips.length && trips[i + count].serviceDate === trips[i].serviceDate) {
        count++;
      }
      map.set(i, count);
      i += count;
    }
    return map;
  }, [trips]);

  const renderStatusBadge = (trip: TripItem) => {
    if (trip.isVirtual || (trip.status as string) === 'NOT_CREATED') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          Chưa tạo (Dự kiến)
        </span>
      );
    }
    switch (trip.status) {
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Lập lịch
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
            Đang chạy
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Hoàn thành
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Hủy
          </span>
        );
      default:
        return <span>{trip.status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Từ:</span>
            <input
              type="date"
              value={fromDate}
              min={contractBounds.start}
              max={contractBounds.end}
              onChange={(e) => {
                setFromDate(e.target.value);
                handleFilterChange();
              }}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#FFCB56]"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Đến:</span>
            <input
              type="date"
              value={toDate}
              min={contractBounds.start}
              max={contractBounds.end}
              onChange={(e) => {
                setToDate(e.target.value);
                handleFilterChange();
              }}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#FFCB56]"
            />
          </div>

          {/* School filter (System Admin only and not on School Detail) */}
          {!fixedSchoolId && isSystemAdmin && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Trường:</span>
              <SchoolSelectFilter
                value={selectedSchoolId}
                onChange={(schoolId) => {
                  setSelectedSchoolId(schoolId);
                  handleFilterChange();
                }}
                allowAll={true}
                allLabel="Tất cả trường"
                className="w-48"
              />
            </div>
          )}

          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Trạng thái:</span>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                handleFilterChange();
              }}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#FFCB56] cursor-pointer"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="SCHEDULED">Lập lịch</option>
              <option value="IN_PROGRESS">Đang chạy</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="CANCELLED">Hủy</option>
              <option value="NOT_CREATED">Chưa tạo (Dự kiến)</option>
            </select>
          </div>

          {contractBounds.start && contractBounds.end && (
            <span className="text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60 font-medium">
              Hợp đồng: {contractBounds.start} – {contractBounds.end}
            </span>
          )}
        </div>

        {/* Action: Manual Generation (System Admin only) */}
        {isSystemAdmin && onOpenManualGenerate && (
          <button
            onClick={onOpenManualGenerate}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-900 bg-[#FFCB56] hover:bg-[#f5c042] transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <BusIcon className="w-4 h-4 text-slate-900" />
            <span>Sinh chuyến thủ công</span>
          </button>
        )}
      </div>

      {/* Main Trips Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-32">Thứ / Ngày</th>
                <th className="py-3 px-4">Tuyến xe</th>
                <th className="py-3 px-4">Trường học</th>
                <th className="py-3 px-4">Chiều</th>
                <th className="py-3 px-4 text-center">Khung giờ</th>
                <th className="py-3 px-4">Xe phân công</th>
                <th className="py-3 px-4">Tài xế</th>
                <th className="py-3 px-4">Giáo viên phụ xe</th>
                <th className="py-3 px-4 text-center">Học sinh</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400">
                    <SpinnerIcon className="w-6 h-6 animate-spin text-[#FFCB56] mx-auto mb-2" />
                    <span>Đang tải danh sách chuyến xe...</span>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-rose-500">
                    <AlertIcon className="w-6 h-6 mx-auto mb-2 text-rose-500" />
                    <span>{error}</span>
                  </td>
                </tr>
              ) : trips.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400">
                    <BusIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">Không tìm thấy chuyến xe nào</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Thử thay đổi khoảng ngày lọc hoặc sinh chuyến xe mới cho các phương án ACTIVE
                    </p>
                  </td>
                </tr>
              ) : (
                trips.map((trip, idx) => {
                  const span = dateRowSpans.get(idx);
                  const isFirstOfDay = span !== undefined;
                  const { dayLabel, dateFormatted } = formatServiceDateLabel(trip.serviceDate);

                  return (
                    <tr
                      key={trip.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        trip.isVirtual ? 'bg-slate-50/20' : ''
                      }`}
                    >
                      {/* Cột Thứ / Ngày có rowSpan theo ngày trong trang hiện tại */}
                      {isFirstOfDay && (
                        <td
                          rowSpan={span}
                          className="py-3 px-4 font-bold text-slate-800 bg-slate-50/40 border-r border-slate-100 align-top"
                        >
                          <div className="sticky top-0">
                            <span className="text-blue-700 font-extrabold block text-xs">
                              {dayLabel}
                            </span>
                            <span className="text-slate-600 text-xs font-semibold">
                              {dateFormatted}
                            </span>
                          </div>
                        </td>
                      )}

                      <td className="py-3 px-4 font-semibold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <RouteIcon className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="font-medium">{trip.routeName}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600 max-w-[140px] truncate">
                        {trip.schoolName}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                            trip.direction === 'TO_SCHOOL'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {trip.direction === 'TO_SCHOOL' ? 'Chiều đi' : 'Chiều về'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-800 whitespace-nowrap">
                        {trip.scheduledStartTime} – {trip.scheduledEndTime}
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-800">
                        {trip.vehiclePlate ? (
                          <span>{trip.vehiclePlate}</span>
                        ) : (
                          <span className="text-amber-600 italic">Chờ gán</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        {trip.driverName ? (
                          <span>{trip.driverName}</span>
                        ) : (
                          <span className="text-rose-600 italic">Chờ gán</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        {trip.busAttendantName ? (
                          <span>{trip.busAttendantName}</span>
                        ) : (
                          <span className="text-rose-600 italic">Chờ gán</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        {trip.studentCount}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">{renderStatusBadge(trip)}</td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {!trip.isVirtual ? (
                          <Link
                            href={`/admin/trips/${trip.id}`}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-[#FFCB56] hover:text-slate-900 transition-colors"
                          >
                            Chi tiết
                          </Link>
                        ) : (
                          <span
                            title="Chuyến này chưa được tạo trong cơ sở dữ liệu"
                            className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium text-slate-400 bg-slate-50 cursor-not-allowed"
                          >
                            Chưa tạo
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <PaginationControl
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={(p) => setPage(p)}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
          loading={loading}
        />
      </div>
    </div>
  );
}
