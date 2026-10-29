'use client';
import { FilterToolbar, FilterField } from '@/components/ui/filter-toolbar';

import { useRouteQuery } from '@/hooks/use-route-query';


import React, { useState, useEffect, useCallback } from 'react';
import { ContextLink } from '@/components/admin/common/context-navigation';
import { apiClient } from '@/lib/api-client';
import { RoutePlanItem, RoutePlanStatus, SchoolListItem, Role } from '@/lib/types';
import {
  RouteIcon,
  PlusIcon,
  SearchIcon,
  SpinnerIcon,
  ChevronRightIcon,
  InfoIcon,
} from '@/components/icons';
import { SchoolSelectModal } from '@/components/admin/routes/school-select-modal';
import { PaginationControl } from '@/components/admin/common/pagination-control';
import { SchoolSelectFilter } from '@/components/admin/common/school-select-filter';
import { authStorage } from '@/lib/auth-storage';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function RoutePlansPage() {
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);

  // Data states
  const [plans, setPlans] = useState<RoutePlanItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schools, setSchools] = useState<SchoolListItem[]>([]);

  // Filter states
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useRouteQuery(String(currentUserRole), query => {
    setSelectedSchoolId(query.get('schoolId') || '');
    const status = query.get('status'); setSelectedStatus(status && ['DRAFT','ACTIVE','CANCELLED','EXPIRED'].includes(status) ? status : ''); setPage(1);
  });
  // Modals
  const [isSelectSchoolOpen, setIsSelectSchoolOpen] = useState(false);

  // Get current user role
  useEffect(() => {
    const user = authStorage.getUser();
    if (user) {
      setCurrentUserRole(user.role);
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch active schools for filter dropdown (if SYSTEM_ADMIN)
  useEffect(() => {
    async function loadSchools() {
      try {
        const res = await apiClient.getSchools({ limit: 100 });
        setSchools(res.items || []);
      } catch {
        // non-blocking
      }
    }
    if (currentUserRole === 'SYSTEM_ADMIN') {
      loadSchools();
    }
  }, [currentUserRole]);

  // Fetch RoutePlans
  const fetchRoutePlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.listRoutePlans({
        search: debouncedSearch.trim() || undefined,
        schoolId: selectedSchoolId || undefined,
        status: selectedStatus || undefined,
        page,
        limit,
      });
      setPlans(res.items || []);
      setTotalItems(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách phương án tuyến. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedSchoolId, selectedStatus, page, limit]);

  useEffect(() => {
    fetchRoutePlans();
  }, [fetchRoutePlans]);

  const isSystemAdmin = currentUserRole === 'SYSTEM_ADMIN';

  const formatDateTime = (isoDate: string) => {
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoDate;
    }
  };

  const startIndex = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, totalItems);

  return (
    <div className="ui-list-page">
      {/* Top Banner Notice: RoutePlan Lifecycle Rule */}
      <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3">
        <InfoIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <strong className="font-semibold text-amber-950">Nguyên tắc quản lý Phương án tuyến:</strong>{' '}
          Phương án tuyến (RoutePlan) là tập hợp toàn bộ các tuyến đi và về được tối ưu đồng thời cho trường học.
          Chỉ có phương án sở hữu trạng thái vòng đời (Bản nháp / Đã hủy). Không thể hủy hoặc kích hoạt riêng lẻ từng tuyến.
        </div>
      </div>

      {/* Header */}
      <PageHeader title="Phương án tuyến" actions={isSystemAdmin && (
          <Button variant="primary" size="default"
            onClick={() => setIsSelectSchoolOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-[#e6b74d] text-foreground font-bold text-sm shadow-xs transition-all cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Thêm phương án</span>
          </Button>
        )} />

      {/* Filters Bar */}
      <FilterToolbar
        hasActiveFilters={Boolean(search || selectedSchoolId || selectedStatus)}
        onReset={() => {
          setSearch('');
          setSelectedSchoolId('');
          setSelectedStatus('');
          setPage(1);
        }}
      >
        <FilterField label="Tìm kiếm" grow icon={<SearchIcon />}>
          <Input
              type="text"
              placeholder="Tìm theo tên phương án hoặc trường..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
        </FilterField>

        {isSystemAdmin && (<FilterField label="Trường học">
          <SchoolSelectFilter
                value={selectedSchoolId}
                onChange={(schoolId) => {
                  setSelectedSchoolId(schoolId);
                  setPage(1);
                }}
                allowAll={true}
                allLabel="Tất cả trường học"
              />
        </FilterField>
        )}
        <FilterField label="Trạng thái">
          <Select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động (ACTIVE)</option>
              <option value="DRAFT">Bản nháp (DRAFT)</option>
              <option value="CANCELLED">Đã hủy (CANCELLED)</option>
              <option value="EXPIRED">Hết hạn hợp đồng (EXPIRED)</option>
            </Select>
        </FilterField>
        <Button type="button" onClick={() => fetchRoutePlans()} className="ui-filter-refresh">Làm mới</Button>
      </FilterToolbar>

      {/* RoutePlans Table */}
      <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {error ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <InfoIcon className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-800">{error}</p>
            <Button
              onClick={() => fetchRoutePlans()}
              className="mt-3 px-4 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
            >
              Thử lại
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full text-left border-collapse" minWidth={1280}>
            <colgroup><col /><col style={{ width: 210 }} /><col style={{ width: 150 }} /><col style={{ width: 100 }} /><col style={{ width: 100 }} /><col style={{ width: 150 }} /><col style={{ width: 150 }} /><col style={{ width: 180 }} /></colgroup>
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Tên phương án</th>
                  <th className="py-3 px-4">Trường học</th>
                  <th className="py-3 px-4">Ngày tạo</th>
                  <th className="py-3 px-4 text-center">Chiều đi</th>
                  <th className="py-3 px-4 text-center">Chiều về</th>
                  <th className="py-3 px-4 text-center">Học sinh dự kiến</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <SpinnerIcon className="w-7 h-7 animate-spin mx-auto text-primary mb-2" />
                      <p className="text-xs">Đang tải danh sách phương án tuyến...</p>
                    </td>
                  </tr>
                ) : plans.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <RouteIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-medium text-slate-600">Chưa có phương án tuyến nào</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {isSystemAdmin
                          ? 'Bấm "Thêm phương án" để thiết lập và chạy tối ưu hóa VietMap VRP'
                          : 'Hiện chưa có phương án tuyến nào được thiết lập cho trường của bạn'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  plans.map((plan) => {
                    const isDraft = plan.status === 'DRAFT';

                    return (
                      <tr key={plan.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          <ContextLink
                            href={`/admin/routes/plans/${plan.id}`}
                            className="hover:text-blue-600 hover:underline flex items-center gap-2"
                          >
                            <RouteIcon className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>{plan.name}</span>
                          </ContextLink>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 text-xs">
                          {plan.schoolName || '—'}
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 text-xs whitespace-nowrap">
                          {formatDateTime(plan.createdAt)}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <Badge className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            {plan.totalOutboundRoutes} tuyến
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <Badge className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/60">
                            {plan.totalReturnRoutes} tuyến
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                          <span className="text-sm text-slate-900">{plan.totalStudents}</span>
                          <span className="block text-[10px] font-normal text-slate-400">
                            {isDraft ? 'HS dự kiến' : 'Học sinh'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {plan.status === 'ACTIVE' ? (
                            <Badge className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ACTIVE
                            </Badge>
                          ) : plan.status === 'DRAFT' ? (
                            <Badge className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              DRAFT
                            </Badge>
                          ) : plan.status === 'EXPIRED' ? (
                            <Badge className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                              EXPIRED
                            </Badge>
                          ) : (
                            <Badge className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              CANCELLED
                            </Badge>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <ContextLink  data-size="sm"
                            href={`/admin/routes/plans/${plan.id}`}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-primary hover:text-slate-900 transition-colors"
                          >
                            Chi tiết
                          </ContextLink>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
        )}

        {/* Pagination Footer */}
        <PaginationControl
          page={page}
          totalPages={totalPages}
          total={totalItems}
          limit={limit}
          onPageChange={(p) => setPage(p)}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
          loading={loading}
        />
      </Card>

      {/* Select School Modal */}
      <SchoolSelectModal
        isOpen={isSelectSchoolOpen}
        onClose={() => setIsSelectSchoolOpen(false)}
      />
    </div>
  );
}
