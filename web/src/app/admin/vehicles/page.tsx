'use client';

import { toast } from '@/stores/toast-store';

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
  AlertIcon,
} from '@/components/icons';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { FilterToolbar, FilterField } from '@/components/ui/filter-toolbar';
import { Input } from '@/components/ui/input';
import { Table } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

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
      <Card className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <h2 className="text-base font-bold text-red-600 mb-1">Truy cập bị từ chối</h2>
        <p className="text-xs text-slate-500">Chỉ Quản trị viên hệ thống mới có quyền quản lý phương tiện.</p>
      </Card>
    );
  }

  return (
    <div className="ui-list-page">
      {/* Page Header */}
      <PageHeader title="Phương tiện" actions={<Button variant="primary" size="default"
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-amber-400 text-sm font-bold text-foreground transition-colors cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <span>+ Thêm phương tiện</span>
        </Button>} />

      {/* Success / Error Feedback */}


      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertIcon className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <Button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-600 hover:text-red-800 text-xs font-semibold cursor-pointer"
          >
            Đóng
          </Button>
        </div>
      )}

      {/* Search Bar & Total */}
      <FilterToolbar
        hasActiveFilters={Boolean(search)}
        onReset={() => {
          handleSearchChange('');
        }}
      >
        <FilterField label="Tìm kiếm" grow icon={<SearchIcon />}>
          <Input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Tìm theo hãng xe, biển số..."
            className="w-full"
          />
        </FilterField>

<div className="ui-filter-meta">
          Tổng số phương tiện: <strong className="text-slate-800">{totalItems}</strong>
        </div>
      </FilterToolbar>

      {/* Vehicle Table */}
      <Card className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <Table className="w-full text-left text-sm" minWidth={930}>
            <colgroup><col /><col style={{ width: 180 }} /><col style={{ width: 180 }} /><col style={{ width: 150 }} /><col style={{ width: 180 }} /></colgroup>
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
                      <Badge className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                        {v.licensePlate}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {v.seatCount} chỗ học sinh
                      </Badge>
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
          </Table>
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
      </Card>

      {/* Add Vehicle Modal */}
      <AddVehicleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          toast.success('Thêm phương tiện mới thành công');
          fetchVehicles();
        }}
      />
    </div>
  );
}
