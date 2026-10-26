'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import type { RoutePlanCancellationImpactResponse } from '@/lib/types';
import { AlertIcon, CloseIcon, SpinnerIcon } from '@/components/icons';

interface CancelRoutePlanModalProps {
  isOpen: boolean;
  routePlanId: string;
  routePlanName?: string;
  defaultReason?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CancelRoutePlanModal({
  isOpen,
  routePlanId,
  routePlanName,
  defaultReason,
  onClose,
  onSuccess,
}: CancelRoutePlanModalProps) {
  const [reason, setReason] = useState(defaultReason || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [impact, setImpact] = useState<RoutePlanCancellationImpactResponse | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);

  useEffect(() => {
    if (isOpen && routePlanId) {
      setReason(defaultReason || '');
      setError(null);
      setLoadingImpact(true);
      apiClient
        .getRoutePlanCancellationImpact(routePlanId)
        .then((res) => setImpact(res))
        .catch((err) => setError(err?.message || 'Không thể lấy thông tin tác động hủy'))
        .finally(() => setLoadingImpact(false));
    }
  }, [isOpen, routePlanId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do hủy phương án tuyến (bắt buộc)');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await apiClient.cancelRoutePlan(routePlanId, reason.trim(), impact?.fingerprint);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi hủy phương án');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-rose-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2.5 text-rose-700">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
              <AlertIcon className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Hủy phương án tuyến</h3>
              <p className="text-xs text-rose-600 font-medium">Cascade hủy các chuyến xe đã lập lịch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {loadingImpact ? (
            <div className="py-6 flex flex-col items-center justify-center text-slate-400 gap-2">
              <SpinnerIcon className="w-6 h-6 animate-spin text-amber-500" />
              <span className="text-xs">Đang tải thông tin tác động...</span>
            </div>
          ) : impact ? (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-slate-700">
              <div className="flex items-center justify-between">
                <span>Số tuyến thuộc phương án:</span>
                <span className="font-bold text-slate-900">{impact.routesCount} tuyến</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Chuyến xe SCHEDULED sẽ bị hủy:</span>
                <span className="font-bold text-rose-600">{impact.scheduledTripsCount} chuyến</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Chuyến xe đang chạy (IN_PROGRESS) giữ nguyên:</span>
                <span className="font-bold text-emerald-600">{impact.inProgressTripsCount} chuyến</span>
              </div>
              {impact.pendingStaffLeaveNoticesCount > 0 && (
                <div className="flex items-center justify-between">
                  <span>Thông báo nghỉ nhân sự chờ duyệt sẽ đóng:</span>
                  <span className="font-bold text-amber-700">
                    {impact.pendingStaffLeaveNoticesCount} thông báo
                  </span>
                </div>
              )}
            </div>
          ) : null}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Lý do hủy phương án <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Thay đổi kế hoạch học kỳ, điều chỉnh cơ sở vật chất..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-rose-400 focus:ring-2 focus:ring-rose-100 resize-none"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Quay lại
            </button>
            <button
              type="submit"
              disabled={loading || loadingImpact}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              {loading && <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />}
              <span>Xác nhận hủy</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
