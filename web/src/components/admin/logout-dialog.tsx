'use client';

import React, { useEffect, useRef } from 'react';
import { LogoutIcon, SpinnerIcon } from '@/components/icons';

interface LogoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export function LogoutDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: LogoutDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Xử lý phím Escape để đóng hộp thoại
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200/80 p-6 flex flex-col text-left animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shrink-0">
            <LogoutIcon className="w-5 h-5" />
          </div>
          <div>
            <h3
              id="logout-dialog-title"
              className="text-base font-bold text-[#1E293B]"
            >
              Xác nhận đăng xuất
            </h3>
            <span className="text-xs text-slate-500">
              Kết thúc phiên làm việc hiện tại
            </span>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Bạn có chắc chắn muốn đăng xuất khỏi Cổng Quản trị RoadToSchool? Mọi thay đổi chưa lưu có thể bị mất.
        </p>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <SpinnerIcon className="w-4 h-4 text-white" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <span>Đăng xuất</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
