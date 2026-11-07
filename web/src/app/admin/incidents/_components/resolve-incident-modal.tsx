'use client';

import { LifecycleDialog } from '@/components/admin/common/lifecycle-dialog';
import { Button } from '@/components/ui/button';
import './incident-modals.css';
import { toast } from '@/stores/toast-store';

import React, { useState, useEffect, useId } from 'react';
import { apiClient, ApiError } from '@/lib/api-client';
import { TripIncident, IncidentCandidate } from '@/lib/types';
import { SpinnerIcon, AlertIcon } from '@/components/icons';

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
  const formId = useId();
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
    <LifecycleDialog open={isOpen} busy={submitting} className="incident-dialog incident-dialog--resolve"
      title={showCancelTripConfirm ? 'Hủy chuyến xe' : `Xử lý ${roleTitle.toLowerCase()} chưa đến`} onClose={onClose}
      footer={showCancelTripConfirm ? <>
        <Button type="button" variant="outline" disabled={submitting} onClick={() => setShowCancelTripConfirm(false)}>Quay lại</Button>
        <Button type="button" variant="danger" disabled={submitting || !cancelReason.trim()} onClick={handleConfirmCancelTrip}>{submitting && <SpinnerIcon className="w-4 h-4 animate-spin" />}Xác nhận hủy chuyến</Button>
      </> : <>
        <Button className="incident-cancel-action" type="button" variant="ghost" disabled={submitting} onClick={() => setShowCancelTripConfirm(true)}>Hủy chuyến xe</Button>
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Đóng</Button>
        <Button type="submit" form={formId} variant="primary" disabled={submitting || (action === 'REPLACED' && !selectedCandidateId)}>{submitting && <SpinnerIcon className="w-4 h-4 animate-spin" />}Xác nhận xử lý</Button>
      </>}>
      <section className="incident-summary"><div><span className="incident-label">Chuyến xe</span><strong>{incident.routeName || 'Chuyến xe'}</strong><small>{incident.serviceDate || ''}{incident.scheduledStartTime ? ` · ${incident.scheduledStartTime}` : ''}</small></div></section>
          {error && (
            <div role="alert" className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs">
              <AlertIcon className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!showCancelTripConfirm ? (
            <form id={formId} onSubmit={handleSubmitResolve} className="incident-resolution-form">
              {/* Incident description */}
              {incident.description && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <span className="font-semibold">Nội dung báo:</span> {incident.description}
                </div>
              )}

              {/* Action selection */}
              <fieldset className="incident-options">
                <legend className="incident-label">
                  Phương án giải quyết
                </legend>

                {/* Option ARRIVED */}
                <label className="incident-action-option">
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
                <label className="incident-action-option">
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
                              aria-label="Chọn người thay thế"
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
              </fieldset>

              {/* Note / reason */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Ghi chú xử lý (Tùy chọn)
                </label>
                <textarea
                  aria-label="Ghi chú xử lý"
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Nhập ghi chú hoặc lý do..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
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
                  aria-label="Lý do hủy chuyến"
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Nhập lý do không thể bố trí nhân sự thay thế..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
                />
              </div>

            </div>
          )}
    </LifecycleDialog>
  );
}
