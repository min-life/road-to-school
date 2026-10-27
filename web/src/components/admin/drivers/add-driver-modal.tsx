'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { CloseIcon, SpinnerIcon, AlertIcon } from '@/components/icons';
import { Tooltip } from '@/components/admin/schools/tooltip';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AddDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setErrorMessage('Vui lòng nhập họ và tên của tài xế.');
      return;
    }

    if (!trimmedEmail && !trimmedPhone) {
      setErrorMessage('Vui lòng cung cấp ít nhất Email hoặc Số điện thoại để làm thông tin đăng nhập.');
      return;
    }

    if (trimmedPhone && !/^(0|\+84|84)?[35789]\d{8}$/.test(trimmedPhone)) {
      setErrorMessage('Số điện thoại không đúng định dạng di động Việt Nam (ví dụ: 0912345678).');
      return;
    }

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage('Địa chỉ email không đúng định dạng.');
      return;
    }

    try {
      setIsLoading(true);
      await apiClient.createDriver({
        fullName: trimmedName,
        email: trimmedEmail || undefined,
        phone: trimmedPhone || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Không thể tạo tài khoản tài xế. Vui lòng thử lại.'
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <Input
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
              <label className="text-xs font-semibold text-slate-700">Email</label>
              <Tooltip content="Địa chỉ email đăng nhập của tài xế. Tùy chọn nếu đã cung cấp Số điện thoại." />
            </div>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nam.lh@roadtoschool.vn"
              disabled={isLoading}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:bg-slate-100"
            />
          </div>

          <div>
            <div className="flex items-center gap-1 mb-1">
              <label className="text-xs font-semibold text-slate-700">Số điện thoại</label>
              <Tooltip content="Số điện thoại di động đăng nhập của tài xế. Tùy chọn nếu đã cung cấp Email." />
            </div>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0987654321"
              disabled={isLoading}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:bg-slate-100"
            />
          </div>

          <p className="text-[11px] text-slate-500 italic bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
            * Tài xế thuộc biên chế chung của hệ thống Nhà xe. Mật khẩu được khởi tạo ngẫu nhiên.
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
