'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { GeographyFilter } from '@/components/admin/common/geography-filter';
import { FilterField } from '@/components/ui/filter-toolbar';
import type {
  GeographyQuery,
  UpdateSchoolStatusResponse,
  SchoolListItem,
  SchoolDetail,
  PaginationMeta,
} from '@/lib/types';
import { displayDate } from '@/lib/school-lifecycle';
import { TableActions } from '@/components/admin/common/table-actions';
import { toast } from '@/stores/toast-store';
import { ContextLink } from '@/components/admin/common/context-navigation';
import { withReturnTo } from '@/lib/back-navigation';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/components/auth/auth-provider';
import {
  PlusIcon,
  SearchIcon,
  SpinnerIcon,
  SchoolIcon,
  AlertIcon,
} from '@/components/icons';
import { PaginationControl } from '@/components/admin/common/pagination-control';
import { AddSchoolModal } from './_components/add-school-modal';
import { EditSchoolModal } from '@/components/admin/schools/edit-school-modal';
import { SchoolStatusDialog } from '@/components/admin/schools/school-status-dialog';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import './schools-page.css';

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQueryString = searchParams.toString();
  const currentUrl = `${pathname}${currentQueryString ? `?${currentQueryString}` : ''}`;
  const { user } = useAuth();

  const [schools, setSchools] = useState<SchoolListItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
  });

  const [geography, setGeography] = useState<GeographyQuery>({});
  const requestRevision = useRef(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [statusModalSchool, setStatusModalSchool] = useState<SchoolListItem | null>(null);
  const [editingSchoolDetail, setEditingSchoolDetail] = useState<SchoolDetail | null>(null);
  const [loadingEditSchoolId, setLoadingEditSchoolId] = useState<string | null>(null);
  const editRequestIdRef = useRef(0);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const fetchSchools = useCallback(
    async (
      targetPage = page,
      targetLimit = limit,
      targetSearch = debouncedSearch,
      targetStatus = statusFilter,
    ) => {
      const requestId = ++requestRevision.current;
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await apiClient.getSchools({
          ...geography,
          page: targetPage,
          limit: targetLimit,
          search: targetSearch || undefined,
          status: targetStatus || undefined,
        });

        if (requestId !== requestRevision.current) return;
        setSchools(response.items);
        setMeta(response.meta);
      } catch (err: unknown) {
        if (requestId !== requestRevision.current) return;
        const msg =
          err instanceof Error
            ? err.message
            : 'Không thể tải danh sách trường học. Vui lòng kiểm tra lại kết nối.';
        setErrorMessage(msg);
      } finally {
        if (requestId === requestRevision.current) setIsLoading(false);
      }
    },
    [page, limit, debouncedSearch, statusFilter, geography],
  );

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    fetchSchools(page, limit, debouncedSearch, statusFilter);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [fetchSchools, page, limit, debouncedSearch, statusFilter]);

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

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val as 'ACTIVE' | 'INACTIVE' | '');
    setPage(1);
  };

  const handleResetAllFilters = () => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('');
    setGeography({});
    setPage(1);
  };

  const handleAddSuccess = () => {
    toast.success('Đã tạo trường học mới thành công.');
    fetchSchools(1, limit, debouncedSearch, statusFilter);
  };

  const handleStatusSuccess = (result: UpdateSchoolStatusResponse) => {
    toast.success(
      result.changeStatus === 'PENDING' && result.effectiveDate
        ? `Đã hẹn ngừng hoạt động từ ${displayDate(result.effectiveDate)}.`
        : result.message || 'Đã cập nhật trạng thái trường học.',
    );
    fetchSchools(page, limit, debouncedSearch, statusFilter);
  };

  const handleOpenEditModal = async (schoolItem: SchoolListItem) => {
    if (loadingEditSchoolId) return;
    const reqId = ++editRequestIdRef.current;
    setLoadingEditSchoolId(schoolItem.id);
    try {
      const detail = await apiClient.getSchool(schoolItem.id);
      if (reqId !== editRequestIdRef.current) return;
      if (detail && detail.id === schoolItem.id) {
        setEditingSchoolDetail(detail);
      }
    } catch (err: unknown) {
      if (reqId !== editRequestIdRef.current) return;
      const msg = err instanceof Error ? err.message : 'Không thể tải thông tin chi tiết trường học.';
      toast.error(msg);
    } finally {
      if (reqId === editRequestIdRef.current) {
        setLoadingEditSchoolId(null);
      }
    }
  };

  const handleEditSuccess = (message?: string, partial?: boolean) => {
    if (partial) {
      toast.warning(message || 'Đã lưu một phần thông tin trường học.');
    } else {
      toast.success(message || 'Đã cập nhật thông tin trường học thành công.');
    }
    setEditingSchoolDetail(null);
    fetchSchools(page, limit, debouncedSearch, statusFilter);
  };

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>, schoolId: string) => {
    // 1. Bỏ qua nếu người dùng đang bôi đen / chọn chữ
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      return;
    }

    // 2. Bỏ qua nếu click xuất phát từ thẻ link, button, menu, input, popover...
    const target = e.target as HTMLElement | null;
    if (
      target?.closest(
        'a, button, input, select, textarea, [role="button"], [role="menu"], [role="dialog"], .table-actions, [popover]',
      )
    ) {
      return;
    }

    // 3. Điều hướng tới hồ sơ trường học, bảo toàn returnTo
    const targetUrl = withReturnTo(`/admin/schools/${schoolId}`, currentUrl);
    router.push(targetUrl);
  };

  const renderAddress = (school: SchoolListItem) => {
    const address = school.addressText || '';
    const ward = school.ward?.trim();
    const showWard = Boolean(ward && !address.toLowerCase().includes(ward.toLowerCase()));

    return (
      <div className="schools-address-cell" title={address}>
        <p className="schools-address-main">{address}</p>
        {showWard && <p className="schools-address-sub">{ward}</p>}
      </div>
    );
  };

  const hasActiveFilters = Boolean(
    search || debouncedSearch || statusFilter || geography.provinceId || geography.wardId,
  );

  return (
    <div className="ui-list-page flex flex-col gap-6">
      {/* Page Header */}
      <PageHeader
        title="Trường học"
        actions={
          <div>
            <Button
              variant="primary"
              size="sm"
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-[#e6b74d] text-foreground text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-xs"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Thêm trường</span>
            </Button>
          </div>
        }
      />

      {/* Unified Frame: Toolbar, Table & Pagination */}
      <Card className="schools-frame">
        {/* Frame Header: List Title & Filter Toolbar */}
        <div className="schools-frame-header">
          {/* Header Row: Title */}
          <div className="schools-frame-title-row">
            <h2 className="schools-frame-title">Danh sách trường học</h2>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetAllFilters}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Xóa tất cả bộ lọc
              </Button>
            )}
          </div>

          {/* Filter Area: 4 direct controls with individual borders */}
          <div className="schools-toolbar" role="group" aria-label="Bộ lọc trường học">
            <div className="schools-toolbar-fields">
              {/* 1. Tìm kiếm */}
              <FilterField
                label="Tìm kiếm"
                grow
                icon={<SearchIcon className="w-4 h-4 text-slate-400" />}
              >
                <Input
                  id="schools-search-input"
                  type="text"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Tìm theo tên trường..."
                  aria-label="Tìm theo tên trường"
                  className="w-full pl-9"
                />
              </FilterField>

              {/* 2. Trạng thái */}
              <FilterField label="Trạng thái">
                <Select
                  id="schools-status-select"
                  aria-label="Trạng thái"
                  value={statusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  className="w-full"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="INACTIVE">Ngừng hoạt động</option>
                </Select>
              </FilterField>

              {/* 3 & 4. GeographyFilter (Tỉnh/thành & Phường/xã) */}
              <GeographyFilter
                className="schools-geo-filter"
                value={geography}
                onChange={(value) => {
                  setGeography(value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>

        {/* Error State Banner */}
        {errorMessage && (
          <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertIcon className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <Button
              type="button"
              onClick={() => fetchSchools()}
              className="px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold cursor-pointer"
            >
              Thử lại
            </Button>
          </div>
        )}

        {/* Table Container with Container Query */}
        <div className="schools-table-container">
          <div className="schools-table-scroll">
            <Table className="w-full text-left border-collapse" minWidth={760}>
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4 min-w-[240px]">Trường học</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Địa chỉ</th>
                  <th className="col-contract-start py-3.5 px-4 min-w-[140px]">
                    Bắt đầu hợp đồng
                  </th>
                  <th className="col-contract-end py-3.5 px-4 min-w-[140px]">
                    Kết thúc hợp đồng
                  </th>
                  <th className="col-contract-combined py-3.5 px-4 min-w-[170px]">
                    Hợp đồng
                  </th>
                  <th className="py-3.5 px-4 min-w-[130px]">Trạng thái</th>
                  <th className="py-3.5 px-4 w-[72px] text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <div className="inline-flex items-center gap-2">
                        <SpinnerIcon className="w-4 h-4 animate-spin text-amber-500" />
                        <span>Đang tải danh sách trường học...</span>
                      </div>
                    </td>
                  </tr>
                ) : schools.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      {hasActiveFilters ? (
                        <>
                          <SearchIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-700">
                            Không tìm thấy trường học phù hợp
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                            Không có trường nào khớp với các tiêu chí tìm kiếm hoặc địa bàn đã chọn.
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleResetAllFilters}
                            className="mt-3 inline-flex items-center gap-1.5"
                          >
                            Xóa bộ lọc
                          </Button>
                        </>
                      ) : (
                        <>
                          <SchoolIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-700">
                            Chưa có trường học nào
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                            Bấm nút &ldquo;+ Thêm trường&rdquo; ở góc trên để tạo trường học đầu tiên.
                          </p>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => setIsAddModalOpen(true)}
                            className="mt-3 inline-flex items-center gap-1.5"
                          >
                            <PlusIcon className="w-4 h-4" />
                            <span>Thêm trường</span>
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ) : (
                  schools.map((school) => {
                    const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
                    const isSchoolEditing = loadingEditSchoolId === school.id;

                    return (
                      <tr
                        key={school.id}
                        onClick={(e) => handleRowClick(e, school.id)}
                        className="schools-table-row transition-colors"
                      >
                        {/* Cột 1: Tên trường & Ảnh Thumbnail */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-amber-50 border border-slate-200 shrink-0 flex items-center justify-center">
                              {school.imageUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={school.imageUrl}
                                  alt={school.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <SchoolIcon className="w-5 h-5 text-amber-600" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <ContextLink
                                href={`/admin/schools/${school.id}`}
                                className="schools-name-link block truncate"
                              >
                                {school.name}
                              </ContextLink>
                              {typeof school.employeeCount === 'number' && (
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  {school.employeeCount} nhân viên
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Cột 2: Địa chỉ */}
                        <td className="py-3.5 px-4">{renderAddress(school)}</td>

                        {/* Cột 3 (Split): Bắt đầu hợp đồng */}
                        <td className="col-contract-start py-3.5 px-4 text-slate-600 schools-contract-date">
                          {formatDate(school.contractStartDate)}
                        </td>

                        {/* Cột 4 (Split): Kết thúc hợp đồng (Nhấn đậm) */}
                        <td className="col-contract-end py-3.5 px-4 schools-contract-date schools-contract-end-date">
                          {formatDate(school.contractEndDate)}
                        </td>

                        {/* Cột Combined: Hợp đồng 2 dòng (khi bảng hẹp) */}
                        <td className="col-contract-combined py-3.5 px-4 schools-contract-combined-cell">
                          <div>
                            <span className="schools-contract-label">Bắt đầu:</span>
                            <span className="schools-contract-date text-slate-600">
                              {formatDate(school.contractStartDate)}
                            </span>
                          </div>
                          <div className="mt-0.5">
                            <span className="schools-contract-label">Kết thúc:</span>
                            <span className="schools-contract-date schools-contract-end-date">
                              {formatDate(school.contractEndDate)}
                            </span>
                          </div>
                        </td>

                        {/* Cột 5: Trạng thái */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Badge
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
                          </Badge>
                        </td>

                        {/* Cột 6: Thao tác (Menu 3 chấm độc lập) */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <TableActions
                            actions={[]}
                            more={[
                              ...(isSystemAdmin
                                ? [
                                    {
                                      label: isSchoolEditing
                                        ? 'Đang tải thông tin…'
                                        : 'Chỉnh sửa thông tin',
                                      disabled: Boolean(loadingEditSchoolId),
                                      onClick: () => handleOpenEditModal(school),
                                    },
                                  ]
                                : []),
                              {
                                label: school.isActive
                                  ? 'Hẹn ngừng hoạt động'
                                  : 'Kích hoạt lại',
                                warning: school.isActive,
                                onClick: () => setStatusModalSchool(school),
                              },
                            ]}
                            label={`Thao tác với ${school.name}`}
                            forceMenu={true}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>

          {/* Frame Footer: Pagination */}
          <PaginationControl
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.totalItems}
            limit={limit}
            loading={isLoading}
            onPageChange={(newPage) => setPage(newPage)}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
          />
        </div>
      </Card>

      {/* Add School Modal */}
      <AddSchoolModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      {/* Edit School Modal (Chỉnh sửa thông tin từ danh sách cho SYSTEM_ADMIN) */}
      {editingSchoolDetail && (
        <EditSchoolModal
          isOpen={Boolean(editingSchoolDetail)}
          school={editingSchoolDetail}
          userRole={user?.role}
          onClose={() => setEditingSchoolDetail(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Status Confirmation Modal */}
      {statusModalSchool && (
        <SchoolStatusDialog
          isOpen={Boolean(statusModalSchool)}
          schoolId={statusModalSchool.id}
          schoolName={statusModalSchool.name}
          currentIsActive={statusModalSchool.isActive}
          contractEndDate={statusModalSchool.contractEndDate}
          onClose={() => setStatusModalSchool(null)}
          onSuccess={handleStatusSuccess}
        />
      )}
    </div>
  );
}
