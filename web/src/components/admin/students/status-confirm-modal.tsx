'use client';

import React, { useState, useEffect } from 'react';
import { SpinnerIcon, AlertIcon } from '@/components/icons';
import { apiClient } from '@/lib/api-client';
import type { StudentListItem, StudentStatus, StudentDisableImpactResponse } from '@/lib/types';

interface StatusConfirmModalProps {
  isOpen: boolean;
  schoolId?: string;
  student: StudentListItem | null;
  targetStatus: StudentStatus | null;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function StatusConfirmModal({
  isOpen,
  schoolId,
  student,
  targetStatus,
  isLoading,
  onClose,
  onConfirm,
}: StatusConfirmModalProps) {
  const [impact, setImpact] = useState<StudentDisableImpactResponse | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);

  const isDisabling = targetStatus === 'DISABLED';

  useEffect(() => {
    if (isOpen && isDisabling && student && schoolId) {
      setLoadingImpact(true);
      apiClient
        .getStudentDisableImpact(schoolId, student.id)
        .then(setImpact)
        .catch((err) => console.warn('Could not load disable impact', err))
        .finally(() => setLoadingImpact(false));
    } else {
      setImpact(null);
    }
  }, [isOpen, isDisabling, student, schoolId]);

  if (!isOpen || !student || !targetStatus) return null;

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
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              {isDisabling ? (
                <>
                  Học sinh{' '}
                  <strong className="text-slate-900">{student.fullName}</strong> (
                  {student.code}) sẽ chuyển sang trạng thái <strong>Đã vô hiệu hóa</strong>.
                </>
              ) : (
                <>
                  Học sinh{' '}
                  <strong className="text-slate-900">{student.fullName}</strong> (
                  {student.code}) sẽ chuyển sang trạng thái <strong>Khả dụng</strong>.
                </>
              )}
            </p>

            {/* Thống kê tác động khi vô hiệu hóa */}
            {isDisabling && (
              <div className="mt-3">
                {loadingImpact ? (
                  <div className="py-2 flex items-center gap-2 text-xs text-slate-400">
                    <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang kiểm tra tác động phân tuyến...</span>
                  </div>
                ) : impact ? (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 text-slate-700">
                    <div className="flex items-center justify-between">
                      <span>Tuyến ACTIVE đang tham gia:</span>
                      <span className="font-bold text-amber-700">
                        {impact.activeRoutePlansCount} phương án
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Tuyến DRAFT đang tham gia:</span>
                      <span className="font-bold text-slate-700">
                        {impact.draftRoutePlansCount} phương án
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Chuyến SCHEDULED sẽ loại học sinh:</span>
                      <span className="font-bold text-rose-600">
                        {impact.scheduledTripsCount} chuyến
                      </span>
                    </div>
                    {impact.emptyRoutesWillCancelTripsCount > 0 && (
                      <div className="flex items-center justify-between text-rose-700 font-medium">
                        <span>Chuyến xe bị hủy do tuyến rỗng:</span>
                        <span className="font-bold">
                          {impact.emptyRoutesWillCancelTripsCount} chuyến
                        </span>
                      </div>
                    )}

                    {impact.emptyRoutePlans && impact.emptyRoutePlans.length > 0 && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1.5">
                        <div className="font-bold text-xs flex items-center gap-1.5 text-rose-700">
                          <AlertIcon className="w-4 h-4 shrink-0 text-rose-600" />
                          <span>VI PHẠM QUY TẮC: CẤM TUYẾN 0 HỌC SINH</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-rose-800">
                          Học sinh này là người duy nhất còn lại trên tuyến{' '}
                          <strong>{Array.from(new Set(impact.emptyRoutePlans.map((p) => p.routeName))).join(', ')}</strong>{' '}
                          thuộc phương án{' '}
                          <strong>{Array.from(new Set(impact.emptyRoutePlans.map((p) => p.planName))).join(', ')}</strong>.
                        </p>
                        <p className="text-[11px] font-semibold text-rose-900">
                          Hệ thống không cho phép tuyến xe không có học sinh. Bắt buộc phải hủy toàn bộ phương án để tối ưu lại lộ trình sau khi vô hiệu hóa.
                        </p>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-500 pt-1">
                      Các chuyến xe đang chạy hoặc đã điểm danh được bảo tồn nguyên vẹn.
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading || loadingImpact}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-xl transition-colors cursor-pointer disabled:opacity-50 ${
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
