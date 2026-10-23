'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { CopyIcon, CheckIcon } from '@/components/icons';

interface QRCodeProps {
  value?: string;
  studentCode?: string;
  studentName?: string;
  size?: number;
  className?: string;
  showCopy?: boolean;
}

export function QRCodeDisplay({
  value,
  studentCode,
  studentName,
  size = 180,
  className = '',
  showCopy = true,
}: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qrValue = value || studentCode || '';

  useEffect(() => {
    if (!canvasRef.current || !qrValue) return;

    QRCode.toCanvas(
      canvasRef.current,
      qrValue,
      {
        width: size,
        margin: 2,
        color: {
          dark: '#1E293B',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      },
      (err) => {
        if (err) {
          setError('Không thể tạo mã QR');
        } else {
          setError(null);
        }
      },
    );
  }, [qrValue, size]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Bỏ qua lỗi sao chép
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs inline-block">
        {error ? (
          <div
            style={{ width: size, height: size }}
            className="flex items-center justify-center text-xs text-red-500 text-center p-2"
          >
            {error}
          </div>
        ) : (
          <canvas ref={canvasRef} className="rounded-lg block" />
        )}
      </div>

      {showCopy && (
        <div className="mt-3 flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 tracking-wider">
            {value}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Sao chép mã học sinh"
            aria-label="Sao chép mã học sinh"
          >
            {copied ? (
              <CheckIcon className="w-4 h-4 text-emerald-600" />
            ) : (
              <CopyIcon className="w-4 h-4" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
