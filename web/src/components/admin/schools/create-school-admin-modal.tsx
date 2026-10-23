'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { CloseIcon, SpinnerIcon, AlertIcon } from '@/components/icons';

interface CreateSchoolAdminModalProps {
  isOpen: boolean;
  schoolId: string;
  schoolName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateSchoolAdminModal({
  isOpen,
  schoolId,
  schoolName,
  onClose,
  onSuccess,
}: CreateSchoolAdminModalProps) {
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
      setErrorMessage('Vui lòng nhập họ và tên của quản trị viên.');
      return;
    }

    if (!trimmedEmail && !trimmedPhone) {
      setErrorMessage('Vui lòng cung cấp ít nhất Email hoặc Số điện thoại để làm thông tin đăng nhập.');
      return;
    }

    // Phone format check if provided
    if (trimmedPhone && !/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(trimmedPhone)) {
      setErrorMessage('Số điện thoại không đúng định dạng di động Việt Nam (ví dụ: 0912345678).');
      return;
    }

    // Email format check if provided
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage('Địa chỉ email không đúng định dạng (ví dụ: admin@school.edu.vn).');
      return;
    }

    try {
      setIsLoading(true);
      await apiClient.createSchoolAdmin(schoolId, {
        fullName: trimmedName,
        email: trimmedEmail || undefined,
        phone: trimmedPhone || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          'Không thể tạo tài khoản quản trị trường. Vui lòng kiểm tra lại thông tin.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-create-admin-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isLoading) onClose();
        }}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl z-10 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2
              id="modal-create-admin-title"
              className="text-base font-bold text-slate-800"
            >
              Tạo tài khoản Quản trị trường
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs sm:max-w-md">
              Trường: {schoolName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertIcon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          <div>
            <label
              htmlFor="admin-fullname"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="admin-fullname"
              value={fullName}
              disabled={isLoading}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn Hùng"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label
              htmlFor="admin-email"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Email <span className="text-xs font-normal text-slate-400">(Tùy chọn nếu đã có SĐT)</span>
            </label>
            <input
              type="email"
              id="admin-email"
              value={email}
              disabled={isLoading}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@school.edu.vn"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor="admin-phone"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Số điện thoại <span className="text-xs font-normal text-slate-400">(Tùy chọn nếu đã có Email)</span>
            </label>
            <input
              type="tel"
              id="admin-phone"
              value={phone}
              disabled={isLoading}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0912345678"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
          </div>

          <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs text-amber-800 leading-relaxed">
            Hệ thống sẽ tự động gán vai trò <strong>Quản trị trường (SCHOOL_ADMIN)</strong> và tạo mật khẩu ban đầu an toàn. Thông tin đăng nhập được gửi qua kênh bàn giao nội bộ.
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFCB56] hover:bg-[#e6b74d] text-[#1E293B] text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isLoading ? (
                <>
                  <SpinnerIcon className="w-4 h-4 animate-spin text-[#1E293B]" />
                  <span>Đang tạo tài khoản...</span>
                </>
              ) : (
                <span>Tạo tài khoản</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
