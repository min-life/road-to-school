'use client';

import { SchoolSelectFilter } from '@/components/admin/common/school-select-filter';
import Link from 'next/link';
import { useRouteQuery } from '@/hooks/use-route-query';


import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { apiClient, ApiError } from '@/lib/api-client';
import {
  LeaveNoticeItem,
  LeaveNoticeKind,
  LeaveNoticeStatus,
  RouteDirection,
} from '@/lib/types';
import {
  CalendarIcon,
  SpinnerIcon,
  AlertIcon,
  DriverIcon,
  StudentIcon,
  TeacherIcon,
} from '@/components/icons';
import { PaginationControl } from '@/components/admin/common/pagination-control';
import { ReplacementModal } from '@/components/admin/leave-notices/replacement-modal';
import { CancelTripModal } from '@/components/admin/leave-notices/cancel-trip-modal';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { FilterToolbar } from '@/components/ui/filter-toolbar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';

export default function AdminLeaveNoticesPage() {
  const { user } = useAuth();
  const currentUserRole = user?.role || null;
  const isSystemAdmin = currentUserRole === 'SYSTEM_ADMIN';
  const isSchoolAdmin = currentUserRole === 'SCHOOL_ADMIN';

  // Tabs: DRIVER, STUDENT, BUS_ATTENDANT (teachers)
  const defaultTab: LeaveNoticeKind = isSystemAdmin ? 'DRIVER' : 'BUS_ATTENDANT';
  const [activeTab, setActiveTab] = useState<LeaveNoticeKind>(defaultTab);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [directionFilter, setDirectionFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);

  const [schoolFilter, setSchoolFilter] = useState('');
  const [actionableOnly, setActionableOnly] = useState(false);
  const [focusNotice, setFocusNotice] = useState<LeaveNoticeItem | null>(null);
  // Data
  const [notices, setNotices] = useState<LeaveNoticeItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [selectedNoticeForReplacement, setSelectedNoticeForReplacement] =
    useState<LeaveNoticeItem | null>(null);
  const [selectedNoticeForCancelTrip, setSelectedNoticeForCancelTrip] =
    useState<LeaveNoticeItem | null>(null);

  useRouteQuery(String(user?.id), (query, isCurrent) => {
    const kind = query.get('kind'), status = query.get('status');
    setActiveTab(kind && ['DRIVER','BUS_ATTENDANT','STUDENT'].includes(kind) ? kind as LeaveNoticeKind : isSystemAdmin ? 'DRIVER' : 'BUS_ATTENDANT');
    setStatusFilter(status && ['PENDING_REPLACEMENT','RECORDED','REPLACED','WITHDRAWN','TRIP_CANCELLED'].includes(status) ? status : 'ALL');
    setSchoolFilter(isSystemAdmin ? query.get('schoolId') || '' : ''); setActionableOnly(query.get('actionable') === 'true'); setPage(1);
    const id = query.get('noticeId'); if (id) void apiClient.getLeaveNoticeDetail(id).then(item => {
      if (!isCurrent()) return; setActiveTab(item.kind);
      if (item.status === 'PENDING_REPLACEMENT' && (isSystemAdmin ? item.kind === 'DRIVER' : item.kind === 'BUS_ATTENDANT')) setSelectedNoticeForReplacement(item);
      else setFocusNotice(item);
    }).catch(cause => { if (isCurrent()) setError(cause instanceof Error ? cause.message : 'Không thể mở báo nghỉ'); });
  });
  const fetchNotices = useCallback(async () => {
    if (!currentUserRole) return;
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.listLeaveNotices({
        schoolId: isSystemAdmin ? schoolFilter || undefined : undefined,
        actionable: actionableOnly || undefined,
        kind: activeTab,
        status: statusFilter !== 'ALL' ? (statusFilter as LeaveNoticeStatus) : undefined,
        serviceDate: dateFilter || undefined,
        direction: directionFilter !== 'ALL' ? (directionFilter as RouteDirection) : undefined,
        page,
        limit,
      });

      setNotices(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Không thể tải danh sách báo nghỉ';
      setError(msg);
      setNotices([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [currentUserRole, activeTab, statusFilter, dateFilter, directionFilter, page, limit, schoolFilter, actionableOnly, isSystemAdmin]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  // Tab switching resets status and page
  const handleTabChange = (kind: LeaveNoticeKind) => {
    setActiveTab(kind);
    setStatusFilter('ALL');
    setPage(1);
  };

  const renderStatusBadge = (notice: LeaveNoticeItem) => {
    if (notice.kind === 'STUDENT') {
      if (notice.status === 'RECORDED') {
        return (
          <Badge className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Đã nhận
          </Badge>
        );
      }
      if (notice.status === 'WITHDRAWN') {
        return (
          <Badge className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            Đã hủy
          </Badge>
        );
      }
    }

    switch (notice.status) {
      case 'PENDING_REPLACEMENT':
        return (
          <Badge className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Chờ phân công
          </Badge>
        );
      case 'RECORDED':
        return (
          <Badge className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Đã ghi nhận
          </Badge>
        );
      case 'REPLACED':
        return (
          <Badge className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Đã bố trí
          </Badge>
        );
      case 'WITHDRAWN':
        return (
          <Badge className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            Đã hủy
          </Badge>
        );
      case 'TRIP_CANCELLED':
        return (
          <Badge className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Chuyến đã hủy
          </Badge>
        );
      default:
        return (
          <Badge className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {notice.status}
          </Badge>
        );
    }
  };

  const canProcessNotice = (item: LeaveNoticeItem) => {
    if (item.canAssignReplacement !== undefined) {
      return item.canAssignReplacement;
    }
    if (item.status !== 'PENDING_REPLACEMENT') return false;
    if (isSystemAdmin && item.kind === 'DRIVER') return true;
    if (isSchoolAdmin && item.kind === 'BUS_ATTENDANT') return true;
    return false;
  };

  const isStudentTab = activeTab === 'STUDENT';
  const hasActiveFilters = statusFilter !== 'ALL' || Boolean(dateFilter) || directionFilter !== 'ALL';

  return (
    <div className="space-y-4">
      {/* Header */}
      <PageHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-slate-700" />
            <span>Báo nghỉ</span>
          </h1>
        </div>
      </PageHeader>

      {/* Role Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {isSystemAdmin && (
          <Button
            type="button"
            onClick={() => handleTabChange('DRIVER')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'DRIVER'
                ? 'border-primary text-foreground'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DriverIcon className="w-4 h-4" />
            <span>Tài xế</span>
          </Button>
        )}

        <Button
          type="button"
          onClick={() => handleTabChange('STUDENT')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'STUDENT'
              ? 'border-primary text-foreground'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <StudentIcon className="w-4 h-4" />
          <span>Học sinh</span>
        </Button>

        <Button
          type="button"
          onClick={() => handleTabChange('BUS_ATTENDANT')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'BUS_ATTENDANT'
              ? 'border-primary text-foreground'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TeacherIcon className="w-4 h-4" />
          <span>Giáo viên</span>
        </Button>
      </div>

      {focusNotice && <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm"><div className="flex justify-between"><strong>Chi tiết báo nghỉ</strong><button type="button" onClick={() => setFocusNotice(null)}>Đóng</button></div><p className="my-2">{focusNotice.kind === 'STUDENT' ? 'Học sinh' : focusNotice.kind === 'DRIVER' ? 'Tài xế' : 'Giáo viên'} · {focusNotice.status}</p><Link className="font-semibold underline" href={'/admin/trips/' + focusNotice.tripId}>Xem chuyến xe</Link></div>}
      {isSystemAdmin && <SchoolSelectFilter value={schoolFilter} onChange={id => { setSchoolFilter(id); setPage(1); }} />}
      {actionableOnly && <button type="button" onClick={() => setActionableOnly(false)} className="text-xs font-semibold text-amber-800">Chỉ báo nghỉ cần bố trí ×</button>}
      {/* Filter Toolbar */}
      <FilterToolbar className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Trạng thái:</span>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
            >
              {isStudentTab ? (
                <>
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="RECORDED">Đã nhận</option>
                  <option value="WITHDRAWN">Đã hủy</option>
                </>
              ) : (
                <>
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="PENDING_REPLACEMENT">Chờ phân công</option>
                  <option value="RECORDED">Đã ghi nhận</option>
                  <option value="REPLACED">Đã bố trí</option>
                  <option value="WITHDRAWN">Đã hủy</option>
                  <option value="TRIP_CANCELLED">Chuyến đã hủy</option>
                </>
              )}
            </Select>
          </div>

          {/* Datepicker */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Ngày:</span>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Direction Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Chiều:</span>
            <Select
              value={directionFilter}
              onChange={(e) => {
                setDirectionFilter(e.target.value);
                setPage(1);
              }}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
            >
              <option value="ALL">Tất cả chiều</option>
              <option value="TO_SCHOOL">Chiều đi (đến trường)</option>
              <option value="TO_PARKING">Chiều về (về nhà)</option>
            </Select>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <Button variant="outline" size="sm"
              type="button"
              onClick={() => {
                setStatusFilter('ALL');
                setDateFilter('');
                setDirectionFilter('ALL');
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors font-semibold text-xs cursor-pointer"
            >
              Đặt lại
            </Button>
          )}
        </div>
      </FilterToolbar>

      {/* Main Table Card */}
      <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {error && (
          <div className="m-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertIcon className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table className="w-full text-left text-xs">
            <thead className="bg-background border-b border-slate-200/80 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th scope="col" className="px-5 py-3.5">
                  {isStudentTab ? 'Học sinh / Người báo' : 'Đối tượng / Người báo'}
                </th>
                <th scope="col" className="px-5 py-3.5">
                  Chuyến xe
                </th>
                <th scope="col" className="px-5 py-3.5">
                  Ngày & Giờ
                </th>
                <th scope="col" className="px-5 py-3.5">
                  Trạng thái
                </th>
                {!isStudentTab && (
                  <>
                    <th scope="col" className="px-5 py-3.5">
                      Bố trí thay thế
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-right">
                      Thao tác
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={isStudentTab ? 4 : 6} className="px-5 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <SpinnerIcon className="w-6 h-6 animate-spin text-primary" />
                      <span>Đang tải danh sách báo nghỉ...</span>
                    </div>
                  </td>
                </tr>
              ) : notices.length === 0 ? (
                <tr>
                  <td colSpan={isStudentTab ? 4 : 6} className="px-5 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <p className="font-semibold text-slate-600">Không có dữ liệu báo nghỉ</p>
                      <p className="text-[11px] text-slate-400">
                        Không có đơn báo nghỉ nào phù hợp với bộ lọc hiện tại.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                notices.map((notice) => {
                  const isPending = notice.status === 'PENDING_REPLACEMENT';
                  const canProcess = canProcessNotice(notice);

                  const subjectName =
                    notice.kind === 'STUDENT'
                      ? notice.studentName || 'Học sinh'
                      : notice.reportedByName || 'Nhân sự';

                  const reporterInfo =
                    notice.kind === 'STUDENT'
                      ? `Phụ huynh: ${notice.reportedByName || 'N/A'}`
                      : 'Tự báo nghỉ';

                  const directionText =
                    notice.direction === 'TO_SCHOOL'
                      ? 'Chiều đi'
                      : notice.direction === 'TO_PARKING'
                      ? 'Chiều về'
                      : '';

                  return (
                    <tr
                      key={notice.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isPending ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900">{subjectName}</div>
                        <div className="text-[11px] text-slate-500">{reporterInfo}</div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-800">
                          {notice.routeName || 'Tuyến'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {notice.tripId?.slice(0, 8)} · {directionText}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          {notice.serviceDate || 'N/A'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {notice.scheduledStartTime
                            ? `${notice.scheduledStartTime.slice(0, 5)} - ${
                                notice.scheduledEndTime?.slice(0, 5) || ''
                              }`
                            : 'Theo lịch'}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {renderStatusBadge(notice)}
                      </td>

                      {!isStudentTab && (
                        <>
                          <td className="px-5 py-3.5">
                            {notice.replacementUserName ? (
                              <div>
                                <div className="font-medium text-blue-900">
                                  {notice.replacementUserName}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  Bởi {notice.processedByName || 'Quản trị'}
                                </div>
                              </div>
                            ) : isPending ? (
                              <span className="text-[11px] text-amber-700 italic">
                                Chưa chỉ định
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            {canProcess ? (
                              <Button variant="primary" size="sm"
                                type="button"
                                onClick={() => setSelectedNoticeForReplacement(notice)}
                                className="px-3 py-1.5 text-xs font-bold bg-primary hover:bg-[#f5c042] text-foreground rounded-xl shadow-xs transition-all cursor-pointer"
                              >
                                Xử lý thay thế
                              </Button>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>

        {/* Pagination */}
        <PaginationControl
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          loading={loading}
          onPageChange={(p) => setPage(p)}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
        />
      </Card>

      {/* Replacement Modal */}
      <ReplacementModal
        isOpen={!!selectedNoticeForReplacement}
        notice={selectedNoticeForReplacement}
        onClose={() => setSelectedNoticeForReplacement(null)}
        onSuccess={() => {
          fetchNotices();
        }}
        onOpenCancelTrip={(notice) => {
          setSelectedNoticeForReplacement(null);
          setSelectedNoticeForCancelTrip(notice);
        }}
      />

      {/* Cancel Trip Modal */}
      <CancelTripModal
        isOpen={!!selectedNoticeForCancelTrip}
        notice={selectedNoticeForCancelTrip}
        onClose={() => setSelectedNoticeForCancelTrip(null)}
        onSuccess={() => {
          fetchNotices();
        }}
      />
    </div>
  );
}
