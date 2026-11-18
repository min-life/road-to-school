'use client';

import React, { useEffect, useRef } from 'react';
import { Cpu, Upload, X, CheckCircle2, AlertTriangle, Play, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Esp32Controls } from './use-esp32';

interface FirmwareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  controls: Esp32Controls;
}

export function FirmwareDialog({ isOpen, onClose, controls: usb }: FirmwareDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const isFlashing = Boolean(usb.busy) && usb.busy.includes('nạp firmware');

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isFlashing && !usb.busy) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFlashing, usb.busy, onClose]);

  if (!isOpen) return null;

  const inBootloader = usb.mode === 'bootloader';
  const isConsole = usb.mode === 'console';
  const isComplete = isConsole && Boolean(usb.firmwareVersion) && usb.progress === 100;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="iot-firmware-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isFlashing && !usb.busy) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <Cpu className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="iot-firmware-dialog-title" className="text-base font-bold text-slate-800">
                Cập nhật firmware
              </h2>
              <p className="text-xs text-slate-500">
                {usb.chip?.deviceId ? (
                  <span>
                    Thiết bị đang cắm USB: <strong className="font-mono text-slate-700">{usb.chip.deviceId}</strong>
                  </span>
                ) : (
                  'Thiết bị chưa nhận diện'
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isFlashing || Boolean(usb.busy)}
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Cảnh báo an toàn */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-semibold">Lưu ý trước khi ghi firmware</p>
              <p className="text-amber-800">
                Giữ nguyên cáp USB trong suốt quá trình nạp. Cấu hình đã lưu trên thiết bị có thể bị thay thế bởi bản ghi mới.
              </p>
            </div>
          </div>

          {/* Error notice */}
          {usb.error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5" role="alert">
              <div className="space-y-1">
                <p className="font-semibold">Lỗi thao tác</p>
                <p className="text-rose-700">{usb.error}</p>
              </div>
            </div>
          )}

          {/* Stepper Process */}
          <div className="space-y-4">
            {/* Bước 1: Chế độ nạp */}
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    inBootloader || isComplete ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    1
                  </span>
                  <span className="font-semibold text-slate-800">Chế độ nạp (Bootloader)</span>
                </div>
                {inBootloader ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold">
                    Đã vào chế độ nạp
                  </Badge>
                ) : (
                  <span className="text-xs text-slate-500">Cần kết nối chế độ nạp</span>
                )}
              </div>

              {inBootloader ? (
                <p className="text-xs text-slate-600 pl-8">
                  Đã nhận diện chip và MAC: {usb.chip?.chipModel || 'ESP32'} ({usb.chip?.macAddress || '—'})
                </p>
              ) : (
                <div className="pl-8 pt-1 space-y-2">
                  <p className="text-xs text-slate-500">
                    Nếu thiết bị đang ở Serial/Console hoặc chưa kết nối, hãy bấm nút dưới đây để chọn cổng và vào chế độ bootloader:
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={Boolean(usb.busy) || usb.supported !== true}
                    onClick={() => void usb.connect(true)}
                    className="inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Kết nối để nạp</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Bước 2: Ghi firmware */}
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    usb.progress === 100 ? 'bg-emerald-600 text-white' : isFlashing ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    2
                  </span>
                  <span className="font-semibold text-slate-800">Ghi firmware</span>
                </div>
                <span className="text-xs text-slate-500">Firmware do máy chủ cung cấp</span>
              </div>

              <div className="pl-8 space-y-3">
                {usb.progress !== null && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>{isFlashing ? 'Đang nạp firmware…' : usb.progress === 100 ? 'Đã ghi và kiểm tra MD5 thành công' : 'Tiến độ'}</span>
                      <strong className="font-bold">{usb.progress}%</strong>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-amber-500 h-2.5 rounded-full transition-all duration-150"
                        style={{ width: `${usb.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {usb.progress === null && (
                  <div className="pt-1">
                    <Button
                      type="button"
                      variant="primary"
                      disabled={!inBootloader || Boolean(usb.busy)}
                      onClick={() => void usb.flash()}
                      className="inline-flex items-center gap-2 font-bold px-4 py-2"
                    >
                      <Upload className="w-4 h-4" aria-hidden="true" />
                      <span>Xác nhận và nạp firmware</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Bước 3: Khởi động và kiểm tra */}
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isComplete ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    3
                  </span>
                  <span className="font-semibold text-slate-800">Khởi động và kiểm tra</span>
                </div>
                {isComplete ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold">
                    Hoàn tất
                  </Badge>
                ) : (
                  <span className="text-xs text-slate-500">
                    {usb.progress === 100 ? 'Chờ kiểm tra' : 'Chờ hoàn tất ghi'}
                  </span>
                )}
              </div>

              <div className="pl-8 pt-1">
                {isComplete ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                    <span>Firmware đã khởi động thành công: <strong>{usb.firmwareVersion}</strong></span>
                  </div>
                ) : usb.progress === 100 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600">
                      Đã ghi và xác minh MD5 xong. Bấm nút dưới để khởi động lại ESP32 vào ứng dụng và đọc INFO:
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={Boolean(usb.busy)}
                      onClick={() => void usb.openConsole()}
                      className="inline-flex items-center gap-1.5 font-semibold"
                    >
                      <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" aria-hidden="true" />
                      <span>Chạy và kiểm tra</span>
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    Chờ hoàn tất bước ghi firmware để kiểm tra phiên bản thực tế.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-100 bg-slate-50">
          <Button
            type="button"
            variant="ghost"
            disabled={isFlashing || Boolean(usb.busy)}
            onClick={onClose}
          >
            {isComplete ? 'Hoàn thành' : 'Đóng'}
          </Button>
        </div>
      </div>
    </div>
  );
}
