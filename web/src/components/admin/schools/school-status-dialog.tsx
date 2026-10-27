'use client';

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AlertIcon, SpinnerIcon, CloseIcon } from '@/components/icons';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SchoolStatusDialogProps {
  isOpen: boolean;
  schoolId: string;
  schoolName: string;
  currentIsActive: boolean;
  onClose: () => void;
  onSuccess: (newStatus: boolean) => void;
}

export function SchoolStatusDialog({
  isOpen,
  schoolId,
  schoolName,
  currentIsActive,
  onClose,
  onSuccess,
}: SchoolStatusDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetStatus = !currentIsActive;
  const actionText = targetStatus ? 'kích hoạt lại' : 'ngừng hoạt động';

  const handleConfirm = async () => {
    setErrorMessage(null);
    try {
      setIsLoading(true);
      await apiClient.updateSchoolStatus(schoolId, targetStatus);
      onSuccess(targetStatus);
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          `Không thể ${actionText} trường học. Vui lòng kiểm tra lại thời hạn hợp đồng.`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-status-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isLoading) onClose();
        }}
      />

      {/* Modal Dialog */}
      <Card className="ui-dialog-panel relative w-full max-w-md bg-white rounded-2xl shadow-2xl z-10 p-6 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                targetStatus
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-amber-50 text-amber-600'
              }`}
            >
              <AlertIcon className="w-5 h-5" />
            </div>
            <h2
              id="dialog-status-title"
              className="text-base font-bold text-slate-800"
            >
              Xác nhận {actionText}
            </h2>
          </div>
          <Button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <CloseIcon className="w-4 h-4" />
          </Button>
        </div>

        <div className="py-4 space-y-3">
          <p className="text-sm text-slate-600 leading-relaxed">
            Bạn có chắc chắn muốn {actionText} trường{' '}
            <strong className="text-slate-800 font-semibold">{schoolName}</strong> không?
          </p>

          {!targetStatus && (
            <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              Lưu ý: Khi ngừng hoạt động, trường học sẽ không thể thêm quản trị trường mới. Dữ liệu trường và nhân viên vẫn được bảo toàn.
            </p>
          )}

          {targetStatus && (
            <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              Lưu ý: Chỉ có thể kích hoạt lại nếu hợp đồng của trường vẫn còn trong thời hạn hiệu lực.
            </p>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm"
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            Hủy bỏ
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50 ${
              targetStatus
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
          >
            {isLoading ? (
              <>
                <SpinnerIcon className="w-4 h-4 animate-spin text-white" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <span>Xác nhận</span>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
