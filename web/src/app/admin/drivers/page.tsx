'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { AdminSchoolsGuard } from '@/components/admin/schools/admin-schools-guard';
import { apiClient } from '@/lib/api-client';
import type { DriverItem } from '@/lib/types';
import {
  PlusIcon,
  SearchIcon,
  SpinnerIcon,
  AlertIcon,
  CheckIcon,
  DriverIcon,
  PhoneIcon,
} from '@/components/icons';
import { PaginationControl } from '@/components/admin/common/pagination-control';
import { AddDriverModal } from '@/components/admin/drivers/add-driver-modal';

function DriversPageContent() {
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const latestRequestRef = useRef(0);

  const fetchDrivers = useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const params: Parameters<typeof apiClient.getDrivers>[0] = {
        page,
        limit,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      const res = await apiClient.getDrivers(params);

      if (requestId === latestRequestRef.current) {
        setDrivers(res.items);
        setTotal(res.meta.totalItems);
        setTotalPages(res.meta.totalPages);
      }
    } catch (err: any) {
      if (requestId === latestRequestRef.current) {
        setErrorMessage(err?.message || 'Không thể tải danh sách tài xế.');
      }
    } finally {
      if (requestId === latestRequestRef.current) {
        setIsLoading(false);
      }
    }
  }, [page, limit, search, statusFilter]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as any);
    setPage(1);
  };

  const handleDriverAdded = () => {
    setSuccessToast('Đã tạo tài khoản tài xế mới thành công.');
    fetchDrivers();
    setTimeout(() => setSuccessToast(null), 3000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast message */}
      {successToast && (
        <div className="flex items-center gap-2 p-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg animate-in fade-in duration-200">
          <CheckIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <DriverIcon className="w-7 h-7 text-amber-500" />
            Quản lý tài xế
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Danh sách tài xế thuộc đội xe hệ thống, thông tin liên hệ và trạng thái hoạt động.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-900 bg-[#FFCB56] hover:bg-amber-400 rounded-xl transition-colors shadow-xs cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Thêm tài xế</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Tìm theo tên, email hoặc số điện thoại tài xế..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white text-slate-800"
          />
          <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            Trạng thái:
          </label>
          <select
            value={statusFilter}
            onChange={handleStatusChange}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-700 cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl">
          <AlertIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">{errorMessage}</div>
          <button
            type="button"
            onClick={fetchDrivers}
            className="text-xs font-semibold text-red-700 hover:text-red-900 underline ml-2"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Drivers Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
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
              {isLoading && drivers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <SpinnerIcon className="w-5 h-5 animate-spin text-amber-500" />
                      <span>Đang tải danh sách tài xế...</span>
                    </div>
                  </td>
                </tr>
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <DriverIcon className="w-6 h-6" />
                      </div>
                      <p className="font-medium text-slate-800 text-sm">Chưa có tài xế nào</p>
                      <p className="text-xs text-slate-500">
                        {search || statusFilter !== 'ALL'
                          ? 'Không tìm thấy tài xế phù hợp với bộ lọc.'
                          : 'Bắt đầu thêm tài xế vào đội xe hệ thống.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                drivers.map((driver) => (
                  <tr
                    key={driver.id}
                    className="hover:bg-amber-50/30 transition-colors group"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <Link
                        href={`/admin/drivers/${driver.id}`}
                        className="hover:text-amber-700 transition-colors"
                      >
                        {driver.fullName}
                      </Link>
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-600">
                      {driver.email || '—'}
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-600">
                      {driver.phone ? (
                        <div className="inline-flex items-center gap-1.5">
                          <PhoneIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span>{driver.phone}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        Tài xế
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      {driver.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Đang hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-300">
                          Ngừng hoạt động
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/drivers/${driver.id}`}
                        className="text-xs font-medium text-slate-600 hover:text-amber-700 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        Xem chi tiết
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
      </div>

      {/* Add Driver Modal */}
      <AddDriverModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleDriverAdded}
      />
    </div>
  );
}

export default function AdminDriversPage() {
  return (
    <AdminSchoolsGuard>
      <DriversPageContent />
    </AdminSchoolsGuard>
  );
}
