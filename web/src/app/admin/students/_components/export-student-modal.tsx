'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SpinnerIcon, AlertIcon, CloseIcon } from '@/components/icons';
import { apiClient } from '@/lib/api-client';
import type { BulkExportDto, StudentStatus } from '@/lib/types';
import { toast } from '@/stores/toast-store';

interface ExportStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  selectedIds: string[];
  filters?: {
    search?: string;
    status?: StudentStatus;
    hasAddress?: boolean;
    routingStatus?: string;
    provinceId?: string;
    wardId?: string;
    total?: number;
  };
}

export function ExportStudentModal({
  isOpen,
  onClose,
  schoolId,
  selectedIds,
  filters,
}: ExportStudentModalProps) {
  const [scope, setScope] = useState<'SELECTED' | 'FILTERED'>('FILTERED');
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mặc định chọn học sinh đã tick nếu có lựa chọn; ngược lại chọn theo bộ lọc
  useEffect(() => {
    if (isOpen) {
      if (selectedIds.length > 0) {
        setScope('SELECTED');
      } else {
        setScope('FILTERED');
      }
      setErrorMessage(null);
    }
  }, [isOpen, selectedIds.length]);

  if (!isOpen) return null;

  const totalFiltered = filters?.total ?? 0;
  const isSelectedEmpty = selectedIds.length === 0;
  const isFilteredEmpty = totalFiltered === 0;

  const canExport =
    (scope === 'SELECTED' && !isSelectedEmpty) ||
    (scope === 'FILTERED' && !isFilteredEmpty);

  const handleExport = async () => {
    setErrorMessage(null);
    setIsExporting(true);

    try {
      const payload: BulkExportDto = {
        scope,
        studentIds: scope === 'SELECTED' ? selectedIds : undefined,
        filters:
          scope === 'FILTERED'
            ? {
                search: filters?.search,
                status: filters?.status,
                hasAddress: filters?.hasAddress,
                routingStatus: filters?.routingStatus,
                provinceId: filters?.provinceId,
                wardId: filters?.wardId,
              }
            : undefined,
      };

      const blob = await apiClient.exportStudents(schoolId, payload);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      a.download = `danh-sach-hoc-sinh-${timestamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Đã tải xuống danh sách học sinh thành công.');
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Có lỗi xảy ra khi xuất dữ liệu Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <Card className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-800">Xuất danh sách học sinh</h3>
            <p className="text-xs text-slate-500 mt-0.5">Tải tệp Excel .xlsx phục vụ đối soát và tra cứu</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-2 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
              <AlertIcon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-700">Chọn phạm vi xuất dữ liệu:</label>

            {/* Option 1: Selected students */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                isSelectedEmpty
                  ? 'opacity-60 bg-slate-50 border-slate-200 cursor-not-allowed'
                  : scope === 'SELECTED'
                  ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-200/50'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="exportScope"
                value="SELECTED"
                checked={scope === 'SELECTED'}
                disabled={isSelectedEmpty}
                onChange={() => setScope('SELECTED')}
                className="mt-0.5 h-4 w-4 text-primary focus:ring-amber-400 border-slate-300"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">
                    Học sinh đã chọn
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700">
                    {selectedIds.length} học sinh
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isSelectedEmpty
                    ? 'Chưa chọn học sinh nào trong bảng danh sách.'
                    : 'Xuất danh sách các học sinh đang được đánh dấu chọn.'}
                </p>
              </div>
            </label>

            {/* Option 2: Filtered query */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                isFilteredEmpty
                  ? 'opacity-60 bg-slate-50 border-slate-200 cursor-not-allowed'
                  : scope === 'FILTERED'
                  ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-200/50'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="exportScope"
                value="FILTERED"
                checked={scope === 'FILTERED'}
                disabled={isFilteredEmpty}
                onChange={() => setScope('FILTERED')}
                className="mt-0.5 h-4 w-4 text-primary focus:ring-amber-400 border-slate-300"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">
                    Theo bộ lọc hiện tại
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700">
                    {totalFiltered} học sinh
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isFilteredEmpty
                    ? 'Không có học sinh nào khớp với bộ lọc hiện tại.'
                    : 'Xuất toàn bộ học sinh phù hợp với bộ lọc trên mọi trang (tối đa 5.000 dòng).'}
                </p>
              </div>
            </label>
          </div>

          <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
            Tệp xuất bao gồm: Mã học sinh, Họ và tên, SĐT phụ huynh, Địa chỉ đón/trả, Tỉnh/thành, Phường/xã, Tình trạng địa chỉ và Trạng thái.
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-3.5 bg-slate-50/50 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isExporting}
            className="text-xs px-3.5 py-1.5"
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleExport}
            disabled={isExporting || !canExport}
            className="text-xs px-4 py-1.5 font-semibold text-slate-900 bg-primary hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {isExporting && <SpinnerIcon className="w-3.5 h-3.5 animate-spin text-slate-900" />}
            <span>{isExporting ? 'Đang xuất tệp…' : 'Tải xuống Excel'}</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
