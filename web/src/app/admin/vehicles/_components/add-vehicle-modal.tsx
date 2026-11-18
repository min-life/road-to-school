'use client';

import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import { SpinnerIcon, AlertIcon } from '@/components/icons';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function AddVehicleModal({
  isOpen,
  onClose,
  onSuccess,
  triggerRef,
}: AddVehicleModalProps) {
  const [licensePlate, setLicensePlate] = useState('');
  const [brand, setBrand] = useState('');
  const [seatCount, setSeatCount] = useState<string>('');
  const [color, setColor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    licensePlate?: string;
    brand?: string;
    seatCount?: string;
    color?: string;
  }>({});

  const licensePlateInputRef = useRef<HTMLInputElement>(null);

  // Focus management & Escape key handling
  useEffect(() => {
    if (!isOpen) {
      if (triggerRef?.current) {
        triggerRef.current.focus();
      }
      return;
    }

    const timer = setTimeout(() => {
      licensePlateInputRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose, triggerRef]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    const trimmedPlate = licensePlate.trim();
    const trimmedBrand = brand.trim();
    const trimmedColor = color.trim();
    const parsedSeats = parseInt(seatCount, 10);

    const errors: typeof fieldErrors = {};
    if (!trimmedPlate) {
      errors.licensePlate = 'Vui lòng nhập biển số xe';
    }
    if (!trimmedBrand) {
      errors.brand = 'Vui lòng nhập hãng xe';
    }
    if (isNaN(parsedSeats) || parsedSeats <= 0) {
      errors.seatCount = 'Số ghế học sinh phải là số nguyên dương lớn hơn 0';
    }
    if (!trimmedColor) {
      errors.color = 'Vui lòng nhập màu sắc xe';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
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
      setLicensePlate('');
      setBrand('');
      setSeatCount('');
      setColor('');
      setFieldErrors({});
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const status = (err as { statusCode?: number })?.statusCode;
      const msg = err instanceof Error ? err.message : undefined;
      if (status === 409) {
        setFieldErrors({
          licensePlate: 'Biển số xe này đã tồn tại trên hệ thống. Vui lòng kiểm tra lại.',
        });
      } else {
        setErrorMessage(msg || 'Không thể tạo phương tiện. Vui lòng thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-vehicle-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <Card className="ui-dialog-panel relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <h2 id="add-vehicle-modal-title" className="text-base font-bold text-foreground">
            Thêm phương tiện mới
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            ✕
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2" role="alert">
              <AlertIcon className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Biển số xe */}
          <div className="space-y-1">
            <label
              htmlFor="add-vehicle-license-plate"
              className="block text-xs font-semibold text-slate-700"
            >
              Biển số xe *
            </label>
            <Input
              ref={licensePlateInputRef}
              id="add-vehicle-license-plate"
              type="text"
              value={licensePlate}
              disabled={isSubmitting}
              onChange={(e) => {
                setLicensePlate(e.target.value);
                if (fieldErrors.licensePlate) {
                  setFieldErrors((prev) => ({ ...prev, licensePlate: undefined }));
                }
              }}
              placeholder="VD: 51B-123.45"
              required
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono uppercase ${
                fieldErrors.licensePlate
                  ? 'border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-red-200'
                  : 'border-slate-200'
              }`}
            />
            {fieldErrors.licensePlate ? (
              <p className="text-xs text-red-600 mt-1 font-medium" role="alert">
                {fieldErrors.licensePlate}
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-0.5">
                Hệ thống sẽ tự động chuẩn hóa biển số và kiểm tra tính duy nhất.
              </p>
            )}
          </div>

          {/* 2. Hãng xe */}
          <div className="space-y-1">
            <label
              htmlFor="add-vehicle-brand"
              className="block text-xs font-semibold text-slate-700"
            >
              Hãng xe *
            </label>
            <Input
              id="add-vehicle-brand"
              type="text"
              value={brand}
              disabled={isSubmitting}
              onChange={(e) => {
                setBrand(e.target.value);
                if (fieldErrors.brand) {
                  setFieldErrors((prev) => ({ ...prev, brand: undefined }));
                }
              }}
              placeholder="VD: Hyundai Solati, Ford Transit..."
              required
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${
                fieldErrors.brand
                  ? 'border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-red-200'
                  : 'border-slate-200'
              }`}
            />
            {fieldErrors.brand && (
              <p className="text-xs text-red-600 mt-1 font-medium" role="alert">
                {fieldErrors.brand}
              </p>
            )}
          </div>

          {/* 3 & 4. Ghế học sinh và Màu xe */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ghế học sinh */}
            <div className="space-y-1">
              <label
                htmlFor="add-vehicle-seat-count"
                className="block text-xs font-semibold text-slate-700"
              >
                Số ghế học sinh *
              </label>
              <Input
                id="add-vehicle-seat-count"
                type="number"
                min="1"
                step="1"
                value={seatCount}
                disabled={isSubmitting}
                onChange={(e) => {
                  setSeatCount(e.target.value);
                  if (fieldErrors.seatCount) {
                    setFieldErrors((prev) => ({ ...prev, seatCount: undefined }));
                  }
                }}
                placeholder="VD: 14"
                required
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${
                  fieldErrors.seatCount
                    ? 'border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-red-200'
                    : 'border-slate-200'
                }`}
              />
              {fieldErrors.seatCount && (
                <p className="text-xs text-red-600 mt-1 font-medium" role="alert">
                  {fieldErrors.seatCount}
                </p>
              )}
            </div>

            {/* Màu xe */}
            <div className="space-y-1">
              <label
                htmlFor="add-vehicle-color"
                className="block text-xs font-semibold text-slate-700"
              >
                Màu sắc xe *
              </label>
              <Input
                id="add-vehicle-color"
                type="text"
                value={color}
                disabled={isSubmitting}
                onChange={(e) => {
                  setColor(e.target.value);
                  if (fieldErrors.color) {
                    setFieldErrors((prev) => ({ ...prev, color: undefined }));
                  }
                }}
                placeholder="VD: Trắng sứ, Vàng, Bạc..."
                required
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${
                  fieldErrors.color
                    ? 'border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-red-200'
                    : 'border-slate-200'
                }`}
              />
              {fieldErrors.color && (
                <p className="text-xs text-red-600 mt-1 font-medium" role="alert">
                  {fieldErrors.color}
                </p>
              )}
            </div>
          </div>

          {/* Một dòng giải thích số ghế học sinh */}
          <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            Số ghế thực tế dành cho học sinh, không bao gồm ghế tài xế và nhân viên phụ trách.
          </p>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              size="default"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-colors cursor-pointer"
            >
              Hủy bỏ
            </Button>
            <Button
              variant="primary"
              size="default"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-amber-400 text-sm font-bold text-foreground transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
            >
              {isSubmitting && <SpinnerIcon className="w-4 h-4 animate-spin" />}
              <span>Thêm phương tiện</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
