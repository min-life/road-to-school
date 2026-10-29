'use client';

import { toast } from '@/stores/toast-store';

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { ApprovalReadinessResponse, Role } from '@/lib/types';
import { AlertIcon, InfoIcon, SpinnerIcon } from '@/components/icons';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ApprovalReadinessCardProps {
  planId: string;
  currentUserRole: Role | null;
  readiness: ApprovalReadinessResponse | null;
  loading: boolean;
  onApproved: () => void;
  onRefresh: () => void;
}

export function ApprovalReadinessCard({
  planId,
  currentUserRole,
  readiness,
  loading,
  onApproved,
  onRefresh,
}: ApprovalReadinessCardProps) {
  const [approving, setApproving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const isSchoolAdmin = currentUserRole === 'SCHOOL_ADMIN';
  const isReady = readiness?.isReadyForApproval ?? false;

  const handleApprove = async () => {
    try {
      setApproving(true);
      setApprovalError(null);
      await apiClient.approveRoutePlan(planId);
      toast.success('Đã duyệt phương án tuyến.');
      setShowConfirmModal(false);
      onApproved();
    } catch (err: any) {
      setApprovalError(err?.message || 'Không thể phê duyệt phương án');
    } finally {
      setApproving(false);
    }
  };

  if (loading && !readiness) {
    return (
      <Card className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-center gap-3">
        <SpinnerIcon className="w-5 h-5 animate-spin text-primary" />
        <span className="text-xs text-slate-500 font-medium">Đang kiểm tra điều kiện sẵn sàng phê duyệt...</span>
      </Card>
    );
  }

  if (!readiness) return null;

  return (
    <Card className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Điều kiện phê duyệt phương án
            </span>
            {isReady ? (
              <Badge className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Đủ điều kiện kích hoạt
              </Badge>
            ) : (
              <Badge className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Chưa đủ điều kiện
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Trường: <strong className="text-slate-700">{readiness.schoolName}</strong> • {readiness.totalRoutes} tuyến • {readiness.totalVehicles} nhóm xe
          </p>
        </div>

        {/* Action Button: School Admin Only */}
        {isSchoolAdmin && (
          <Button
            onClick={() => setShowConfirmModal(true)}
            disabled={!isReady || approving}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 ${
              isReady && !approving
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            {approving && <SpinnerIcon className="w-4 h-4 animate-spin text-white" />}
            <span>Xác nhận phương án (Kích hoạt)</span>
          </Button>
        )}

        {!isSchoolAdmin && (
          <div className="text-[11px] text-slate-400 italic">
            * Quyền phê duyệt thuộc độc quyền của Quản trị trường học (SCHOOL_ADMIN)
          </div>
        )}
      </div>

      {/* Checklist items */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Xe */}
        <div
          className={`p-3 rounded-xl border text-xs ${
            readiness.summary.missingVehicleRoutes === 0
              ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-900'
              : 'bg-rose-50/50 border-rose-200/80 text-rose-900'
          }`}
        >
          <div className="font-bold flex items-center justify-between mb-1">
            <span>Phương tiện (Xe)</span>
            <span>{readiness.summary.missingVehicleRoutes === 0 ? '✓ Đủ' : '✗ Thiếu'}</span>
          </div>
          <p className="text-[11px] opacity-80">
            {readiness.summary.missingVehicleRoutes === 0
              ? 'Tất cả tuyến đã được gán xe hợp lệ'
              : `Còn ${readiness.summary.missingVehicleRoutes} tuyến chưa gán xe`}
          </p>
        </div>

        {/* Tài xế */}
        <div
          className={`p-3 rounded-xl border text-xs ${
            readiness.summary.missingDriverRoutes === 0
              ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-900'
              : 'bg-rose-50/50 border-rose-200/80 text-rose-900'
          }`}
        >
          <div className="font-bold flex items-center justify-between mb-1">
            <span>Tài xế</span>
            <span>{readiness.summary.missingDriverRoutes === 0 ? '✓ Đủ' : '✗ Thiếu'}</span>
          </div>
          <p className="text-[11px] opacity-80">
            {readiness.summary.missingDriverRoutes === 0
              ? 'Tất cả nhóm xe đã có tài xế phụ trách'
              : `Còn ${readiness.summary.missingDriverRoutes} tuyến chưa có tài xế`}
          </p>
        </div>

        {/* Giáo viên / Phụ xe */}
        <div
          className={`p-3 rounded-xl border text-xs ${
            readiness.summary.missingBusAttendantRoutes === 0
              ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-900'
              : 'bg-rose-50/50 border-rose-200/80 text-rose-900'
          }`}
        >
          <div className="font-bold flex items-center justify-between mb-1">
            <span>Giáo viên / Phụ xe</span>
            <span>{readiness.summary.missingBusAttendantRoutes === 0 ? '✓ Đủ' : '✗ Thiếu'}</span>
          </div>
          <p className="text-[11px] opacity-80">
            {readiness.summary.missingBusAttendantRoutes === 0
              ? 'Tất cả nhóm xe đã có giáo viên phụ xe'
              : `Còn ${readiness.summary.missingBusAttendantRoutes} tuyến chưa có giáo viên`}
          </p>
        </div>
      </div>

      {/* Blockers list */}
      {readiness.blockers.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
            <AlertIcon className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Các vấn đề cần hoàn tất trước khi phê duyệt ({readiness.blockers.length}):</span>
          </div>
          <ul className="list-disc list-inside text-xs text-amber-800 space-y-1 pl-1">
            {readiness.blockers.map((b, idx) => (
              <li key={idx} className="leading-relaxed">
                {b.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <Card className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <InfoIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Xác nhận phê duyệt phương án</h3>
                <p className="text-xs text-slate-500">Chuyển trạng thái sang ACTIVE để đưa vào vận hành</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 space-y-2">
              <p>
                Sau khi phê duyệt, phương án tuyến sẽ chính thức chuyển sang <strong>ACTIVE</strong>:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-1 text-slate-700">
                <li>Hệ thống bắt đầu sinh chuyến xe tự động từ ngày học kế tiếp.</li>
                <li>Không thể hủy phương án một khi đã chuyển sang ACTIVE.</li>
                <li>Mọi phân công xe, tài xế và giáo viên hiện tại sẽ được lưu thành mặc định.</li>
              </ul>
            </div>

            {approvalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {approvalError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={approving}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Hủy bỏ
              </Button>
              <Button
                type="button"
                onClick={handleApprove}
                disabled={approving}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-xs"
              >
                {approving && <SpinnerIcon className="w-4 h-4 animate-spin text-white" />}
                <span>Đồng ý phê duyệt</span>
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Card>
  );
}
