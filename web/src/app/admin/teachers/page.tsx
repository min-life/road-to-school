'use client';

import { toast } from '@/stores/toast-store';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ContextLink } from '@/components/admin/common/context-navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { SchoolAdminGuard } from '@/components/admin/school-admin-guard';
import { apiClient } from '@/lib/api-client';
import type { SchoolEmployeeItem } from '@/lib/types';
import {
  PlusIcon,
  SearchIcon,
  SpinnerIcon,
  AlertIcon,
  TeacherIcon,
  PhoneIcon,
} from '@/components/icons';
import { PaginationControl } from '@/components/admin/common/pagination-control';
import { AddTeacherModal } from '@/components/admin/teachers/add-teacher-modal';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { FilterToolbar, FilterField } from '@/components/ui/filter-toolbar';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

function TeachersPageContent() {
  const { user } = useAuth();
  const schoolId = user?.schoolId;

  const [teachers, setTeachers] = useState<SchoolEmployeeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);


  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const latestRequestRef = useRef(0);

  const fetchTeachers = useCallback(async () => {
    if (!schoolId) return;

    const requestId = ++latestRequestRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const params: Parameters<typeof apiClient.getSchoolEmployees>[1] = {
        page,
        limit,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      const res = await apiClient.getSchoolEmployees(schoolId, params);

      if (requestId === latestRequestRef.current) {
        setTeachers(res.items);
        setTotal(res.meta.totalItems);
        setTotalPages(res.meta.totalPages);
      }
    } catch (err: any) {
      if (requestId === latestRequestRef.current) {
        setErrorMessage(err?.message || 'Không thể tải danh sách giáo viên.');
      }
    } finally {
      if (requestId === latestRequestRef.current) {
        setIsLoading(false);
      }
    }
  }, [schoolId, page, limit, search, statusFilter]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as any);
    setPage(1);
  };

  const handleTeacherAdded = () => {
    toast.success('Đã tạo tài khoản giáo viên thành công.');
    fetchTeachers();

  };

  if (!schoolId) {
    return (
      <div className="p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center max-w-lg mx-auto">
          <AlertIcon className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <h2 className="text-base font-bold text-slate-800">Chưa xác định trường học</h2>
          <p className="text-xs text-slate-600 mt-1">
            Tài khoản quản trị viên của bạn chưa được gán mã trường trong hệ thống.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ui-list-page">
      {/* Toast message */}


      {/* Header */}
      <PageHeader title="Giáo viên" actions={<Button variant="primary" size="default"
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-900 bg-primary hover:bg-amber-400 rounded-xl transition-colors shadow-xs cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Thêm giáo viên</span>
        </Button>} />

      {/* Filters */}
      <FilterToolbar
        hasActiveFilters={Boolean(search || statusFilter !== 'ALL')}
        onReset={() => {
          setSearch('');
          setStatusFilter('ALL');
          setPage(1);
        }}
      >
        <FilterField label="Tìm kiếm" grow icon={<SearchIcon />}>
          <Input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Tìm theo tên, email hoặc số điện thoại giáo viên..."
            className="w-full"
          />
        </FilterField>

        <FilterField label="Trạng thái">
          <Select
            value={statusFilter}
            onChange={handleStatusChange}
            className="w-full"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
          </Select>
        </FilterField>
      </FilterToolbar>

      {/* Error state */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl">
          <AlertIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">{errorMessage}</div>
          <Button
            type="button"
            onClick={fetchTeachers}
            className="text-xs font-semibold text-red-700 hover:text-red-900 underline ml-2"
          >
            Thử lại
          </Button>
        </div>
      )}

      {/* Teachers Table */}
      <Card className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full text-left text-sm text-slate-700" minWidth={1175}>
            <colgroup><col /><col style={{ width: 235 }} /><col style={{ width: 155 }} /><col style={{ width: 165 }} /><col style={{ width: 170 }} /><col style={{ width: 210 }} /></colgroup>
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Họ và tên</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Số điện thoại</th>
                <th className="px-4 py-3 text-center">Vai trò</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && teachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <SpinnerIcon className="w-5 h-5 animate-spin text-amber-500" />
                      <span>Đang tải danh sách giáo viên...</span>
                    </div>
                  </td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <TeacherIcon className="w-6 h-6" />
                      </div>
                      <p className="font-medium text-slate-800 text-sm">Chưa có giáo viên nào</p>
                      <p className="text-xs text-slate-500">
                        {search || statusFilter !== 'ALL'
                          ? 'Không tìm thấy giáo viên phù hợp với bộ lọc.'
                          : 'Bắt đầu thêm giáo viên vào trường của bạn.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                teachers.map((teacher) => (
                  <tr
                    key={teacher.id}
                    className="hover:bg-amber-50/30 transition-colors group"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <ContextLink
                        href={`/admin/teachers/${teacher.id}`}
                        className="hover:text-amber-700 transition-colors"
                      >
                        {teacher.fullName}
                      </ContextLink>
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-600">
                      {teacher.email || '—'}
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-600">
                      {teacher.phone ? (
                        <div className="inline-flex items-center gap-1.5">
                          <PhoneIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span>{teacher.phone}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <Badge className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        Giáo viên
                      </Badge>
                    </td>

                    <td className="px-4 py-3 text-center">
                      {teacher.isActive ? (
                        <Badge className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Đang hoạt động
                        </Badge>
                      ) : (
                        <Badge className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-300">
                          Ngừng hoạt động
                        </Badge>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <ContextLink
                        href={`/admin/teachers/${teacher.id}`}
                        className="text-xs font-medium text-slate-600 hover:text-amber-700 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        Xem chi tiết
                      </ContextLink>
                    </td>
                  </tr>
                ))
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
          loading={isLoading}
          onPageChange={(newPage) => setPage(newPage)}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
        />
      </Card>

      {/* Add Teacher Modal */}
      <AddTeacherModal
        isOpen={isAddModalOpen}
        schoolId={schoolId}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleTeacherAdded}
      />
    </div>
  );
}

export default function AdminTeachersPage() {
  return (
    <SchoolAdminGuard>
      <TeachersPageContent />
    </SchoolAdminGuard>
  );
}
