'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { CloseIcon, SpinnerIcon, AlertIcon } from '@/components/icons';
import { Tooltip } from '@/components/admin/schools/tooltip';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CreateDriverResponse } from '@/lib/types';

interface AddDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: CreateDriverResponse) => void;
}

export function AddDriverModal({
  isOpen,
  onClose,
  onSuccess,
}: AddDriverModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setFullName('');
      setEmail('');
      setPhone('');
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setErrorMessage('Vui lòng nhập họ và tên của tài xế.');
      return;
    }

    if (!trimmedEmail) {
      setErrorMessage('Vui lòng nhập email để nhận mật khẩu tài khoản tài xế.');
      return;
    }

    if (!trimmedPhone) {
      setErrorMessage('Vui lòng nhập số điện thoại của tài xế.');
      return;
    }

    if (!/^(0|\+84)[0-9]{9,10}$/.test(trimmedPhone)) {
      setErrorMessage('Số điện thoại không đúng định dạng (ví dụ: 0987654321).');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage('Địa chỉ email không đúng định dạng.');
      return;
    }

    try {
      setIsLoading(true);
      const result = await apiClient.createDriver({
        fullName: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
      });

      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Không thể tạo tài khoản tài xế. Vui lòng thử lại.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <Card
        className="ui-dialog-panel bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-driver-title"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 id="add-driver-title" className="text-base font-bold text-slate-900">
              Thêm tài xế mới
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Khởi tạo tài khoản tài xế vận hành các tuyến xe buýt trường học.
            </p>
          </div>
          <Button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <CloseIcon className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 text-xs text-red-800 bg-red-50 border border-red-200 rounded-xl">
              <AlertIcon className="w-4 h-4 text-red-600 flex-shrink-0" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          <div>
            <label htmlFor="add-driver-name" className="block text-xs font-semibold text-slate-700 mb-1">
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <Input
              id="add-driver-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ví dụ: Lê Hoàng Nam"
              disabled={isLoading}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:bg-slate-100"
              required
            />
          </div>

          <div>
            <div className="flex items-center gap-1 mb-1">
              <label htmlFor="add-driver-email" className="text-xs font-semibold text-slate-700">Email <span className="text-red-500">*</span></label>
              <Tooltip content="Email bắt buộc để nhận mật khẩu tài khoản tài xế." />
            </div>
            <Input
              id="add-driver-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nam.lh@roadtoschool.vn"
              disabled={isLoading}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:bg-slate-100"
            />
          </div>

          <div>
            <div className="flex items-center gap-1 mb-1">
              <label htmlFor="add-driver-phone" className="text-xs font-semibold text-slate-700">Số điện thoại <span className="text-red-500">*</span></label>
              <Tooltip content="Số điện thoại bắt buộc để liên hệ và điều phối tài xế." />
            </div>
            <Input
              id="add-driver-phone"
              type="tel"
              required
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0987654321"
              disabled={isLoading}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:bg-slate-100"
            />
          </div>

          <p className="text-[11px] text-slate-500 italic bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
            Mật khẩu được tạo tự động và gửi qua email tài xế.
          </p>

          <div className="border-t border-slate-200 pt-4 flex items-center justify-end gap-3">
            <Button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Hủy
            </Button>
            <Button variant="primary" size="sm"
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-900 bg-primary hover:bg-amber-400 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isLoading && <SpinnerIcon className="w-4 h-4 animate-spin text-slate-900" />}
              <span>{isLoading ? 'Đang tạo...' : 'Tạo tài xế'}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
