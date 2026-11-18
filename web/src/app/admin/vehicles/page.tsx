'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { apiClient } from '@/lib/api-client';
import type { Vehicle } from '@/lib/types';
import type { ResourceTarget } from '@/lib/resource-status';
import { ResourceStatusDialog } from '@/components/admin/common/resource-status-dialog';
import { PaginationControl } from '@/components/admin/common/pagination-control';
import { AddVehicleModal } from './_components/add-vehicle-modal';
import { VehicleIotModal } from './_components/vehicle-iot-modal';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FilterToolbar, FilterField } from '@/components/ui/filter-toolbar';
import { VehicleIcon, SpinnerIcon, SearchIcon, AlertIcon } from '@/components/icons';
import { toast } from '@/stores/toast-store';

export default function VehiclesPage() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dialog states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [iotVehicle, setIotVehicle] = useState<Vehicle | null>(null);
  const [statusTarget, setStatusTarget] = useState<ResourceTarget | null>(null);

  const addBtnRef = useRef<HTMLButtonElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequenceRef = useRef(0);

  // Debounce search
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 300);
  };

  const handleClearFilters = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setPage(1);
  };

  const fetchVehicles = useCallback(async () => {
    if (!user || user.role !== 'SYSTEM_ADMIN') return;
    const currentSeq = ++sequenceRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await apiClient.listVehicles({
        page,
        limit,
        search: debouncedSearch.trim() || undefined,
        status: statusFilter,
      });

      if (currentSeq !== sequenceRef.current) return;

      const items = data.items || [];
      const total = data.total || 0;
      const pages = Math.max(1, data.totalPages || 1);

      setVehicles(items);
      setTotalItems(total);
      setTotalPages(pages);

      // Adjust page if total shrank and current page exceeds totalPages
      if (page > pages) {
        setPage(pages);
      }
    } catch (err: unknown) {
      if (currentSeq === sequenceRef.current) {
        setErrorMessage(err instanceof Error ? err.message : 'Không thể tải danh sách phương tiện');
        setVehicles([]);
        setTotalItems(0);
        setTotalPages(1);
      }
    } finally {
      if (currentSeq === sequenceRef.current) {
        setIsLoading(false);
      }
    }
  }, [user, page, limit, debouncedSearch, statusFilter]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    fetchVehicles();
    /* eslint-enable react-hooks/set-state-in-effect */

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [fetchVehicles]);

  if (!user || user.role !== 'SYSTEM_ADMIN') {
    return (
      <Card className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <h2 className="text-base font-bold text-red-600 mb-1">Truy cập bị từ chối</h2>
        <p className="text-xs text-slate-500">Chỉ Quản trị viên hệ thống mới có quyền quản lý phương tiện.</p>
      </Card>
    );
  }

  const hasActiveFilters = Boolean(search || statusFilter !== 'ALL');

  const formatVietnamDate = (isoString?: string) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Ho_Chi_Minh',
    });
  };

  return (
    <div className="ui-list-page space-y-5">
      {/* Page Header */}
      <PageHeader
        title="Phương tiện"
        actions={
          <Button
            ref={addBtnRef}
            variant="primary"
            size="default"
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-amber-400 text-sm font-bold text-foreground transition-colors cursor-pointer shadow-xs"
          >
            <span>+ Thêm phương tiện</span>
          </Button>
        }
      />

      {/* Single Consolidated Card Container */}
      <Card className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-4 p-4">
        {/* Header & Filter Toolbar */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-bold text-slate-800">Danh sách phương tiện</h2>
              <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs font-semibold">
                {totalItems} phương tiện
              </Badge>
            </div>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-xs text-slate-600 hover:text-slate-900 self-start sm:self-auto"
              >
                Xóa bộ lọc
              </Button>
            )}
          </div>

          <FilterToolbar
            hasActiveFilters={hasActiveFilters}
            onReset={handleClearFilters}
          >
            <FilterField label="Tìm kiếm" grow icon={<SearchIcon />}>
              <Input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Tìm theo biển số hoặc hãng xe..."
                className="w-full text-xs"
              />
            </FilterField>

            <FilterField label="Trạng thái">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as typeof statusFilter);
                  setPage(1);
                }}
                className="w-full text-xs"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="INACTIVE">Ngừng hoạt động</option>
              </Select>
            </FilterField>
          </FilterToolbar>
        </div>

        {/* Error state */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between" role="alert">
            <div className="flex items-center gap-2">
              <AlertIcon className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchVehicles}
              className="text-xs"
            >
              Thử lại
            </Button>
          </div>
        )}

        {/* Desktop & Tablet Table (>= 768px) */}
        <div className="hidden md:block overflow-x-auto min-w-0" role="region" aria-label="Bảng danh sách phương tiện">
          <Table minWidth={880}>
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-700 text-xs font-bold">
                <th className="py-3 px-4 text-left">Phương tiện</th>
                <th className="py-3 px-4 text-left">
                  <div className="flex items-center gap-1.5">
                    <span>Ghế học sinh</span>
                    <button
                      type="button"
                      className="cursor-help text-slate-400 hover:text-slate-600 text-xs inline-flex items-center"
                      title="Số lượng ghế khả dụng để chở học sinh, không gồm ghế tài xế và nhân sự"
                      aria-label="Số lượng ghế khả dụng để chở học sinh, không gồm ghế tài xế và nhân sự"
                    >
                      ℹ
                    </button>
                  </div>
                </th>
                <th className="py-3 px-4 text-left">Màu xe</th>
                <th className="py-3 px-4 text-left">Thiết bị IoT</th>
                <th className="py-3 px-4 text-left">Trạng thái</th>
                <th className="py-3 px-4 text-left">Ngày thêm</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <SpinnerIcon className="w-5 h-5 animate-spin text-amber-500" />
                      <span>Đang tải dữ liệu phương tiện...</span>
                    </div>
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <VehicleIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700 text-sm">
                      {hasActiveFilters ? 'Không tìm thấy phương tiện phù hợp' : 'Chưa có phương tiện nào'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {hasActiveFilters
                        ? 'Thử tìm kiếm với từ khóa khác hoặc bấm Xóa bộ lọc.'
                        : 'Nhấn nút "+ Thêm phương tiện" phía trên để bắt đầu thêm xe.'}
                    </p>
                    {hasActiveFilters && (
                      <div className="mt-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleClearFilters}
                          className="text-xs"
                        >
                          Xóa bộ lọc
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* 1. Phương tiện (Biển số in đậm, Hãng xe dòng phụ) */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="font-mono font-bold text-slate-900 text-sm">
                          {v.licensePlate}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          {v.brand}
                        </div>
                      </div>
                    </td>

                    {/* 2. Ghế học sinh (Số trung tính) */}
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 text-sm">
                        {v.seatCount} chỗ
                      </span>
                    </td>

                    {/* 3. Màu xe */}
                    <td className="py-3 px-4">
                      <span className="text-slate-700 font-medium">
                        {v.color}
                      </span>
                    </td>

                    {/* 4. Thiết bị IoT (Đã gán / Chưa gán + mã + thao tác) */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col items-start gap-1">
                        {v.iotDevice ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                                Đã gán
                              </Badge>
                              <span className="font-mono text-[11px] text-slate-600">
                                {v.iotDevice.deviceId}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setIotVehicle(v)}
                              className="text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50 h-auto py-0.5 px-1.5 -ml-1 font-semibold"
                            >
                              Quản lý IoT
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-medium">
                              Chưa gán
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setIotVehicle(v)}
                              className="text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50 h-auto py-0.5 px-1.5 -ml-1 font-semibold block"
                            >
                              Gán thiết bị IoT
                            </Button>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 5. Trạng thái */}
                    <td className="py-3 px-4">
                      <Badge
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                          v.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${v.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{v.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}</span>
                      </Badge>
                    </td>

                    {/* 6. Ngày thêm */}
                    <td className="py-3 px-4 text-slate-500">
                      {formatVietnamDate(v.createdAt)}
                    </td>

                    {/* 7. Thao tác (Nút outline trực tiếp) */}
                    <td className="py-3 px-4 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setStatusTarget({
                            kind: 'vehicle',
                            id: v.id,
                            name: v.licensePlate,
                            isActive: v.isActive,
                          })
                        }
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${
                          v.isActive
                            ? 'border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700'
                            : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {v.isActive ? 'Ngừng hoạt động' : 'Kích hoạt'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>

        {/* Mobile Viewport Cards (< 768px) */}
        <div className="md:hidden space-y-3">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">
              <SpinnerIcon className="w-5 h-5 animate-spin mx-auto text-amber-500 mb-2" />
              <p className="text-xs">Đang tải dữ liệu phương tiện...</p>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <VehicleIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700 text-sm">
                {hasActiveFilters ? 'Không tìm thấy phương tiện phù hợp' : 'Chưa có phương tiện nào'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {hasActiveFilters
                  ? 'Thử tìm kiếm với từ khóa khác hoặc bấm Xóa bộ lọc.'
                  : 'Nhấn nút "+ Thêm phương tiện" phía trên để bắt đầu thêm xe.'}
              </p>
            </div>
          ) : (
            vehicles.map((v) => (
              <div
                key={v.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2.5 text-xs text-slate-700"
              >
                {/* Header card: Biển số & Trạng thái */}
                <div className="flex items-center justify-between">
                  <div className="font-mono font-bold text-slate-900 text-base">
                    {v.licensePlate}
                  </div>
                  <Badge
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      v.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {v.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                  </Badge>
                </div>

                {/* Info row: Hãng xe · Ghế học sinh · Màu xe */}
                <div className="text-slate-600 flex items-center gap-2">
                  <span className="font-medium text-slate-800">{v.brand}</span>
                  <span>·</span>
                  <span>{v.seatCount} chỗ học sinh</span>
                  <span>·</span>
                  <span>{v.color}</span>
                </div>

                {/* IoT & Ngày thêm */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span>IoT:</span>
                    {v.iotDevice ? (
                      <span className="font-mono font-semibold text-emerald-700">
                        {v.iotDevice.deviceId}
                      </span>
                    ) : (
                      <span className="text-slate-400">Chưa gán</span>
                    )}
                  </div>
                  <div>Thêm: {formatVietnamDate(v.createdAt)}</div>
                </div>

                {/* Actions row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIotVehicle(v)}
                    className="text-xs font-semibold text-amber-700 hover:text-amber-800 hover:bg-amber-50 px-2 py-1"
                  >
                    {v.iotDevice ? 'Quản lý IoT' : 'Gán IoT'}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setStatusTarget({
                        kind: 'vehicle',
                        id: v.id,
                        name: v.licensePlate,
                        isActive: v.isActive,
                      })
                    }
                    className={`text-xs font-semibold px-3 py-1 rounded-lg ${
                      v.isActive
                        ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {v.isActive ? 'Ngừng hoạt động' : 'Kích hoạt'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Footer */}
        <div className="border-t border-slate-100 pt-2">
          <PaginationControl
            page={page}
            totalPages={totalPages}
            total={totalItems}
            limit={limit}
            loading={isLoading}
            hideNavigationWhenSinglePage={true}
            onPageChange={(newPage) => setPage(newPage)}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
          />
        </div>
      </Card>

      {/* Resource Status Dialog */}
      {statusTarget && (
        <ResourceStatusDialog
          key={statusTarget.id}
          target={statusTarget}
          onClose={() => setStatusTarget(null)}
          onSuccess={() => void fetchVehicles()}
        />
      )}

      {/* IoT Management Modal */}
      {iotVehicle && (
        <VehicleIotModal
          key={iotVehicle.id}
          vehicle={iotVehicle}
          onClose={() => setIotVehicle(null)}
          onUpdated={fetchVehicles}
        />
      )}

      {/* Add Vehicle Modal */}
      <AddVehicleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        triggerRef={addBtnRef}
        onSuccess={() => {
          toast.success('Thêm phương tiện mới thành công');
          void fetchVehicles();
        }}
      />
    </div>
  );
}
