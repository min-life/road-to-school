'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { SchoolListItem, GenerateTripsResponse } from '@/lib/types';
import { AlertIcon, InfoIcon, SpinnerIcon } from '@/components/icons';
import { SchoolSelectFilter } from '@/components/admin/common/school-select-filter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
          .then((school: any) => {
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
      setResult(res);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi sinh chuyến xe');
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = !!schoolId && !!fromDate && !!toDate && fromDate <= toDate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <Card className="ui-dialog-panel bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-800">Sinh chuyến xe thủ công</h3>
          <Button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
          >
            ✕
          </Button>
        </div>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              Sinh chuyến xe theo khoảng ngày cho các phương án tuyến đang ở trạng thái <strong>ACTIVE</strong> của trường. Hệ thống chỉ sinh chuyến từ ngày học hợp lệ tiếp theo sau ngày kích hoạt và tự động bỏ qua chuyến đã tồn tại.
            </p>

            {/* School selector */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Trường học <span className="text-rose-500">*</span>:
              </label>

              {isSchoolLocked ? (
                <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800">
                  {selectedSchool?.name || initialSchoolName || 'Trường học hiện tại'}
                </div>
              ) : (
                <SchoolSelectFilter
                  value={schoolId}
                  onChange={(sId, item) => {
                    setSchoolId(sId);
                    setSelectedSchool(item || null);
                  }}
                  allowAll={false}
                  placeholder="-- Bắt buộc chọn đúng một trường --"
                />
              )}

              {contractBounds.start && contractBounds.end && (
                <p className="text-[11px] text-blue-600 font-medium pt-0.5">
                  Thời hạn hợp đồng trường: <strong>{contractBounds.start}</strong> đến <strong>{contractBounds.end}</strong>
                </p>
              )}
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Từ ngày (fromDate) <span className="text-rose-500">*</span>:
                </label>
                <Input
                  type="date"
                  value={fromDate}
                  min={contractBounds.start}
                  max={contractBounds.end}
                  disabled={!schoolId}
                  onChange={(e) => setFromDate(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-50 disabled:opacity-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Đến ngày (toDate) <span className="text-rose-500">*</span>:
                </label>
                <Input
                  type="date"
                  value={toDate}
                  min={contractBounds.start}
                  max={contractBounds.end}
                  disabled={!schoolId}
                  onChange={(e) => setToDate(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-50 disabled:opacity-50"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertIcon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <Button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </Button>
              <Button variant="primary" size="sm"
                type="submit"
                disabled={submitting || !isFormValid}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-900 bg-primary hover:bg-[#f5c042] transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting && <SpinnerIcon className="w-4 h-4 animate-spin text-slate-900" />}
                <span>Bắt đầu sinh chuyến</span>
              </Button>
            </div>
          </form>
        ) : (
          /* Result Summary */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
              <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                Kết quả sinh chuyến xe
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  Tổng chuyến đủ điều kiện: <strong>{result.totalEligible}</strong>
                </div>
                <div>
                  Đã tạo mới: <strong className="text-emerald-700 font-bold">{result.createdCount}</strong>
                </div>
                <div>
                  Bỏ qua (đã có): <strong>{result.skippedCount}</strong>
                </div>
                <div>
                  Lỗi / Chưa đủ tài nguyên: <strong className={result.failedCount > 0 ? 'text-rose-600 font-bold' : ''}>{result.failedCount}</strong>
                </div>
              </div>
            </div>

            {result.failures && result.failures.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700">Chi tiết tuyến chưa thể sinh:</span>
                <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px]">
                  {result.failures.map((f, i) => (
                    <div key={i} className="text-rose-700">
                      • <strong>{f.routeName}</strong> ({f.serviceDate}): {f.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <Button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
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
