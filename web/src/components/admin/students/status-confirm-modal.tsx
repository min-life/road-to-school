'use client';

import React from 'react';
import { SpinnerIcon, AlertIcon } from '@/components/icons';
import { StudentListItem, StudentStatus } from '@/lib/types';

interface StatusConfirmModalProps {
  isOpen: boolean;
  student: StudentListItem | null;
  targetStatus: StudentStatus | null;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function StatusConfirmModal({
  isOpen,
  student,
  targetStatus,
  isLoading,
  onClose,
  onConfirm,
}: StatusConfirmModalProps) {
  if (!isOpen || !student || !targetStatus) return null;

  const isDisabling = targetStatus === 'DISABLED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200/80 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start gap-4">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              isDisabling
                ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            <AlertIcon className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-[#1E293B]">
              {isDisabling
                ? 'Xác nhận vô hiệu hóa học sinh?'
                : 'Kích hoạt lại học sinh?'}
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {isDisabling ? (
                <>
                  Học sinh{' '}
                  <strong className="text-slate-900">{student.fullName}</strong> (
                  {student.code}) sẽ chuyển sang trạng thái <strong>Đã vô hiệu hóa</strong>. Các phụ huynh đã liên kết vẫn được giữ nguyên, nhưng sẽ bị chặn các lượt liên kết mới.
                </>
              ) : (
                <>
                  Học sinh{' '}
                  <strong className="text-slate-900">{student.fullName}</strong> (
                  {student.code}) sẽ chuyển sang trạng thái <strong>Khả dụng</strong> và có thể tiếp tục liên kết với phụ huynh mới.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors cursor-pointer disabled:opacity-50 ${
              isDisabling
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isLoading && <SpinnerIcon className="w-4 h-4" />}
            <span>
              {isDisabling ? 'Xác nhận vô hiệu hóa' : 'Kích hoạt lại'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
