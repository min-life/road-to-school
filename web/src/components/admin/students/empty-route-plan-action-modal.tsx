'use client';

import React from 'react';
import { AlertIcon, CloseIcon } from '@/components/icons';
import type { EmptyRoutePlanInfo } from '@/lib/types';

interface EmptyRoutePlanActionModalProps {
  isOpen: boolean;
  studentName?: string;
  emptyRoutePlans: EmptyRoutePlanInfo[];
  onCancelPlanNow: (plan: EmptyRoutePlanInfo) => void;
  onClose: () => void;
}

export function EmptyRoutePlanActionModal({
  isOpen,
  studentName,
  emptyRoutePlans,
  onCancelPlanNow,
  onClose,
}: EmptyRoutePlanActionModalProps) {
  if (!isOpen || !emptyRoutePlans || emptyRoutePlans.length === 0) return null;

  const targetPlan = emptyRoutePlans[0];
  const distinctRouteNames = Array.from(
    new Set(emptyRoutePlans.map((p) => p.routeName)),
  ).join(', ');
  const distinctPlanNames = Array.from(
    new Set(emptyRoutePlans.map((p) => p.planName)),
  ).join(', ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-rose-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-rose-100 flex items-center justify-between bg-rose-50/70">
          <div className="flex items-center gap-2.5 text-rose-700">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
              <AlertIcon className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Yêu cầu hủy phương án: Tuyến 0 học sinh
              </h3>
              <p className="text-[11px] text-rose-600 font-medium">
                Quy tắc vận hành: Cấm tuyến xe không có học sinh
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Phương án bị ảnh hưởng:</span>
              <span className="font-bold text-slate-900">{distinctPlanNames}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Tuyến xe trở thành rỗng:</span>
              <span className="font-bold text-rose-600">{distinctRouteNames}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Số lượng học sinh còn lại:</span>
              <span className="font-bold text-rose-700">0 học sinh (Không hợp lệ)</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Học sinh {studentName ? <strong className="text-slate-900">{studentName}</strong> : 'vừa chọn'} đã được vô hiệu hóa thành công. Tuy nhiên, đây là học sinh duy nhất của tuyến <strong>{distinctRouteNames}</strong>.
          </p>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
            <strong>Bất biến hệ thống:</strong> Tuyến xe không có học sinh sẽ không thể sinh chuyến hoặc vận hành. Để giải phóng xe, tài xế và tính toán lại lộ trình chuẩn xác, bạn nên hủy toàn bộ phương án <strong>{distinctPlanNames}</strong> ngay bây giờ.
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Để sau
            </button>
            <button
              type="button"
              onClick={() => onCancelPlanNow(targetPlan)}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <AlertIcon className="w-3.5 h-3.5" />
              <span>Hủy toàn bộ phương án ngay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
