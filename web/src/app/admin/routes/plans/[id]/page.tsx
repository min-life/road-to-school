'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { RoutePlanItem, RouteItem, Role, ApprovalReadinessResponse } from '@/lib/types';
import {
  RouteIcon,
  ChevronLeftIcon,
  SpinnerIcon,
  AlertIcon,
  InfoIcon,
} from '@/components/icons';
import { CancelRoutePlanModal } from '@/components/admin/routes/cancel-route-plan-modal';
import { ApprovalReadinessCard } from '@/components/admin/routes/approval-readiness-card';
import { RoutePlanAssignments } from '@/components/admin/routes/route-plan-assignments';
import { authStorage } from '@/lib/auth-storage';

export default function RoutePlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: planId } = use(params);
  const router = useRouter();

  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const [plan, setPlan] = useState<RoutePlanItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Approval readiness state
  const [readiness, setReadiness] = useState<ApprovalReadinessResponse | null>(null);
  const [loadingReadiness, setLoadingReadiness] = useState(false);

  // Tab filter: 'ALL' | 'TO_SCHOOL' | 'TO_PARKING'
  const [activeTab, setActiveTab] = useState<'ALL' | 'TO_SCHOOL' | 'TO_PARKING'>('ALL');

  // Cancel Modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  useEffect(() => {
    const user = authStorage.getUser();
    if (user) {
      setCurrentUserRole(user.role);
    }
  }, []);

  const loadReadiness = useCallback(async () => {
    if (!planId) return;
    try {
      setLoadingReadiness(true);
      const res = await apiClient.getApprovalReadiness(planId);
      setReadiness(res);
    } catch (err) {
      console.error('Failed to load readiness', err);
    } finally {
      setLoadingReadiness(false);
    }
  }, [planId]);

  const loadPlanDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.getRoutePlanDetail(planId);
      setPlan(res);
      if (res.status === 'DRAFT') {
        loadReadiness();
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể tải thông tin chi tiết phương án tuyến');
    } finally {
      setLoading(false);
    }
  }, [planId, loadReadiness]);

  useEffect(() => {
    loadPlanDetail();
  }, [loadPlanDetail]);

  const isSystemAdmin = currentUserRole === 'SYSTEM_ADMIN';
  const isDraft = plan?.status === 'DRAFT';
  const isActive = plan?.status === 'ACTIVE';

  const formatDateTime = (isoDate: string) => {
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoDate;
    }
  };

  const allRoutes = plan?.routes || [];
  const outboundRoutes = allRoutes.filter((r) => r.direction === 'TO_SCHOOL');
  const returnRoutes = allRoutes.filter((r) => r.direction === 'TO_PARKING');

  const displayedRoutes =
    activeTab === 'TO_SCHOOL'
      ? outboundRoutes
      : activeTab === 'TO_PARKING'
      ? returnRoutes
      : allRoutes;

  if (loading) {
    return (
      <div className="py-20 text-center">
        <SpinnerIcon className="w-8 h-8 animate-spin mx-auto text-[#FFCB56] mb-3" />
        <p className="text-sm text-slate-500">Đang tải chi tiết phương án tuyến...</p>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/routes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          <span>Quay lại danh sách phương án</span>
        </Link>
        <div className="p-8 rounded-2xl bg-white border border-rose-200 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <AlertIcon className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-800">Không tìm thấy phương án tuyến</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{error || 'Phương án không tồn tại hoặc bạn không có quyền truy cập.'}</p>
          <button
            onClick={() => router.push('/admin/routes')}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Về trang danh sách
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/routes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          <span>Quay lại danh sách phương án</span>
        </Link>
        <span className="text-xs text-slate-400">
          Mã phương án: <code className="text-slate-600 font-mono text-[11px]">{plan.id.slice(0, 8)}...</code>
        </span>
      </div>

      {/* Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">{plan.name}</h1>
            {isActive ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ACTIVE
              </span>
            ) : isDraft ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                DRAFT
              </span>
            ) : plan.status === 'EXPIRED' ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                EXPIRED
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                CANCELLED
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Trường: <strong className="text-slate-700 font-semibold">{plan.schoolName || '—'}</strong> • Tạo ngày:{' '}
            {formatDateTime(plan.createdAt)}
            {isActive && plan.activatedAt && (
              <>
                {' '}• Kích hoạt:{' '}
                <strong className="text-emerald-700 font-semibold">{formatDateTime(plan.activatedAt)}</strong>
                {plan.approvedByName && <span> bởi {plan.approvedByName}</span>}
              </>
            )}
          </p>
        </div>

        {/* Cancellation Action:
            - DRAFT: System Admin only
            - ACTIVE: System Admin (all) or School Admin (own school)
        */}
        {(isDraft || isActive) &&
          (isSystemAdmin || (currentUserRole === 'SCHOOL_ADMIN' && isActive)) && (
          <button
            onClick={() => setIsCancelModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer shrink-0"
          >
            <AlertIcon className="w-4 h-4 text-rose-600" />
            <span>Hủy phương án</span>
          </button>
        )}
      </div>

      {/* Approval Readiness Card (Only for DRAFT) */}
      {isDraft && (
        <ApprovalReadinessCard
          planId={plan.id}
          currentUserRole={currentUserRole}
          readiness={readiness}
          loading={loadingReadiness}
          onApproved={() => {
            loadPlanDetail();
          }}
          onRefresh={loadReadiness}
        />
      )}

      {/* Notice if Expired */}
      {plan.status === 'EXPIRED' && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-start gap-3">
          <InfoIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <strong className="font-semibold text-amber-950">Phương án đã hết hạn hợp đồng:</strong>{' '}
            Hợp đồng của trường học đã kết thúc. Các chuyến xe đã lập lịch liên quan đã được tự động đóng. Dữ liệu lịch sử và các chuyến đã thực hiện được bảo tồn nguyên vẹn.
          </div>
        </div>
      )}

      {/* Cancellation Notice if Cancelled */}
      {plan.status === 'CANCELLED' && (
        <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 flex items-start gap-3">
          <AlertIcon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900 leading-relaxed">
            <strong className="font-semibold text-rose-950">Phương án đã bị hủy bỏ:</strong>{' '}
            Toàn bộ giữ chỗ lịch trình xe và học sinh đã được giải phóng.{' '}
            {plan.cancelledAt && <span>Thời điểm hủy: {formatDateTime(plan.cancelledAt)}. </span>}
            {plan.cancellationReason && (
              <span className="block mt-1 text-rose-800">
                Lý do hủy: &ldquo;{plan.cancellationReason}&rdquo;
              </span>
            )}
          </div>
        </div>
      )}

      {/* Resource Assignment Groups */}
      {!plan.cancelledAt && (
        <RoutePlanAssignments
          plan={plan}
          currentUserRole={currentUserRole}
          onUpdated={() => {
            loadPlanDetail();
          }}
        />
      )}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng số tuyến */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Tổng số tuyến
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-800">{allRoutes.length}</span>
            <span className="text-xs text-slate-500 font-medium">tuyến</span>
          </div>
        </div>

        {/* Card 2: Tuyến chiều đi */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">
            Tuyến chiều đi
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-700">{outboundRoutes.length || plan.totalOutboundRoutes}</span>
            <span className="text-xs text-emerald-600 font-medium">tuyến</span>
          </div>
        </div>

        {/* Card 3: Tuyến chiều về */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider block mb-1">
            Tuyến chiều về
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-sky-700">{returnRoutes.length || plan.totalReturnRoutes}</span>
            <span className="text-xs text-sky-600 font-medium">tuyến</span>
          </div>
        </div>

        {/* Card 4: Học sinh dự kiến (Distinct Students) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-[#b48010] uppercase tracking-wider block mb-1">
            {isDraft ? 'Học sinh dự kiến' : 'Học sinh'}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{plan.totalStudents}</span>
            <span className="text-xs text-slate-500 font-medium">học sinh</span>
          </div>
        </div>
      </div>

      {/* Member Routes Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Tabs Header */}
        <div className="px-6 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <RouteIcon className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-800">Danh sách các tuyến thuộc phương án</h2>
          </div>

          <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({allRoutes.length})
            </button>
            <button
              onClick={() => setActiveTab('TO_SCHOOL')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'TO_SCHOOL'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chiều đi ({outboundRoutes.length || plan.totalOutboundRoutes})
            </button>
            <button
              onClick={() => setActiveTab('TO_PARKING')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'TO_PARKING'
                  ? 'bg-white text-sky-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chiều về ({returnRoutes.length || plan.totalReturnRoutes})
            </button>
          </div>
        </div>

        {/* Routes Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Tên tuyến</th>
                <th className="py-3 px-4">Chiều tuyến</th>
                <th className="py-3 px-4">Xe đề xuất</th>
                <th className="py-3 px-4">Tài xế</th>
                <th className="py-3 px-4">Giáo viên</th>
                <th className="py-3 px-4 text-center">Học sinh</th>
                <th className="py-3 px-4 text-center">Số trạm</th>
                <th className="py-3 px-4">Quãng đường</th>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {displayedRoutes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <RouteIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-medium text-slate-600">Không có tuyến nào trong danh mục này</p>
                  </td>
                </tr>
              ) : (
                displayedRoutes.map((route: RouteItem) => {
                  const isToSchool = route.direction === 'TO_SCHOOL';
                  const distanceKm = (route.totalDistanceMeters / 1000).toFixed(1);
                  const durationMins = Math.round(route.estimatedDurationSeconds / 60);

                  return (
                    <tr key={route.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        <Link
                          href={`/admin/routes/${route.id}`}
                          className="hover:text-blue-600 hover:underline flex items-center gap-2"
                        >
                          <RouteIcon className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{route.name}</span>
                        </Link>
                      </td>

                      <td className="py-3.5 px-4">
                        {isToSchool ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            Chiều đi
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/60">
                            Chiều về
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-700">
                        {route.proposedVehiclePlate ? (
                          <div>
                            <span className="font-bold text-slate-800">{route.proposedVehiclePlate}</span>
                            {route.proposedVehicleSeats && (
                              <span className="text-slate-400 block text-[11px]">
                                {route.proposedVehicleSeats} chỗ ({route.proposedVehicleBrand || 'Xe buýt'})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">Chưa gán xe</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        {route.defaultDriverName ? (
                          <span className="font-medium text-slate-800">{route.defaultDriverName}</span>
                        ) : (
                          <span className="text-slate-400 italic">Chưa gán</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        {route.defaultBusAttendantName ? (
                          <span className="font-medium text-slate-800">{route.defaultBusAttendantName}</span>
                        ) : (
                          <span className="text-slate-400 italic">Chưa gán</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {route.studentCount === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertIcon className="w-3 h-3 text-rose-600" />
                            0 (Vi phạm)
                          </span>
                        ) : (
                          <span className="font-bold text-slate-800">{route.studentCount}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center text-xs text-slate-500">
                        {route.stops?.length || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {distanceKm} km
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {durationMins} phút
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/admin/routes/${route.id}`}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-[#FFCB56] hover:text-slate-900 transition-colors"
                        >
                          Xem bản đồ
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unassigned Students Section if any exist from optimization */}
      {plan.unassignedStudents && plan.unassignedStudents.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-amber-100 pb-2.5">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Học sinh chưa thể phân tuyến ({plan.unassignedStudents.length} em)</span>
            </h3>
            {plan.coverage && (
              <span className="text-xs font-semibold text-slate-500">
                Độ bao phủ: {Math.round(plan.coverage.coverageRate * 100)}% ({plan.coverage.assignedCount}/{plan.coverage.totalSelected} em)
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {plan.unassignedStudents.map((s) => (
              <div key={s.id} className="p-3 rounded-xl border border-amber-200/80 bg-amber-50/30 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-800">{s.fullName}</p>
                  {s.missingDirection && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      {s.missingDirection === 'RETURN' && 'Thiếu chiều về'}
                      {s.missingDirection === 'OUTBOUND' && 'Thiếu chiều đi'}
                      {s.missingDirection === 'BOTH' && 'Không xếp được 2 chiều'}
                    </span>
                  )}
                </div>
                {s.addressText && <p className="text-slate-500 truncate">{s.addressText}</p>}
                <p className="text-amber-800 font-medium">Lý do: {s.reason || 'Vượt quá ràng buộc xe/thời gian'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel RoutePlan Modal */}
      <CancelRoutePlanModal
        isOpen={isCancelModalOpen}
        routePlanId={plan.id}
        routePlanName={plan.name}
        onClose={() => setIsCancelModalOpen(false)}
        onSuccess={() => {
          setIsCancelModalOpen(false);
          loadPlanDetail();
        }}
      />
    </div>
  );
}
