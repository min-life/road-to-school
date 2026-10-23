'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import type { SchoolListItem, PaginationMeta } from '@/lib/types';
import {
  PlusIcon,
  SearchIcon,
  SpinnerIcon,
  SchoolIcon,
  AlertIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
} from '@/components/icons';
import { AddSchoolModal } from '@/components/admin/schools/add-school-modal';
import { SchoolStatusDialog } from '@/components/admin/schools/school-status-dialog';

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export default function AdminSchoolsPage() {
  const [schools, setSchools] = useState<SchoolListItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | ''>('');
  const [page, setPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [statusModalSchool, setStatusModalSchool] = useState<SchoolListItem | null>(null);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSchools = useCallback(
    async (targetPage = page, targetSearch = search, targetStatus = statusFilter) => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await apiClient.getSchools({
          page: targetPage,
          limit: 10,
          search: targetSearch || undefined,
          status: targetStatus || undefined,
        });

        setSchools(response.items);
        setMeta(response.meta);
      } catch (err: any) {
        setErrorMessage(
          err?.message ||
            'Không thể tải danh sách trường học. Vui lòng kiểm tra lại kết nối.',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [page, search, statusFilter],
  );

  useEffect(() => {
    fetchSchools(page, search, statusFilter);
  }, [fetchSchools, page, search, statusFilter]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val as any);
    setPage(1);
  };

  const handleAddSuccess = () => {
    setSuccessToast('Đã tạo trường học mới thành công.');
    fetchSchools(1, search, statusFilter);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  const handleStatusSuccess = (newStatus: boolean) => {
    setSuccessToast(
      newStatus
        ? 'Đã kích hoạt lại trường học thành công.'
        : 'Đã chuyển trường học sang trạng thái ngừng hoạt động.',
    );
    fetchSchools(page, search, statusFilter);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  return (
    <div className="space-y-6">
      {/* Toast thông báo */}
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium animate-in fade-in-0 duration-200">
          <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* 6.1 Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1E293B]">
            Trường học
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Quản lý danh sách trường, định vị địa lý VietMap và nhân sự trực thuộc
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFCB56] hover:bg-[#e6b74d] text-[#1E293B] text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-xs"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Thêm trường</span>
          </button>
        </div>
      </div>

      {/* 6.2 Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative min-w-[220px] sm:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Tìm theo tên trường học..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
            <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Status Filter Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertIcon className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchSchools()}
            className="px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 6.3 School Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Tên trường</th>
                <th className="py-3.5 px-4">Địa chỉ</th>
                <th className="py-3.5 px-4">Thời gian hợp đồng</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <SpinnerIcon className="w-4 h-4 animate-spin text-amber-500" />
                      <span>Đang tải danh sách trường học...</span>
                    </div>
                  </td>
                </tr>
              ) : schools.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    <SchoolIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">
                      Chưa có trường học nào
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                      {search || statusFilter
                        ? 'Không tìm thấy trường nào phù hợp với bộ lọc tìm kiếm hiện tại.'
                        : 'Bấm nút "+ Thêm trường" ở góc trên để tạo trường học đầu tiên.'}
                    </p>
                  </td>
                </tr>
              ) : (
                schools.map((school) => (
                  <tr
                    key={school.id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    {/* Tên trường & Ảnh Thumbnail */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-amber-50 border border-slate-200 shrink-0 flex items-center justify-center">
                          {school.imageUrl ? (
                            <img
                              src={school.imageUrl}
                              alt={school.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <SchoolIcon className="w-5 h-5 text-amber-600" />
                          )}
                        </div>
                        <div>
                          <Link
                            href={`/admin/schools/${school.id}`}
                            className="font-bold text-slate-800 hover:text-amber-600 transition-colors cursor-pointer"
                          >
                            {school.name}
                          </Link>
                          {typeof school.employeeCount === 'number' && (
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {school.employeeCount} nhân viên
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Địa chỉ */}
                    <td className="py-3.5 px-4 max-w-xs text-slate-600 truncate">
                      {school.addressText}
                    </td>

                    {/* Thời gian hợp đồng */}
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {formatDate(school.contractStartDate)} – {formatDate(school.contractEndDate)}
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          school.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            school.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        {school.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/admin/schools/${school.id}`}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
                        >
                          Xem chi tiết
                        </Link>
                        <button
                          type="button"
                          onClick={() => setStatusModalSchool(school)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                            school.isActive
                              ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                          }`}
                        >
                          {school.isActive ? 'Ngừng hoạt động' : 'Kích hoạt lại'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 6.4 Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-600">
            <div>
              Hiển thị trang {meta.page} / {meta.totalPages} (Tổng số {meta.totalItems} trường học)
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

      {/* Add School Modal */}
      <AddSchoolModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      {/* Status Confirmation Modal */}
      {statusModalSchool && (
        <SchoolStatusDialog
          isOpen={Boolean(statusModalSchool)}
          schoolId={statusModalSchool.id}
          schoolName={statusModalSchool.name}
          currentIsActive={statusModalSchool.isActive}
          onClose={() => setStatusModalSchool(null)}
          onSuccess={handleStatusSuccess}
        />
      )}
    </div>
  );
}
