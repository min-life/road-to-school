'use client';

import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  SpinnerIcon,
  AlertIcon,
  CheckIcon,
  CloseIcon,
} from '@/components/icons';
import { apiClient } from '@/lib/api-client';
import type {
  BulkImportPreviewResponse,
  BulkImportRowError,
} from '@/lib/types';
import { toast } from '@/stores/toast-store';

interface ImportStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  onSuccess: (importedCount: number) => void;
}

type ModalStep = 'SELECT_FILE' | 'PREVIEW' | 'COMMITTING' | 'SUCCESS' | 'NETWORK_ERROR';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function ImportStudentModal({
  isOpen,
  onClose,
  schoolId,
  onSuccess,
}: ImportStudentModalProps) {
  const [step, setStep] = useState<ModalStep>('SELECT_FILE');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isCheckingReceipt, setIsCheckingReceipt] = useState(false);

  const [previewResult, setPreviewResult] = useState<BulkImportPreviewResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number>(0);

  // Lưu importKey dùng cho idempotency và đối soát retry
  const currentImportKeyRef = useRef<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setStep('SELECT_FILE');
    setSelectedFile(null);
    setPreviewResult(null);
    setErrorMessage(null);
    setImportedCount(0);
    currentImportKeyRef.current = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (isCommitting) return; // Không đóng khi đang commit transaction
    handleReset();
    onClose();
  };

  // Tải tệp mẫu .xlsx
  const handleDownloadTemplate = async () => {
    try {
      setIsDownloadingTemplate(true);
      const blob = await apiClient.downloadStudentImportTemplate(schoolId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mau-nhap-hoc-sinh.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Đã tải xuống tệp mẫu Excel.');
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải xuống tệp mẫu.');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  // Chọn file từ máy
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
      setErrorMessage('Chỉ chấp nhận tệp định dạng Excel (.xlsx).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('Kích thước tệp vượt quá giới hạn tối đa 2 MiB.');
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
  };

  // Tải lên để kiểm tra toàn bộ tệp (Preview)
  const handlePreview = async () => {
    if (!selectedFile) {
      setErrorMessage('Vui lòng chọn một tệp Excel để tiếp tục.');
      return;
    }

    setIsPreviewing(true);
    setErrorMessage(null);

    try {
      const res = await apiClient.previewStudentImport(schoolId, selectedFile);
      setPreviewResult(res);
      setStep('PREVIEW');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Có lỗi xảy ra khi kiểm tra tệp Excel.');
    } finally {
      setIsPreviewing(false);
    }
  };

  // Xác nhận nhập học sinh vào DB
  const handleCommit = async () => {
    if (!selectedFile || !previewResult?.previewToken) {
      setErrorMessage('Phiên xem trước không hợp lệ hoặc thiếu tệp.');
      return;
    }

    setIsCommitting(true);
    setErrorMessage(null);
    setStep('COMMITTING');

    // Tạo importKey mới nếu chưa có
    if (!currentImportKeyRef.current) {
      currentImportKeyRef.current = generateUUID();
    }
    const importKey = currentImportKeyRef.current;

    try {
      const res = await apiClient.commitStudentImport(
        schoolId,
        selectedFile,
        previewResult.previewToken,
        importKey,
      );
      setImportedCount(res.importedCount);
      setStep('SUCCESS');
      toast.success(`Đã nhập thành công ${res.importedCount} học sinh vào hệ thống.`);
      onSuccess(res.importedCount);
    } catch (err: any) {
      if (err?.code === 'NETWORK_ERROR' || err?.statusCode === 0) {
        // Mất phản hồi hoặc timeout: cho phép đối soát biên nhận
        setStep('NETWORK_ERROR');
        setErrorMessage('Mất kết nối tới máy chủ trong lúc xác nhận giao dịch. Vui lòng kiểm tra lại biên nhận.');
      } else {
        setStep('PREVIEW');
        setErrorMessage(err?.message || 'Có lỗi xảy ra khi lưu dữ liệu học sinh.');
      }
    } finally {
      setIsCommitting(false);
    }
  };

  // Kiểm tra lại biên nhận khi mất mạng
  const handleCheckReceipt = async () => {
    if (!currentImportKeyRef.current) return;
    setIsCheckingReceipt(true);
    try {
      const res = await apiClient.getStudentImportReceipt(schoolId, currentImportKeyRef.current);
      setImportedCount(res.importedCount);
      setStep('SUCCESS');
      toast.success(`Xác nhận hoàn tất: Đã nhập ${res.importedCount} học sinh.`);
      onSuccess(res.importedCount);
    } catch (err: any) {
      if (err?.statusCode === 404) {
        toast.info('Giao dịch chưa được ghi nhận trên máy chủ. Bạn có thể gửi lại tệp.');
        setStep('PREVIEW');
      } else {
        toast.error(err?.message || 'Chưa thể xác nhận biên nhận lúc này.');
      }
    } finally {
      setIsCheckingReceipt(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <Card className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-800">Nhập học sinh bằng Excel</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Thêm đồng thời nhiều học sinh qua tệp bảng tính .xlsx (tối đa 200 dòng)
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isCommitting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="flex items-start gap-2 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
              <AlertIcon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* STEP 1: SELECT FILE */}
          {step === 'SELECT_FILE' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl">
                <div>
                  <p className="text-xs font-semibold text-amber-900">Chưa có tệp mẫu?</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Tải tệp mẫu Excel có sẵn các cột chuẩn hóa và ví dụ dữ liệu.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  disabled={isDownloadingTemplate}
                  className="text-xs bg-white hover:bg-amber-100/50 border-amber-300 text-amber-900 font-medium shrink-0 cursor-pointer"
                >
                  {isDownloadingTemplate ? (
                    <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />
                  ) : null}
                  <span>Tải tệp mẫu (.xlsx)</span>
                </Button>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50/20 rounded-xl p-8 text-center cursor-pointer transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3 text-amber-600 font-bold text-lg">
                  XLS
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  {selectedFile ? selectedFile.name : 'Nhấp để chọn tệp Excel (.xlsx)'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedFile
                    ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                    : 'Hỗ trợ tệp .xlsx tối đa 2 MiB, không quá 200 dòng'}
                </p>
              </div>

              <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1">
                <p className="font-semibold text-slate-700">Quy tắc tệp nhập:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Cột 1: <strong>Họ và tên học sinh</strong> (Bắt buộc)</li>
                  <li>Cột 2: <strong>Số điện thoại phụ huynh</strong> (Bắt buộc, 10 chữ số)</li>
                  <li>Cột 3, 4, 5: <strong>Địa chỉ đón/trả, Vĩ độ, Kinh độ</strong> (Tùy chọn, nếu nhập phải nhập đủ cả 3)</li>
                  <li>Một dòng bị lỗi sẽ dừng và hủy toàn bộ lô; không skip dòng.</li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW */}
          {step === 'PREVIEW' && previewResult && (
            <div className="space-y-4">
              {/* File details & stat counters */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">
                    {selectedFile?.name}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : ''}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="text-xs"
                >
                  Chọn tệp khác
                </Button>
              </div>

              {/* Counters */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <div className="text-xs text-slate-500 font-medium">Tổng số dòng</div>
                  <div className="text-lg font-bold text-slate-800 mt-0.5">
                    {previewResult.totalRows}
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <div className="text-xs text-emerald-700 font-medium">Dòng hợp lệ</div>
                  <div className="text-lg font-bold text-emerald-800 mt-0.5">
                    {previewResult.validRows}
                  </div>
                </div>
                <div
                  className={`p-3 rounded-xl text-center border ${
                    previewResult.invalidRows > 0
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="text-xs font-medium">Dòng bị lỗi</div>
                  <div className="text-lg font-bold mt-0.5">
                    {previewResult.invalidRows}
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              {previewResult.invalidRows > 0 ? (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-red-800">
                    <AlertIcon className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Phát hiện {previewResult.invalidRows} dòng lỗi. Chưa có học sinh nào được lưu vào hệ thống.</span>
                  </div>
                  <p className="text-[11px] text-red-700">
                    Vui lòng chỉnh sửa tệp Excel theo các lỗi bên dưới rồi tải lên lại. Thao tác nhập chỉ thực hiện khi 100% dòng hợp lệ.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-semibold text-emerald-800">
                    Toàn bộ {previewResult.validRows} dòng dữ liệu hợp lệ. Sẵn sàng lưu vào hệ thống.
                  </span>
                </div>
              )}

              {/* Error Table if any */}
              {previewResult.errors.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Danh sách lỗi ({previewResult.errors.length} lỗi):</span>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 sticky top-0">
                        <tr>
                          <th className="py-2 px-3 font-semibold w-16">Dòng</th>
                          <th className="py-2 px-3 font-semibold w-32">Cột / Trường</th>
                          <th className="py-2 px-3 font-semibold">Chi tiết lỗi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewResult.errors.map((err, idx) => (
                          <tr key={idx} className="hover:bg-red-50/40">
                            <td className="py-2 px-3 font-medium text-slate-800">
                              Dòng {err.rowNumber}
                            </td>
                            <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                              {err.field || 'Toàn dòng'}
                            </td>
                            <td className="py-2 px-3 text-red-700">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: COMMITTING */}
          {step === 'COMMITTING' && (
            <div className="py-12 text-center space-y-3">
              <SpinnerIcon className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">
                Đang lưu dữ liệu học sinh vào hệ thống…
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Giao dịch đang được xử lý nguyên tử trong một transaction. Vui lòng không đóng trình duyệt.
              </p>
            </div>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 'SUCCESS' && (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <CheckIcon className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-800">
                Đã nhập {importedCount} học sinh thành công!
              </h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Toàn bộ hồ sơ học sinh đã được lưu vào cơ sở dữ liệu và sẵn sàng lập tuyến hoặc in thẻ.
              </p>
            </div>
          )}

          {/* STEP 5: NETWORK ERROR & RECEIPT RETRY */}
          {step === 'NETWORK_ERROR' && (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
                <AlertIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">
                  Chưa xác nhận được kết quả nhập
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Kết nối mạng bị gián đoạn sau khi gửi yêu cầu. Hệ thống có cơ chế biên nhận an toàn để tra cứu xem dữ liệu đã được lưu hay chưa mà không bị ghi lặp.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleCheckReceipt}
                  disabled={isCheckingReceipt}
                  className="text-xs font-semibold px-4 py-2 inline-flex items-center gap-1.5"
                >
                  {isCheckingReceipt && <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />}
                  <span>Kiểm tra lại trạng thái</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep('PREVIEW')}
                  className="text-xs px-4 py-2"
                >
                  Quay lại xem trước
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-slate-100 px-6 py-3.5 bg-slate-50/50 flex items-center justify-end gap-2.5">
          {step === 'SELECT_FILE' && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                className="text-xs px-3.5 py-1.5"
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handlePreview}
                disabled={!selectedFile || isPreviewing}
                className="text-xs px-4 py-1.5 font-semibold text-slate-900 bg-primary hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isPreviewing && <SpinnerIcon className="w-3.5 h-3.5 animate-spin text-slate-900" />}
                <span>{isPreviewing ? 'Đang kiểm tra…' : 'Kiểm tra tệp'}</span>
              </Button>
            </>
          )}

          {step === 'PREVIEW' && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isCommitting}
                className="text-xs px-3.5 py-1.5"
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleCommit}
                disabled={
                  isCommitting ||
                  !previewResult?.previewToken ||
                  previewResult.invalidRows > 0 ||
                  previewResult.validRows === 0
                }
                className="text-xs px-4 py-1.5 font-semibold text-slate-900 bg-primary hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isCommitting && <SpinnerIcon className="w-3.5 h-3.5 animate-spin text-slate-900" />}
                <span>
                  {previewResult?.invalidRows && previewResult.invalidRows > 0
                    ? 'Không thể nhập do có lỗi'
                    : `Nhập ${previewResult?.validRows ?? 0} học sinh`}
                </span>
              </Button>
            </>
          )}

          {step === 'SUCCESS' && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleClose}
              className="text-xs px-4 py-1.5 font-semibold text-slate-900 bg-primary hover:bg-amber-400 cursor-pointer shadow-xs"
            >
              Hoàn tất
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
