'use client';

import { toast } from '@/stores/toast-store';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { SchoolListItem, GenerateTripsResponse } from '@/lib/types';
import { AlertIcon, BusIcon, CloseIcon, InfoIcon, SchoolIcon, SpinnerIcon } from '@/components/icons';
import { SchoolSelectFilter } from '@/components/admin/common/school-select-filter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import './manual-generate-trips-modal.css';

interface ManualGenerateTripsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialSchoolId?: string;
  initialSchoolName?: string;
}

export function ManualGenerateTripsModal({
  isOpen,
  onClose,
  onSuccess,
  initialSchoolId,
  initialSchoolName,
}: ManualGenerateTripsModalProps) {
  const isSchoolLocked = !!initialSchoolId;
  const [schoolId, setSchoolId] = useState<string>(initialSchoolId || '');
  const [selectedSchool, setSelectedSchool] = useState<SchoolListItem | null>(null);

  // Contract dates
  const [contractBounds, setContractBounds] = useState<{ start?: string; end?: string }>({});

  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateTripsResponse | null>(null);

  // Helper: Format YYYY-MM-DD
  const formatUtcYmd = (d: Date) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Reset or load school details when modal opens or schoolId changes
  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setError(null);
      const activeId = initialSchoolId || schoolId;
      if (activeId) {
        apiClient
          .getSchoolDetail(activeId)
          .then((school) => {
            if (school) {
              setSelectedSchool(school);
              if (school.contractStartDate && school.contractEndDate) {
                const start = school.contractStartDate.split('T')[0];
                const end = school.contractEndDate.split('T')[0];
                setContractBounds({ start, end });

                // Initialize default dates: tomorrow to +7 days, clamped within contract
                const now = new Date();
                const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                const tomorrowStr = formatUtcYmd(tomorrow);
                const nextWeekStr = formatUtcYmd(nextWeek);

                const clampedFrom = tomorrowStr < start ? start : tomorrowStr > end ? start : tomorrowStr;
                const clampedTo = nextWeekStr > end ? end : nextWeekStr < clampedFrom ? clampedFrom : nextWeekStr;

                setFromDate(clampedFrom);
                setToDate(clampedTo);
              }
            }
          })
          .catch(() => {});
      } else {
        setSelectedSchool(null);
        setContractBounds({});
        setFromDate('');
        setToDate('');
      }
    }
  }, [isOpen, initialSchoolId, schoolId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) {
      setError('Bắt buộc phải chọn đúng một trường học để sinh chuyến');
      return;
    }
    if (!fromDate || !toDate) {
      setError('Vui lòng chọn khoảng ngày');
      return;
    }
    if (fromDate > toDate) {
      setError('Ngày bắt đầu không được sau ngày kết thúc');
      return;
    }
    if (contractBounds.start && fromDate < contractBounds.start) {
      setError(`Ngày bắt đầu (${fromDate}) không được trước ngày bắt đầu hợp đồng (${contractBounds.start})`);
      return;
    }
    if (contractBounds.end && toDate > contractBounds.end) {
      setError(`Ngày kết thúc (${toDate}) không được sau ngày kết thúc hợp đồng (${contractBounds.end})`);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setResult(null);
      const res = await apiClient.generateTrips({
        schoolId,
        fromDate,
        toDate,
      });
      if (res.failedCount > 0) { toast.warning(`Đã tạo ${res.createdCount} chuyến; ${res.failedCount} chuyến chưa thể tạo. Xem chi tiết trong hộp thoại.`); } else { toast.success(`Đã tạo ${res.createdCount} chuyến, bỏ qua ${res.skippedCount} chuyến đã có.`); }
      setResult(res);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi sinh chuyến xe');
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = !!schoolId && !!fromDate && !!toDate && fromDate <= toDate;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-trip-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px] animate-in fade-in duration-150"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !submitting) onClose();
      }}
    >
      <Card className="manual-trip-dialog-panel ui-dialog-panel ui-dialog-panel-body w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
              <BusIcon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="manual-trip-dialog-title" className="text-lg font-bold leading-6 text-slate-900">
                Sinh chuyến thủ công
              </h2>
              <p className="mt-1 text-sm text-slate-500">Tạo chuyến theo trường và khoảng ngày</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng hộp thoại"
            className="-mr-1 -mt-1 shrink-0 text-slate-400 hover:text-slate-700"
          >
            <CloseIcon className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        {!result ? (
          <form onSubmit={handleSubmit} className="manual-trip-form">
            <div className="manual-trip-form-body space-y-5 px-6 py-5">
              <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-sm leading-5 text-slate-600">
                <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                <p>Chỉ tạo chuyến cho ngày học hợp lệ của phương án đang hoạt động. Chuyến đã tồn tại sẽ được bỏ qua.</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="manual-trip-school" className="block text-sm font-semibold text-slate-800">
                  Trường học <span className="text-rose-600" aria-hidden="true">*</span>
                  <span className="sr-only">(bắt buộc)</span>
                </label>

                {isSchoolLocked ? (
                  <div className="flex min-h-10 items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
                    <SchoolIcon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                    <span className="truncate">{selectedSchool?.name || initialSchoolName || 'Trường học hiện tại'}</span>
                  </div>
                ) : (
                  <SchoolSelectFilter
                    id="manual-trip-school"
                    floating
                    value={schoolId}
                    onChange={(sId, item) => {
                      setSchoolId(sId);
                      setSelectedSchool(item || null);
                    }}
                    allowAll={false}
                    required
                    placeholder="Chọn trường học"
                    className="manual-trip-school-select"
                  />
                )}

                {contractBounds.start && contractBounds.end && (
                  <p className="text-xs text-slate-500">
                    Thời hạn hợp đồng: <span className="font-medium text-slate-700">{contractBounds.start} – {contractBounds.end}</span>
                  </p>
                )}
              </div>

              <fieldset className="space-y-2.5">
                <legend className="text-sm font-semibold text-slate-800">Khoảng ngày <span className="text-rose-600" aria-hidden="true">*</span></legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="manual-trip-from-date" className="block text-sm font-medium text-slate-600">Từ ngày</label>
                    <Input
                      id="manual-trip-from-date"
                      type="date"
                      value={fromDate}
                      min={contractBounds.start}
                      max={contractBounds.end}
                      disabled={!schoolId}
                      onChange={(e) => setFromDate(e.target.value)}
                      required
                      className="w-full bg-white px-3 text-sm disabled:bg-slate-50 disabled:opacity-60"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="manual-trip-to-date" className="block text-sm font-medium text-slate-600">Đến ngày</label>
                    <Input
                      id="manual-trip-to-date"
                      type="date"
                      value={toDate}
                      min={contractBounds.start}
                      max={contractBounds.end}
                      disabled={!schoolId}
                      onChange={(e) => setToDate(e.target.value)}
                      required
                      className="w-full bg-white px-3 text-sm disabled:bg-slate-50 disabled:opacity-60"
                    />
                  </div>
                </div>
              </fieldset>

              {error && (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-5 text-rose-700">
                  <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="w-full sm:w-auto"
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={submitting || !isFormValid}
                className="w-full sm:w-auto"
              >
                {submitting && <SpinnerIcon className="h-4 w-4 animate-spin" aria-hidden="true" />}
                <span>{submitting ? 'Đang sinh chuyến…' : 'Sinh chuyến'}</span>
              </Button>
            </div>
          </form>
        ) : (
          <div className="manual-trip-result">
            <div className="manual-trip-result-body space-y-5 px-6 py-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">Kết quả sinh chuyến</h3>
                <p className="mt-1 text-sm text-slate-500">Hệ thống đã xử lý xong khoảng ngày đã chọn.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Đủ điều kiện</p>
                  <strong className="mt-1 block text-xl text-slate-900">{result.totalEligible}</strong>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-700">Đã tạo</p>
                  <strong className="mt-1 block text-xl text-emerald-700">{result.createdCount}</strong>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500">Đã có</p>
                  <strong className="mt-1 block text-xl text-slate-900">{result.skippedCount}</strong>
                </div>
                <div className={`rounded-xl border p-3 ${result.failedCount > 0 ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white'}`}>
                  <p className={result.failedCount > 0 ? 'text-xs text-rose-700' : 'text-xs text-slate-500'}>Chưa thể tạo</p>
                  <strong className={result.failedCount > 0 ? 'mt-1 block text-xl text-rose-700' : 'mt-1 block text-xl text-slate-900'}>
                    {result.failedCount}
                  </strong>
                </div>
              </div>

              {result.failures && result.failures.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-800">Các tuyến chưa thể tạo</h4>
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                    {result.failures.map((failure, index) => (
                      <div key={index} className="rounded-lg bg-white p-2.5 text-rose-700">
                        <strong>{failure.routeName}</strong>
                        <p className="mt-0.5 text-xs leading-5">{failure.serviceDate} · {failure.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-100 bg-slate-50/70 px-6 py-4">
              <Button
                variant="primary"
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto"
              >
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
