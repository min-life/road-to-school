'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, ApiError } from '@/lib/api-client';
import { LeaveNoticeItem, ReplacementCandidateItem } from '@/lib/types';
import { SpinnerIcon, AlertIcon, CheckIcon, UsersIcon, CloseIcon } from '@/components/icons';

interface ReplacementModalProps {
  isOpen: boolean;
  notice: LeaveNoticeItem | null;
  onClose: () => void;
  onSuccess: () => void;
  onOpenCancelTrip: (notice: LeaveNoticeItem) => void;
}

export function ReplacementModal({
  isOpen,
  notice,
  onClose,
  onSuccess,
  onOpenCancelTrip,
}: ReplacementModalProps) {
  const [candidates, setCandidates] = useState<ReplacementCandidateItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !notice) {
      setCandidates([]);
      setSelectedUserId('');
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedUserId('');

    apiClient
      .getReplacementCandidates(notice.id)
      .then((res) => {
        setCandidates(res.candidates || []);
      })
      .catch((err) => {
        const msg = err instanceof ApiError ? err.message : 'Không thể tải danh sách ứng viên';
        setError(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, notice]);

  if (!isOpen || !notice) return null;

  const isDriver = notice.kind === 'DRIVER';
  const roleLabel = isDriver ? 'Tài xế' : 'Giáo viên';
  const directionText =
    notice.direction === 'TO_SCHOOL'
      ? 'Chiều đi (đến trường)'
      : notice.direction === 'TO_PARKING'
      ? 'Chiều về (về nhà)'
      : '';

  const handleAssign = async () => {
    if (!selectedUserId || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      await apiClient.assignReplacement(notice.id, { replacementUserId: selectedUserId });
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Phân công thay thế thất bại';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const eligibleCandidates = candidates.filter((c) => c.isAvailable);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="replacement-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#FFFDF6]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFCB56]/30 flex items-center justify-center text-[#1E293B]">
              <UsersIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 id="replacement-modal-title" className="text-base font-bold text-slate-800">
                Bố trí {roleLabel} thay thế
              </h2>
              <p className="text-xs text-slate-500">
                Chỉ định nhân sự khả dụng cho chuyến xe có báo nghỉ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Context Card */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2 text-xs text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500">Người báo nghỉ:</span>
              <span className="font-semibold text-slate-800">
                {notice.reportedByName || 'Không xác định'} ({roleLabel})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Chuyến xe:</span>
              <span className="font-medium text-slate-800">
                {notice.routeName || 'Tuyến'} · {directionText}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ngày phục vụ:</span>
              <span className="font-medium text-slate-800">{notice.serviceDate || 'N/A'}</span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertIcon className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Candidate List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Chọn {roleLabel} thay thế ({eligibleCandidates.length} khả dụng)
              </label>
            </div>

            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                <SpinnerIcon className="w-6 h-6 animate-spin text-[#FFCB56]" />
                <span className="text-xs">Đang kiểm tra lịch và tính khả dụng...</span>
              </div>
            ) : candidates.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Không tìm thấy nhân sự phù hợp trong hệ thống.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {candidates.map((cand) => {
                  const isSelected = selectedUserId === cand.id;
                  return (
                    <div
                      key={cand.id}
                      onClick={() => {
                        if (cand.isAvailable) {
                          setSelectedUserId(cand.id);
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all text-xs flex items-center justify-between ${
                        !cand.isAvailable
                          ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'bg-amber-50/80 border-[#FFCB56] ring-1 ring-[#FFCB56] cursor-pointer'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-[#FFCB56] bg-[#FFCB56]'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <CheckIcon className="w-3 h-3 text-slate-900" />}
                        </div>
                        <div className="truncate">
                          <p className="font-semibold text-slate-800 truncate">{cand.fullName}</p>
                          <p className="text-[11px] text-slate-500">
                            {cand.phone || cand.email || 'Chưa cập nhật liên hệ'}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right ml-2">
                        {cand.isAvailable ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Khả dụng
                          </span>
                        ) : (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 max-w-[160px] inline-block truncate"
                            title={cand.unavailableReason || 'Không đủ điều kiện'}
                          >
                            {cand.unavailableReason || 'Bận / Không đủ ĐK'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onOpenCancelTrip(notice)}
            disabled={submitting}
            className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer"
          >
            Hủy chuyến xe...
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleAssign}
              disabled={!selectedUserId || submitting}
              className={`px-5 py-2 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                !selectedUserId || submitting
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-[#FFCB56] hover:bg-[#f5c042] text-[#1E293B]'
              }`}
            >
              {submitting && <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />}
              <span>Xác nhận phân công</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
