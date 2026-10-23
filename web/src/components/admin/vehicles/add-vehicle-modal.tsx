'use client';

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { SpinnerIcon, AlertIcon } from '@/components/icons';

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddVehicleModal({
  isOpen,
  onClose,
  onSuccess,
}: AddVehicleModalProps) {
  const [brand, setBrand] = useState('');
  const [seatCount, setSeatCount] = useState<string>('');
  const [licensePlate, setLicensePlate] = useState('');
  const [color, setColor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedBrand = brand.trim();
    const trimmedPlate = licensePlate.trim();
    const trimmedColor = color.trim();
    const parsedSeats = parseInt(seatCount, 10);

    if (!trimmedBrand) {
      setErrorMessage('Vui lòng nhập hãng xe');
      return;
    }

    if (isNaN(parsedSeats) || parsedSeats <= 0) {
      setErrorMessage('Số ghế học sinh phải là số nguyên dương lớn hơn 0');
      return;
    }

    if (!trimmedPlate) {
      setErrorMessage('Vui lòng nhập biển số xe');
      return;
    }

    if (!trimmedColor) {
      setErrorMessage('Vui lòng nhập màu sắc xe');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.createVehicle({
        brand: trimmedBrand,
        seatCount: parsedSeats,
        licensePlate: trimmedPlate,
        color: trimmedColor,
      });

      // Reset form
      setBrand('');
      setSeatCount('');
      setLicensePlate('');
      setColor('');
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err?.statusCode === 409) {
        setErrorMessage('Biển số xe này đã tồn tại trên hệ thống. Vui lòng kiểm tra lại.');
      } else {
        setErrorMessage(err?.message || 'Không thể tạo phương tiện. Vui lòng thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 id="modal-title" className="text-base font-bold text-[#1E293B]">
            Thêm phương tiện mới
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertIcon className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Hãng xe */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Hãng xe *
            </label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="VD: Hyundai Solati, Ford Transit..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FFCB56] text-sm"
            />
          </div>

          {/* Số ghế khả dụng cho học sinh (seatCount) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Số ghế dành cho học sinh *
              </label>
              <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 font-medium">
                Không tính ghế tài xế & nhân sự
              </span>
            </div>
            <input
              type="number"
              min="1"
              step="1"
              value={seatCount}
              onChange={(e) => setSeatCount(e.target.value)}
              placeholder="VD: 14"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FFCB56] text-sm"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Số ghế thực tế chở học sinh trên xe (đã trừ ghế lái xe và giám sát viên).
            </p>
          </div>

          {/* Biển số xe */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Biển số xe *
            </label>
            <input
              type="text"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              placeholder="VD: 51B-123.45"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FFCB56] text-sm font-mono uppercase"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Hệ thống sẽ tự động chuẩn hóa biển số và kiểm tra tính duy nhất.
            </p>
          </div>

          {/* Màu sắc */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Màu sắc xe *
            </label>
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="VD: Trắng sứ, Vàng, Bạc..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FFCB56] text-sm"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#FFCB56] hover:bg-amber-400 text-sm font-bold text-[#1E293B] transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
            >
              {isSubmitting && <SpinnerIcon className="w-4 h-4 animate-spin" />}
              <span>Thêm phương tiện</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
