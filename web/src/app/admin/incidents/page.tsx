'use client';
import './_components/incident-modals.css';
import { IncidentLocation } from './_components/incident-location';
import { LifecycleDialog } from '@/components/admin/common/lifecycle-dialog';
import { Button } from '@/components/ui/button';
import { TableActions } from '@/components/admin/common/table-actions';
import { FilterToolbar, FilterField } from '@/components/ui/filter-toolbar';
import { PageHeader } from '@/components/ui/page-header';

import { Table } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

import { useRouteQuery } from '@/hooks/use-route-query';


import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { apiClient, ApiError } from '@/lib/api-client';
import {
  TripIncident,
  TripIncidentType,
  TripIncidentStatus,
  SchoolListItem,
} from '@/lib/types';
import {
  SpinnerIcon,
  AlertIcon,
  AlertTriangleIcon,
} from '@/components/icons';
import { PaginationControl } from '@/components/admin/common/pagination-control';
import { ResolveIncidentModal } from './_components/resolve-incident-modal';

export default function AdminIncidentsPage() {
  const { user } = useAuth();
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const isSchoolAdmin = user?.role === 'SCHOOL_ADMIN';

  // Filters
  const [schools, setSchools] = useState<SchoolListItem[]>([]);
  const [schoolFilter, setSchoolFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);

  const [actionableOnly, setActionableOnly] = useState(false);
  // Data
  const [incidents, setIncidents] = useState<TripIncident[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [selectedIncidentForResolve, setSelectedIncidentForResolve] =
    useState<TripIncident | null>(null);
  const [selectedIncidentForDetail, setSelectedIncidentForDetail] =
    useState<TripIncident | null>(null);

  useRouteQuery(String(user?.id), (query, isCurrent) => {
    setSchoolFilter(isSystemAdmin ? query.get('schoolId') || '' : '');
    const type = query.get('type'), status = query.get('status');
    setTypeFilter(type && ['ATTENDANT_MISSING','DRIVER_MISSING','OFF_ROUTE','LATE_STOP','NO_GUARDIAN_AT_STOP','TRAFFIC_DELAY','GPS_SIGNAL_LOST'].includes(type) ? type : 'ALL');
    setStatusFilter(status && ['WAITING_ASSIGNMENT','WAITING_CONFIRMATION','RESOLVED','CONFIRMED','CLOSED'].includes(status) ? status : 'ALL');
    setActionableOnly(query.get('actionable') === 'true'); setDateFilter(query.get('date') || ''); setPage(1);
    const id = query.get('incidentId'); if (id) void apiClient.getIncidentDetail(id).then(item => {
      if (!isCurrent()) return;
      const canResolve = item.status === 'WAITING_ASSIGNMENT' && (isSystemAdmin ? item.type === 'DRIVER_MISSING' : item.type === 'ATTENDANT_MISSING');
      if (canResolve) setSelectedIncidentForResolve(item); else setSelectedIncidentForDetail(item);
    }).catch(cause => { if (isCurrent()) setError(cause instanceof Error ? cause.message : 'Không thể mở sự cố'); });
  });
  // Fetch schools for System Admin
  useEffect(() => {
    if (isSystemAdmin) {
      apiClient
        .getSchools({ limit: 100 })
        .then((res) => setSchools(res.items || []))
        .catch(() => {});
    }
  }, [isSystemAdmin]);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getIncidents({
        actionable: actionableOnly || undefined,
        schoolId: isSystemAdmin && schoolFilter ? schoolFilter : undefined,
        type: typeFilter !== 'ALL' ? (typeFilter as TripIncidentType) : undefined,
        status: statusFilter !== 'ALL' ? (statusFilter as TripIncidentStatus) : undefined,
        date: dateFilter || undefined,
        page,
        limit,
      });

      setIncidents(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Không thể tải danh sách sự cố';
      setError(msg);
      setIncidents([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [isSystemAdmin, schoolFilter, typeFilter, statusFilter, dateFilter, page, limit, actionableOnly]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const getTypeLabel = (type: TripIncidentType) => {
    switch (type) {
      case 'ATTENDANT_MISSING':
        return 'Giáo viên chưa đến';
      case 'DRIVER_MISSING':
        return 'Tài xế chưa đến';
      case 'OFF_ROUTE':
        return 'Lệch tuyến';
      case 'LATE_STOP':
        return 'Đón/trả chậm';
      case 'NO_GUARDIAN_AT_STOP': return 'Không có người đón tại điểm dừng';
      case 'TRAFFIC_DELAY': return 'Chậm do giao thông';
      case 'GPS_SIGNAL_LOST': return 'Mất tín hiệu GPS';
      default:
        return 'Không xác định';
    }
  };

  const getTypeBadgeClass = (type: TripIncidentType) => {
    switch (type) {
      case 'ATTENDANT_MISSING':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'DRIVER_MISSING':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'NO_GUARDIAN_AT_STOP':
      case 'TRAFFIC_DELAY':
      case 'OFF_ROUTE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'LATE_STOP':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'GPS_SIGNAL_LOST': return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (status: TripIncidentStatus) => {
    switch (status) {
      case 'WAITING_ASSIGNMENT':
        return (
          <Badge className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Chờ xử lý
          </Badge>
        );
      case 'WAITING_CONFIRMATION':
        return (
          <Badge className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            Chờ xác nhận
          </Badge>
        );
      case 'RESOLVED':
        return (
          <Badge className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Đã xử lý
          </Badge>
        );
      case 'CONFIRMED':
        return (
          <Badge className="px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            Đã xác nhận
          </Badge>
        );
      case 'CLOSED':
        return (
          <Badge className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Đã đóng
          </Badge>
        );
      default:
        return (
          <Badge className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
            Không xác định
          </Badge>
        );
    }
  };

  const canResolve = (incident: TripIncident) => {
    if (incident.status !== 'WAITING_ASSIGNMENT') return false;
    if (incident.type === 'ATTENDANT_MISSING') {
      return isSchoolAdmin || isSystemAdmin;
    }
    if (incident.type === 'DRIVER_MISSING') {
      return isSystemAdmin;
    }
    return false;
  };

  return (
    <div className="ui-list-page">
      {/* Page Header */}
      <PageHeader title="Sự cố" />

      {actionableOnly && <button type="button" onClick={() => setActionableOnly(false)} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Chỉ sự cố cần xử lý ×</button>}
      {/* Filter Row */}
      <FilterToolbar
        hasActiveFilters={Boolean(schoolFilter || typeFilter !== 'ALL' || statusFilter !== 'ALL' || dateFilter)}
        onReset={() => {
          setSchoolFilter('');
          setTypeFilter('ALL');
          setStatusFilter('ALL');
          setDateFilter('');
          setPage(1);
        }}
      >
        {isSystemAdmin && (<FilterField label="Trường học">
          <select
              value={schoolFilter}
              onChange={(e) => {
                setSchoolFilter(e.target.value);
                setPage(1);
              }}
              className="w-full"
            >
              <option value="">Tất cả trường</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
        </FilterField>
        )}
        <FilterField label="Loại sự cố">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="w-full"
          >
            <option value="ALL">Tất cả loại sự cố</option>
            <option value="ATTENDANT_MISSING">Giáo viên chưa đến</option>
            <option value="DRIVER_MISSING">Tài xế chưa đến</option>
            <option value="OFF_ROUTE">Lệch tuyến</option>
            <option value="LATE_STOP">Đón/trả chậm</option>
            <option value="NO_GUARDIAN_AT_STOP">Không có người đón tại điểm dừng</option>
            <option value="TRAFFIC_DELAY">Chậm do giao thông</option>
            <option value="GPS_SIGNAL_LOST">Mất tín hiệu GPS</option>
          </select>
        </FilterField>

        <FilterField label="Trạng thái">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="WAITING_ASSIGNMENT">Chờ xử lý</option>
            <option value="WAITING_CONFIRMATION">Chờ xác nhận</option>
            <option value="RESOLVED">Đã xử lý</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="CLOSED">Đã đóng</option>
          </select>
        </FilterField>

        <FilterField label="Ngày">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPage(1);
            }}
            className="w-full"
          />
        </FilterField>
      </FilterToolbar>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <SpinnerIcon className="w-8 h-8 animate-spin text-amber-500 mb-2" />
            <p className="text-xs">Đang tải danh sách sự cố...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="inline-flex p-3 rounded-full bg-rose-50 text-rose-500 mb-2">
              <AlertIcon className="w-6 h-6" />
            </div>
            <p className="text-sm text-rose-600 font-medium mb-3">{error}</p>
            <button
              onClick={() => fetchIncidents()}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : incidents.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <AlertTriangleIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-600">Không có sự cố nào</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Hệ thống chưa ghi nhận sự cố phù hợp với bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full text-left text-xs border-collapse" minWidth={1160}>
            <colgroup><col /><col style={{ width: 200 }} /><col style={{ width: 130 }} /><col style={{ width: 220 }} /><col style={{ width: 180 }} /><col style={{ width: 190 }} /></colgroup>
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Chuyến xe</th>
                  <th className="py-3.5 px-4">Loại sự cố</th>
                  <th className="py-3.5 px-4">Thời điểm</th>
                  <th className="py-3.5 px-4">Người báo / Nguồn</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Chuyến */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">
                        {inc.routeName || 'Chuyến xe'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {inc.schoolName || ''} · {inc.serviceDate || ''}
                      </div>
                    </td>

                    {/* Loại */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold border ${getTypeBadgeClass(
                          inc.type,
                        )}`}
                      >
                        {getTypeLabel(inc.type)}
                      </span>
                    </td>

                    {/* Thời điểm */}
                    <td className="py-3.5 px-4 text-slate-600">
                      <div>
                        {new Date(inc.createdAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(inc.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </td>

                    {/* Người báo */}
                    <td className="py-3.5 px-4 text-slate-700">
                      {inc.reportedByName ? (
                        <div>
                          <div className="font-medium text-slate-800">{inc.reportedByName}</div>
                          <div className="text-[11px] text-slate-400">
                            {inc.reportedByRole === 'DRIVER'
                              ? 'Tài xế'
                              : inc.reportedByRole === 'BUS_ATTENDANT'
                              ? 'Giáo viên phụ xe'
                              : inc.reportedByRole}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Hệ thống phát hiện</span>
                      )}
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3.5 px-4">{getStatusBadge(inc.status)}</td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <TableActions actions={[
                        ...(canResolve(inc) ? [{ label: 'Xử lý', primary: true, onClick: () => setSelectedIncidentForResolve(inc) }] : []),
                        { label: 'Chi tiết', onClick: () => setSelectedIncidentForDetail(inc) },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!loading && total > 0 && (
          <div>
            <PaginationControl
              page={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              onPageChange={(p) => setPage(p)}
              onLimitChange={(l) => {
                setLimit(l);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* Resolve Incident Modal */}
      <ResolveIncidentModal
        incident={selectedIncidentForResolve}
        isOpen={Boolean(selectedIncidentForResolve)}
        onClose={() => setSelectedIncidentForResolve(null)}
        onSuccess={() => fetchIncidents()}
      />

      {/* Detail / Evidence Modal */}
      {selectedIncidentForDetail && (
        <LifecycleDialog open className="incident-dialog" title={getTypeLabel(selectedIncidentForDetail.type)} onClose={() => setSelectedIncidentForDetail(null)} footer={<Button variant="outline" onClick={() => setSelectedIncidentForDetail(null)}>Đóng</Button>}>
          <section className="incident-summary" aria-label="Chuyến xe liên quan">
            <span className="incident-summary-icon"><AlertTriangleIcon className="w-5 h-5" aria-hidden="true" /></span>
            <div><span className="incident-label">Chuyến xe</span><strong>{selectedIncidentForDetail.routeName || 'Chuyến xe'}</strong><small>{selectedIncidentForDetail.schoolName}{selectedIncidentForDetail.serviceDate ? ` · ${selectedIncidentForDetail.serviceDate}` : ''}</small></div>
          </section>
          <dl className="incident-metadata">
            <div><dt>Trạng thái</dt><dd>{getStatusBadge(selectedIncidentForDetail.status)}</dd></div>
            <div><dt>Thời điểm ghi nhận</dt><dd><time dateTime={selectedIncidentForDetail.createdAt}>{new Date(selectedIncidentForDetail.createdAt).toLocaleString('vi-VN')}</time></dd></div>
          </dl>
          {selectedIncidentForDetail.description && <section className="incident-section"><h3>Nội dung báo</h3><p className="incident-description">{selectedIncidentForDetail.description}</p></section>}
          {selectedIncidentForDetail.resolution && <section className="incident-resolution" data-status={selectedIncidentForDetail.status}>
            <h3>Kết quả xử lý / Giải trình</h3>
            <strong>{selectedIncidentForDetail.resolution.action === 'ARRIVED' ? 'Đã có mặt' : selectedIncidentForDetail.resolution.action === 'REPLACED' ? 'Đã bố trí thay thế' : 'Đã xử lý'}</strong>
            {selectedIncidentForDetail.resolution.reason && <p>{selectedIncidentForDetail.resolution.reason}</p>}
            {selectedIncidentForDetail.processedByName && <small>Người thực hiện: {selectedIncidentForDetail.processedByName}{selectedIncidentForDetail.processedAt ? ` · ${new Date(selectedIncidentForDetail.processedAt).toLocaleString('vi-VN')}` : ''}</small>}
          </section>}
          <IncidentLocation incident={selectedIncidentForDetail} />
        </LifecycleDialog>
      )}
    </div>
  );
}
