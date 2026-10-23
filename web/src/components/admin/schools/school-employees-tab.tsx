'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import type { SchoolEmployeeItem, PaginationMeta } from '@/lib/types';
import {
  SearchIcon,
  PlusIcon,
  SpinnerIcon,
  UsersIcon,
  AlertIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
} from '@/components/icons';
import { CreateSchoolAdminModal } from './create-school-admin-modal';

interface SchoolEmployeesTabProps {
  schoolId: string;
  schoolName: string;
  isSchoolActive: boolean;
}

export function SchoolEmployeesTab({
  schoolId,
  schoolName,
  isSchoolActive,
}: SchoolEmployeesTabProps) {
  const [employees, setEmployees] = useState<SchoolEmployeeItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'SCHOOL_ADMIN' | 'BUS_ATTENDANT' | ''>('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | ''>('');
  const [page, setPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal tạo School Admin
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchEmployees = useCallback(
    async (targetPage = page, targetSearch = search, targetRole = roleFilter, targetStatus = statusFilter) => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await apiClient.getSchoolEmployees(schoolId, {
          page: targetPage,
          limit: 10,
          search: targetSearch || undefined,
          role: targetRole || undefined,
          status: targetStatus || undefined,
        });

        setEmployees(response.items);
        setMeta(response.meta);
      } catch (err: any) {
        setErrorMessage(
          err?.message ||
            'Không thể tải danh sách nhân viên trường. Vui lòng thử lại.',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [schoolId, page, search, roleFilter, statusFilter],
  );

  useEffect(() => {
    fetchEmployees(page, search, roleFilter, statusFilter);
  }, [fetchEmployees, page, search, roleFilter, statusFilter]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };

  const handleRoleChange = (val: string) => {
    setRoleFilter(val as any);
    setPage(1);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val as any);
    setPage(1);
  };

  const handleCreateSuccess = () => {
    setSuccessToast('Tạo tài khoản quản trị trường thành công.');
    fetchEmployees(1, search, roleFilter, statusFilter);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  const formatRoleLabel = (role: string) => {
    switch (role) {
      case 'SCHOOL_ADMIN':
        return 'Quản trị trường';
      case 'BUS_ATTENDANT':
        return 'Giám sát xe';
      default:
        return role;
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast thông báo thành công */}
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
          <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Toolbar: Tìm kiếm, Bộ lọc & Nút Tạo Quản trị trường */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[200px] sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Tìm theo họ tên, email, SĐT..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
            <SearchIcon className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
          >
            <option value="">Tất cả vai trò</option>
            <option value="SCHOOL_ADMIN">Quản trị trường</option>
            <option value="BUS_ATTENDANT">Giám sát xe</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
          </select>
        </div>

        {/* Nút Tạo quản trị trường */}
        <div>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            disabled={!isSchoolActive}
            title={
              !isSchoolActive
                ? 'Không thể tạo quản trị viên khi trường đang ngừng hoạt động'
                : 'Thêm tài khoản quản trị trường'
            }
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs ${
              isSchoolActive
                ? 'bg-[#FFCB56] hover:bg-[#e6b74d] text-[#1E293B]'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            <PlusIcon className="w-4 h-4" />
            <span>Tạo quản trị trường</span>
          </button>
        </div>
      </div>

      {!isSchoolActive && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          Trường đang ngừng hoạt động. Danh sách nhân viên vẫn được hiển thị nhưng chức năng tạo tài khoản quản trị trường mới tạm thời bị khóa.
        </div>
      )}

      {/* Error state */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertIcon className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchEmployees()}
            className="px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Họ và tên</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Số điện thoại</th>
                <th className="py-3 px-4">Vai trò</th>
                <th className="py-3 px-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <SpinnerIcon className="w-4 h-4 animate-spin text-amber-500" />
                      <span>Đang tải danh sách nhân viên...</span>
                    </div>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <UsersIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-600">
                      Chưa có nhân viên nào phù hợp
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {search || roleFilter || statusFilter
                        ? 'Thử thay đổi từ khóa hoặc bộ lọc tìm kiếm'
                        : 'Bấm "+ Tạo quản trị trường" để thêm nhân sự đầu tiên'}
                    </p>
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {emp.fullName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {emp.email || <span className="text-slate-300 italic">—</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {emp.phone || <span className="text-slate-300 italic">—</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                        {formatRoleLabel(emp.role)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          emp.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            emp.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        {emp.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-600">
            <div>
              Hiển thị trang {meta.page} / {meta.totalPages} (Tổng số {meta.totalItems} nhân viên)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                aria-label="Trang trước"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages || isLoading}
                className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                aria-label="Trang sau"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal tạo School Admin */}
      <CreateSchoolAdminModal
        isOpen={isCreateModalOpen}
        schoolId={schoolId}
        schoolName={schoolName}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
