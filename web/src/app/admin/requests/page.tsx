'use client';

import { useRouteQuery } from '@/hooks/use-route-query';


import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { apiClient } from '@/lib/api-client';
import type { StudentUpdateRequest, RequestStatus, RequestType } from '@/lib/types';
import {
  SearchIcon,
  SpinnerIcon,
  AlertIcon,
  MapPinIcon,
  StudentIcon,
  CalendarIcon,
  EyeIcon,
} from '@/components/icons';
import { RequestDetailModal } from './request-detail-modal';
import { PaginationControl } from '@/components/admin/common/pagination-control';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { FilterToolbar } from '@/components/ui/filter-toolbar';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

export default function AdminRequestsPage() {
  const { user } = useAuth();
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const schoolId = user?.schoolId;

  // Query state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<RequestType | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [actionableOnly, setActionableOnly] = useState(false);
  const [filterSchool, setFilterSchool] = useState('');
  // Data state
  const [requests, setRequests] = useState<StudentUpdateRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useRouteQuery(String(user?.id), query => {
    const status = query.get('status'); setStatusFilter(status && ['PENDING','APPROVED','REJECTED','CANCELLED'].includes(status) ? status as RequestStatus : '');
    setActionableOnly(query.get('actionable') === 'true'); setFilterSchool(isSystemAdmin ? query.get('schoolId') || '' : ''); setPage(1);
    const id = query.get('requestId'); if (id) { setSelectedRequestId(id); setIsModalOpen(true); }
  });
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      setError(null);

      if (isSystemAdmin) {
        const res = await apiClient.listSystemAdminRequests({
          actionable: actionableOnly || undefined, schoolId: filterSchool || undefined,
          page,
          limit,
          status: statusFilter || undefined,
          search: debouncedSearch.trim() || undefined,
        });
        setRequests(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      } else if (schoolId) {
        const res = await apiClient.listSchoolRequests(schoolId, {
          actionable: actionableOnly || undefined,
          page,
          limit,
          status: statusFilter || undefined,
          type: typeFilter || undefined,
          search: debouncedSearch.trim() || undefined,
        });
        setRequests(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách yêu cầu cập nhật.');
    } finally {
      setIsLoading(false);
    }
  }, [user, isSystemAdmin, schoolId, page, limit, statusFilter, typeFilter, debouncedSearch, actionableOnly, filterSchool]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleOpenDetail = (id: string) => {
    setSelectedRequestId(id);
    setIsModalOpen(true);
  };

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Chờ duyệt
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Đã duyệt
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Đã từ chối
          </Badge>
        );
      default:
        return null;
    }
  };

  const getTypeBadge = (type: RequestType) => {
    if (type === 'ADDRESS_UPDATE') {
      return (
        <Badge className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <MapPinIcon className="w-3 h-3" />
          Cập nhật địa chỉ
        </Badge>
      );
    }
    return (
      <Badge className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
        <StudentIcon className="w-3 h-3" />
        Cập nhật thông tin
      </Badge>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {actionableOnly && <button type="button" onClick={() => setActionableOnly(false)} className="text-xs font-semibold text-amber-800">Chỉ yêu cầu cần xử lý ×</button>}
      {filterSchool && <button type="button" onClick={() => setFilterSchool('')} className="text-xs font-semibold text-slate-500">Đang lọc theo trường từ Tổng quan ×</button>}
      {/* Page Title & Scope Notice */}
      <PageHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Quản lý yêu cầu cập nhật</h1>
          <p className="text-xs text-slate-500 mt-1">
            {isSystemAdmin
              ? 'Xử lý các yêu cầu cập nhật địa chỉ đón trả học sinh trên toàn hệ thống'
              : 'Xử lý yêu cầu thay đổi thông tin và địa chỉ đón trả của học sinh thuộc trường'}
          </p>
        </div>
      </PageHeader>

      {/* Filter and Search Bar */}
      <FilterToolbar className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên học sinh hoặc mã học sinh..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-400 bg-slate-50/50"
          />
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-44">
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as RequestStatus | '');
              setPage(1);
            }}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-400 bg-slate-50/50 text-slate-700"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Chờ duyệt</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Đã từ chối</option>
          </Select>
        </div>

        {/* Type Filter (School Admin only) */}
        {!isSystemAdmin && (
          <div className="w-full md:w-44">
            <Select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as RequestType | '');
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-400 bg-slate-50/50 text-slate-700"
            >
              <option value="">Tất cả loại yêu cầu</option>
              <option value="INFORMATION_UPDATE">Cập nhật thông tin</option>
              <option value="ADDRESS_UPDATE">Cập nhật địa chỉ</option>
            </Select>
          </div>
        )}
      </FilterToolbar>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertIcon className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Requests Table */}
      <Card className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <th className="p-3.5 pl-5">Học sinh</th>
                <th className="p-3.5">Loại yêu cầu</th>
                <th className="p-3.5">Trạng thái</th>
                <th className="p-3.5">Ngày gửi</th>
                <th className="p-3.5">Ngày xử lý</th>
                <th className="p-3.5 pr-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <SpinnerIcon className="w-5 h-5 animate-spin mx-auto text-amber-500 mb-2" />
                    <span>Đang tải danh sách yêu cầu...</span>
                  </td>
                </tr>
              )}

              {!isLoading && requests.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <CalendarIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <span className="font-medium text-slate-600 block">Không có yêu cầu cập nhật nào</span>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      Các yêu cầu thay đổi từ phụ huynh sẽ được hiển thị tại đây.
                    </span>
                  </td>
                </tr>
              )}

              {!isLoading &&
                requests.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => handleOpenDetail(req.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="p-3.5 pl-5">
                      <div className="font-semibold text-slate-900 group-hover:text-amber-600 transition-colors">
                        {req.studentName}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                        {req.studentCode}
                      </div>
                    </td>
                    <td className="p-3.5">{getTypeBadge(req.type)}</td>
                    <td className="p-3.5">{getStatusBadge(req.status)}</td>
                    <td className="p-3.5 text-slate-600">
                      {new Date(req.createdAt).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {req.reviewedAt
                        ? new Date(req.reviewedAt).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="p-3.5 pr-5 text-right">
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(req.id);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium transition-colors cursor-pointer"
                      >
                        <EyeIcon className="w-3.5 h-3.5" />
                        <span>Xem chi tiết</span>
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </Table>
        </div>

        {/* Pagination Footer */}
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

      {/* Shared Detail Modal */}
      {user && (
        <RequestDetailModal
          isOpen={isModalOpen}
          requestId={selectedRequestId}
          role={user.role}
          schoolId={schoolId || undefined}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedRequestId(null);
          }}
          onActionSuccess={() => {
            fetchRequests();
          }}
        />
      )}
    </div>
  );
}
