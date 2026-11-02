'use client';

import { toast } from '@/stores/toast-store';

import React, { useState, useEffect } from 'react';
import { apiClient, ApiError } from '@/lib/api-client';
import { TripIncident, IncidentCandidate } from '@/lib/types';
import { SpinnerIcon, AlertIcon, CloseIcon } from '@/components/icons';

interface ResolveIncidentModalProps {
  incident: TripIncident | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ResolveIncidentModal({
  incident,
  isOpen,
  onClose,
  onSuccess,
}: ResolveIncidentModalProps) {
  const [action, setAction] = useState<'ARRIVED' | 'REPLACED'>('ARRIVED');
  const [candidates, setCandidates] = useState<IncidentCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sub-modal for Cancel Trip
  const [showCancelTripConfirm, setShowCancelTripConfirm] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');

  useEffect(() => {
    if (isOpen && incident) {
      setAction('ARRIVED');
      setReason('');
      setError(null);
      setShowCancelTripConfirm(false);
      setCancelReason('');

      // Fetch replacement candidates
      setLoadingCandidates(true);
      apiClient
        .getIncidentReplacementCandidates(incident.id)
        .then((res) => {
          setCandidates(res.candidates || []);
          if (res.candidates?.length) {
            setSelectedCandidateId(res.candidates[0].id);
          } else {
            setSelectedCandidateId('');
          }
        })
        .catch((err) => {
          setError(
            err instanceof ApiError ? err.message : 'Không thể tải danh sách ứng viên thay thế',
          );
        })
        .finally(() => {
          setLoadingCandidates(false);
        });
    }
  }, [isOpen, incident]);

  if (!isOpen || !incident) return null;

  const isAttendantMissing = incident.type === 'ATTENDANT_MISSING';
  const roleTitle = isAttendantMissing ? 'Giáo viên phụ xe' : 'Tài xế';

  const handleSubmitResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (action === 'REPLACED' && !selectedCandidateId) {
      setError('Vui lòng chọn nhân sự thay thế');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.resolveIncident(incident.id, {
        action,
        replacementUserId: action === 'REPLACED' ? selectedCandidateId : undefined,
        reason: reason.trim() || undefined,
        expectedStatus: incident.status,
      });
      toast.success('Đã cập nhật xử lý sự cố.');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể xử lý sự cố');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCancelTrip = async () => {
    if (!cancelReason.trim()) {
      setError('Bắt buộc phải nhập lý do hủy chuyến xe');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await apiClient.cancelTripFromIncident(incident.id, cancelReason.trim());
      toast.success('Đã hủy chuyến xe.');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể hủy chuyến xe');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Xử lý {roleTitle.toLowerCase()} chưa đến
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {incident.routeName || 'Chuyến xe'} · {incident.serviceDate || ''} · {incident.scheduledStartTime || ''}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs">
              <AlertIcon className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!showCancelTripConfirm ? (
            <form onSubmit={handleSubmitResolve} className="space-y-5">
              {/* Incident description */}
              {incident.description && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <span className="font-semibold">Nội dung báo:</span> {incident.description}
                </div>
              )}

              {/* Action selection */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-700 block">
                  Phương án giải quyết
                </label>

                {/* Option ARRIVED */}
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors bg-white">
                  <input
                    type="radio"
                    name="action"
                    value="ARRIVED"
                    checked={action === 'ARRIVED'}
                    onChange={() => setAction('ARRIVED')}
                    className="mt-0.5 text-amber-500 focus:ring-amber-400"
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-800">Người cũ đã đến</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Xác nhận nhân sự được phân công ban đầu đã có mặt tại xe để tiếp tục vận hành.
                    </div>
                  </div>
                </label>

                {/* Option REPLACED */}
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors bg-white">
                  <input
                    type="radio"
                    name="action"
                    value="REPLACED"
                    checked={action === 'REPLACED'}
                    onChange={() => setAction('REPLACED')}
                    className="mt-0.5 text-amber-500 focus:ring-amber-400"
                  />
                  <div className="w-full">
                    <div className="text-sm font-semibold text-slate-800">Phân công thay thế</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Đổi {roleTitle.toLowerCase()} cho chuyến này mà không thay đổi cấu hình mặc định của tuyến.
                    </div>

                    {action === 'REPLACED' && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        {loadingCandidates ? (
                          <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                            <SpinnerIcon className="w-4 h-4 animate-spin" />
                            <span>Đang tìm ứng viên đủ điều kiện...</span>
                          </div>
                        ) : candidates.length > 0 ? (
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-700 block">
                              Chọn người thay thế:
                            </label>
                            <select
                              value={selectedCandidateId}
                              onChange={(e) => setSelectedCandidateId(e.target.value)}
                              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                            >
                              {candidates.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.fullName} {c.phone ? `(${c.phone})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-100">
                            Không có {roleTitle.toLowerCase()} dự phòng nào rảnh trong khung giờ này.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {/* Note / reason */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Ghi chú xử lý (Tùy chọn)
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Nhập ghi chú hoặc lý do..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>

              {/* Footer buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCancelTripConfirm(true)}
                  disabled={submitting}
                  className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  Hủy chuyến xe
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || (action === 'REPLACED' && !selectedCandidateId)}
                    className="px-4 py-2 text-xs font-bold text-slate-900 bg-[#FFCB56] hover:bg-[#f5be38] rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {submitting && <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />}
                    <span>Xác nhận xử lý</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                <p className="font-bold mb-1">Cảnh báo: Hành động không thể hoàn tác!</p>
                <p>
                  Chuyến xe sẽ bị hủy hoàn toàn. Toàn bộ sự cố và báo nghỉ liên quan sẽ được đóng.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Lý do hủy chuyến <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Nhập lý do không thể bố trí nhân sự thay thế..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCancelTripConfirm(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancelTrip}
                  disabled={submitting || !cancelReason.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting && <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />}
                  <span>Xác nhận hủy chuyến</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
