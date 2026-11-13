'use client';

import { ResourceStatusDialog } from '@/components/admin/common/resource-status-dialog';
import type { ResourceTarget } from '@/lib/resource-status';
import { Select } from '@/components/ui/select';
import { TableActions } from '@/components/admin/common/table-actions';
import { toast } from '@/stores/toast-store';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { apiClient } from '@/lib/api-client';
import { Vehicle } from '@/lib/types';
import { AddVehicleModal } from './_components/add-vehicle-modal';
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
import { VehicleIotModal } from './_components/vehicle-iot-modal';
import { Badge } from '@/components/ui/badge';

export default function VehiclesPage() {
  const { user } = useAuth();
  const [statusTarget, setStatusTarget] = useState<ResourceTarget | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
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
  const [iotVehicle, setIotVehicle] = useState<Vehicle | null>(null);

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
        status: statusFilter,
      });
      setVehicles(data.items || []);
      setTotalItems(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể tải danh sách phương tiện');
    } finally {
      setIsLoading(false);
    }
  }, [user, page, limit, debouncedSearch, statusFilter]);

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
        hasActiveFilters={Boolean(search || statusFilter !== 'ALL')}
        onReset={() => {
          handleSearchChange(''); setStatusFilter('ALL');
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

<FilterField label="Trạng thái"><Select value={statusFilter} onChange={event => { setStatusFilter(event.target.value as typeof statusFilter); setPage(1); }}><option value="ALL">Tất cả trạng thái</option><option value="ACTIVE">Đang hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option></Select></FilterField>
<div className="ui-filter-meta">
          Tổng số phương tiện: <strong className="text-slate-800">{totalItems}</strong>
        </div>
      </FilterToolbar>

      {/* Vehicle Table */}
      <Card className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <Table className="w-full text-left text-sm" minWidth={1490}>
            <colgroup>
              <col />
              <col style={{ width: 180 }} />
              <col style={{ width: 180 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 180 }} />
              <col style={{ width: 240 }} />
              <col style={{ width: 180 }} />
              <col style={{ width: 190 }} />
            </colgroup>
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
                <th className="px-4 py-3 text-left">Thiết bị IoT</th>
                <th>Trạng thái</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <SpinnerIcon className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                    <span className="text-xs">Đang tải dữ liệu phương tiện...</span>
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
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
                      <Button type="button" variant="ghost" size="sm" onClick={() => setIotVehicle(v)} aria-label={`Quản lý thiết bị IoT xe ${v.licensePlate}`}>
                        {v.licensePlate}
                      </Button>
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
                    <td className="py-3.5 px-4 text-xs"><Button type="button" variant="ghost" size="sm" onClick={() => setIotVehicle(v)}>{v.iotDevice?.deviceId || 'Gán thiết bị IoT'}</Button></td>
                    <td><Badge className={v.isActive ? 'text-emerald-700 bg-emerald-50' : 'text-slate-600 bg-slate-100'}>{v.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}</Badge></td>
                    <td><TableActions actions={[{ label: v.isActive ? 'Ngừng hoạt động' : 'Kích hoạt', warning: v.isActive, onClick: () => setStatusTarget({ kind: 'vehicle', id: v.id, name: v.licensePlate, isActive: v.isActive }) }]} /></td>
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

      {statusTarget && <ResourceStatusDialog key={statusTarget.id} target={statusTarget} onClose={() => setStatusTarget(null)} onSuccess={() => void fetchVehicles()} />}
      {/* Add Vehicle Modal */}
      {iotVehicle && <VehicleIotModal key={iotVehicle.id} vehicle={iotVehicle} onClose={() => setIotVehicle(null)} onUpdated={fetchVehicles} />}
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
