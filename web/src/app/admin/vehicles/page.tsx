'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { apiClient } from '@/lib/api-client';
import { Vehicle } from '@/lib/types';
import { AddVehicleModal } from '@/components/admin/vehicles/add-vehicle-modal';
import { PaginationControl } from '@/components/admin/common/pagination-control';
import {
  VehicleIcon,
  SpinnerIcon,
  SearchIcon,
  CheckIcon,
  AlertIcon,
} from '@/components/icons';

export default function VehiclesPage() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 300);
  };

  const fetchVehicles = useCallback(async () => {
    if (!user || user.role !== 'SYSTEM_ADMIN') return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await apiClient.listVehicles({
        page,
        limit,
        search: debouncedSearch,
      });
      setVehicles(data.items || []);
      setTotalItems(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể tải danh sách phương tiện');
    } finally {
      setIsLoading(false);
    }
  }, [user, page, limit, debouncedSearch]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  if (!user || user.role !== 'SYSTEM_ADMIN') {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <h2 className="text-base font-bold text-red-600 mb-1">Truy cập bị từ chối</h2>
        <p className="text-xs text-slate-500">Chỉ Quản trị viên hệ thống mới có quyền quản lý phương tiện.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1E293B]">
            Phương tiện vận tải
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Quản lý đội xe đưa đón học sinh và năng lực chuyên chở
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFCB56] hover:bg-amber-400 text-sm font-bold text-[#1E293B] transition-colors cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <span>+ Thêm phương tiện</span>
        </button>
      </div>

      {/* Success / Error Feedback */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckIcon className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertIcon className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-600 hover:text-red-800 text-xs font-semibold cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Search Bar & Total */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Tìm theo hãng xe, biển số..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FFCB56]"
          />
          <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="text-xs text-slate-500 font-medium self-end sm:self-auto">
          Tổng số phương tiện: <strong className="text-slate-800">{totalItems}</strong>
        </div>
      </div>

      {/* Vehicle Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Hãng xe</th>
                <th className="py-3.5 px-4">Biển số</th>
                <th className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5" title="Số lượng ghế khả dụng để chở học sinh, không gồm ghế tài xế và nhân sự">
                    <span>Số ghế học sinh</span>
                    <span className="cursor-help text-amber-600 text-[11px] bg-amber-100 rounded-full w-4 h-4 inline-flex items-center justify-center font-bold">
                      ℹ
                    </span>
                  </div>
                </th>
                <th className="py-3.5 px-4">Màu sắc</th>
                <th className="py-3.5 px-4">Ngày đăng ký</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <SpinnerIcon className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                    <span className="text-xs">Đang tải dữ liệu phương tiện...</span>
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <VehicleIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-600">Không tìm thấy phương tiện nào</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {debouncedSearch ? 'Thử tìm kiếm với từ khóa khác' : 'Nhấn nút "Thêm phương tiện" để bắt đầu'}
                    </p>
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {v.brand}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                        {v.licensePlate}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {v.seatCount} chỗ học sinh
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {v.color}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {new Date(v.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <PaginationControl
          page={page}
          totalPages={totalPages}
          total={totalItems}
          limit={limit}
          loading={isLoading}
          onPageChange={(newPage) => setPage(newPage)}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
        />
      </div>

      {/* Add Vehicle Modal */}
      <AddVehicleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setSuccessMessage('Thêm phương tiện mới thành công');
          fetchVehicles();
        }}
      />
    </div>
  );
}
