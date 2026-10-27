'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, ApiError } from '@/lib/api-client';
import { LeaveNoticeItem } from '@/lib/types';
import { SpinnerIcon, AlertIcon, CloseIcon } from '@/components/icons';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface CancelTripModalProps {
  isOpen: boolean;
  notice: LeaveNoticeItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CancelTripModal({
  isOpen,
  notice,
  onClose,
  onSuccess,
}: CancelTripModalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !notice) return null;

  const isDriver = notice.kind === 'DRIVER';
  const roleLabel = isDriver ? 'Tài xế' : 'Giáo viên';

  const handleConfirmCancel = async () => {
    const trimmed = reason.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      await apiClient.cancelTripFromNotice(notice.id, { cancellationReason: trimmed });
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Không thể hủy chuyến xe';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-trip-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <Card className="ui-dialog-panel relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-rose-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
              <AlertIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 id="cancel-trip-modal-title" className="text-base font-bold text-rose-900">
                Hủy chuyến xe
              </h2>
              <p className="text-xs text-rose-600">
                Thao tác bất khả nghịch do không bố trí được nhân sự
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <CloseIcon className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
            <p className="font-bold">Cảnh báo quan trọng:</p>
            <p>
              Hành động hủy chuyến xe không thể khôi phục. Chuyến xe sẽ chuyển sang trạng thái
              Đã hủy, các báo nghỉ chờ phân công liên quan sẽ được tự động đóng.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500">Chuyến xe:</span>
              <span className="font-semibold text-slate-800">
                {notice.routeName || 'Tuyến'} · {notice.serviceDate}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Nhân sự báo nghỉ:</span>
              <span className="font-medium text-slate-800">
                {notice.reportedByName} ({roleLabel})
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertIcon className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Lý do hủy chuyến <span className="text-rose-500">*</span>
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do cụ thể (bắt buộc, ví dụ: Không thể bố trí nhân sự thay thế trước giờ khởi hành)..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </Button>
          <Button
            type="button"
            onClick={handleConfirmCancel}
            disabled={!reason.trim() || submitting}
            className={`px-5 py-2 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
              !reason.trim() || submitting
                ? 'bg-rose-200 text-rose-400 cursor-not-allowed'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            {submitting && <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />}
            <span>Xác nhận hủy chuyến</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
