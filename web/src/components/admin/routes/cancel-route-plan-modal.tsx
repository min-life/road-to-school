'use client';

import { toast } from '@/stores/toast-store';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import type { RoutePlanCancellationImpactResponse } from '@/lib/types';
import { AlertIcon, CloseIcon, SpinnerIcon } from '@/components/icons';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

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
      toast.success('Đã hủy phương án tuyến.');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi hủy phương án');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-route-plan-title"
      aria-describedby="cancel-route-plan-description"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-[2px] animate-in fade-in duration-150"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !loading) onClose();
      }}
    >
      <Card className="ui-dialog-panel w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600">
              <AlertIcon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 pt-0.5">
              <h2 id="cancel-route-plan-title" className="text-lg font-bold leading-6 text-slate-900">
                Hủy phương án tuyến?
              </h2>
              <p id="cancel-route-plan-description" className="mt-1 text-sm leading-5 text-slate-500">
                Thao tác này không thể hoàn tác.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={loading}
            aria-label="Đóng hộp thoại"
            className="-mr-1 -mt-1 shrink-0 text-slate-400 hover:text-slate-700"
          >
            <CloseIcon className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 py-5">
            <p className="text-sm leading-6 text-slate-600">
              Bạn đang hủy <span className="font-semibold text-slate-900">{routePlanName || 'phương án tuyến này'}</span>.
              Các chuyến đã lên lịch sẽ được xử lý như bên dưới.
            </p>

            {loadingImpact ? (
              <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
                <SpinnerIcon className="h-5 w-5 animate-spin text-amber-500" aria-hidden="true" />
                <span className="text-sm">Đang kiểm tra tác động…</span>
              </div>
            ) : impact ? (
              <section className="overflow-hidden rounded-xl border border-slate-200" aria-labelledby="cancellation-impact-title">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h3 id="cancellation-impact-title" className="text-sm font-semibold text-slate-800">Tác động khi hủy</h3>
                </div>
                <dl className="divide-y divide-slate-100 px-4 text-sm">
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-slate-600">Tuyến trong phương án</dt>
                    <dd className="shrink-0 font-semibold text-slate-900">{impact.routesCount} tuyến</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-slate-600">Chuyến đã lên lịch sẽ bị hủy</dt>
                    <dd className="shrink-0 font-semibold text-rose-600">{impact.scheduledTripsCount} chuyến</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-slate-600">Chuyến đang chạy được giữ nguyên</dt>
                    <dd className="shrink-0 font-semibold text-emerald-700">{impact.inProgressTripsCount} chuyến</dd>
                  </div>
                  {impact.pendingStaffLeaveNoticesCount > 0 && (
                    <div className="flex items-center justify-between gap-4 py-2.5">
                      <dt className="text-slate-600">Báo nghỉ chờ duyệt sẽ được đóng</dt>
                      <dd className="shrink-0 font-semibold text-amber-700">
                        {impact.pendingStaffLeaveNoticesCount} báo nghỉ
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            ) : null}

            <div>
              <label htmlFor="cancel-route-plan-reason" className="mb-2 block text-sm font-semibold text-slate-800">
                Lý do hủy <span className="text-rose-600" aria-hidden="true">*</span>
                <span className="sr-only">(bắt buộc)</span>
              </label>
              <Textarea
                id="cancel-route-plan-reason"
                rows={4}
                required
                autoFocus
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Nhập lý do hủy phương án…"
                aria-invalid={!reason.trim() && Boolean(error)}
                aria-describedby={error ? 'cancel-route-plan-error' : undefined}
                className="w-full resize-none px-3.5 py-3 text-sm leading-5"
              />
            </div>

            {error && (
              <div id="cancel-route-plan-error" role="alert" className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-5 text-rose-700">
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              type="button"
              disabled={loading}
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Giữ phương án
            </Button>
            <Button
              type="submit"
              disabled={loading || loadingImpact}
              className="w-full border border-rose-700 bg-rose-600 px-5 font-semibold text-white hover:bg-rose-700 disabled:border-rose-300 disabled:bg-rose-300 sm:w-auto"
            >
              {loading && <SpinnerIcon className="h-4 w-4 animate-spin" aria-hidden="true" />}
              <span>{loading ? 'Đang hủy…' : 'Hủy phương án'}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
