'use client';

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
  CloseIcon,
  AlertTriangleIcon,
} from '@/components/icons';
import { PaginationControl } from '@/components/admin/common/pagination-control';
import { ResolveIncidentModal } from '@/components/admin/incidents/resolve-incident-modal';

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
    setTypeFilter(type && ['ATTENDANT_MISSING','DRIVER_MISSING','OFF_ROUTE','LATE_STOP'].includes(type) ? type : 'ALL');
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
      default:
        return type;
    }
  };

  const getTypeBadgeClass = (type: TripIncidentType) => {
    switch (type) {
      case 'ATTENDANT_MISSING':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'DRIVER_MISSING':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'OFF_ROUTE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'LATE_STOP':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (status: TripIncidentStatus) => {
    switch (status) {
      case 'WAITING_ASSIGNMENT':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Chờ xử lý
          </span>
        );
      case 'WAITING_CONFIRMATION':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            Chờ xác nhận
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Đã xử lý
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            Đã xác nhận
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Đã đóng
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
            {status}
          </span>
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
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sự cố vận hành</h1>
        <p className="text-sm text-slate-500 mt-1">
          Theo dõi và xử lý các sự cố nhân sự và cảnh báo vận hành trên tuyến xe.
        </p>
      </div>

      {actionableOnly && <button type="button" onClick={() => setActionableOnly(false)} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Chỉ sự cố cần xử lý ×</button>}
      {/* Filter Row */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
        {/* School filter (System Admin) */}
        {isSystemAdmin && (
          <div className="w-full sm:w-auto">
            <select
              value={schoolFilter}
              onChange={(e) => {
                setSchoolFilter(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-48 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
            >
              <option value="">Tất cả trường</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Type filter */}
        <div className="w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-48 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
          >
            <option value="ALL">Tất cả loại sự cố</option>
            <option value="ATTENDANT_MISSING">Giáo viên chưa đến</option>
            <option value="DRIVER_MISSING">Tài xế chưa đến</option>
            <option value="OFF_ROUTE">Lệch tuyến</option>
            <option value="LATE_STOP">Đón/trả chậm</option>
          </select>
        </div>

        {/* Status filter */}
        <div className="w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-48 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="WAITING_ASSIGNMENT">Chờ xử lý</option>
            <option value="WAITING_CONFIRMATION">Chờ xác nhận</option>
            <option value="RESOLVED">Đã xử lý</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="CLOSED">Đã đóng</option>
          </select>
        </div>

        {/* Date filter */}
        <div className="w-full sm:w-auto">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-44 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
          />
        </div>

        {/* Reset filter button */}
        {(schoolFilter || typeFilter !== 'ALL' || statusFilter !== 'ALL' || dateFilter) && (
          <button
            onClick={() => {
              setSchoolFilter('');
              setTypeFilter('ALL');
              setStatusFilter('ALL');
              setDateFilter('');
              setPage(1);
            }}
            className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            Đặt lại
          </button>
        )}
      </div>

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
            <table className="w-full text-left text-xs border-collapse">
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
                      {canResolve(inc) && (
                        <button
                          onClick={() => setSelectedIncidentForResolve(inc)}
                          className="px-3 py-1.5 text-xs font-bold text-slate-900 bg-[#FFCB56] hover:bg-[#f5be38] rounded-xl shadow-sm transition-colors cursor-pointer"
                        >
                          Xử lý
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedIncidentForDetail(inc)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="p-4 border-t border-slate-100">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-800">
                Chi tiết: {getTypeLabel(selectedIncidentForDetail.type)}
              </h3>
              <button
                onClick={() => setSelectedIncidentForDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3.5 text-xs text-slate-700">
              <div>
                <span className="font-semibold text-slate-500 block mb-0.5">Chuyến xe:</span>
                <span className="font-medium text-slate-900">
                  {selectedIncidentForDetail.routeName} ({selectedIncidentForDetail.serviceDate})
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-500 block mb-0.5">Trạng thái:</span>
                {getStatusBadge(selectedIncidentForDetail.status)}
              </div>
              {selectedIncidentForDetail.description && (
                <div>
                  <span className="font-semibold text-slate-500 block mb-0.5">Nội dung báo:</span>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    {selectedIncidentForDetail.description}
                  </div>
                </div>
              )}
              {selectedIncidentForDetail.context && (
                <div>
                  <span className="font-semibold text-slate-500 block mb-0.5">Bằng chứng kỹ thuật:</span>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 font-mono text-[11px] text-slate-600 overflow-x-auto">
                    {selectedIncidentForDetail.type === 'OFF_ROUTE' && (
                      <p>
                        Khoảng cách lệch: {selectedIncidentForDetail.context.distanceMeters}m (ngưỡng 100m) · Thời gian lệch: {selectedIncidentForDetail.context.durationSeconds}s
                      </p>
                    )}
                    {selectedIncidentForDetail.type === 'LATE_STOP' && (
                      <p>
                        Trạm: {selectedIncidentForDetail.context.stopAddress || 'Trạm đón/trả'} · Độ trễ: {Math.round(selectedIncidentForDetail.context.delaySeconds / 60)} phút · Thời gian duy trì: {selectedIncidentForDetail.context.durationSeconds}s
                      </p>
                    )}
                    {selectedIncidentForDetail.type !== 'OFF_ROUTE' && selectedIncidentForDetail.type !== 'LATE_STOP' && (
                      <pre>{JSON.stringify(selectedIncidentForDetail.context, null, 2)}</pre>
                    )}
                  </div>
                </div>
              )}
              {selectedIncidentForDetail.resolution && (
                <div>
                  <span className="font-semibold text-slate-500 block mb-0.5">Kết quả xử lý / Giải trình:</span>
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
                    <p className="font-medium">
                      Hành động: {selectedIncidentForDetail.resolution.action || 'Xử lý'}
                    </p>
                    {selectedIncidentForDetail.resolution.reason && (
                      <p className="mt-1 text-slate-700">
                        Lý do: {selectedIncidentForDetail.resolution.reason}
                      </p>
                    )}
                    {selectedIncidentForDetail.processedByName && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Người thực hiện: {selectedIncidentForDetail.processedByName} (
                        {new Date(selectedIncidentForDetail.processedAt || '').toLocaleString('vi-VN')})
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <button
                onClick={() => setSelectedIncidentForDetail(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
