'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { BusLogo, EyeIcon, EyeOffIcon, SpinnerIcon, AlertIcon } from '@/components/icons';
import { ApiError } from '@/lib/api-client';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Nếu người dùng đã đăng nhập, tự động chuyển về trang quản trị
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/admin');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      setError('Vui lòng nhập email hoặc số điện thoại');
      return;
    }

    if (!password) {
      setError('Vui lòng nhập mật khẩu');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(trimmedIdentifier, password);
      // Note: Khi login thành công, AuthProvider sẽ hiển thị RoleSplash 1.2s rồi tự điều hướng sang /admin
    } catch (err) {
      setIsSubmitting(false);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFFDF6] px-4 py-8">
      {/* Container Thẻ đăng nhập */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200/80 p-8 sm:p-10">
        {/* Header: Logo & Tiêu đề */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center gap-3 mb-3">
            <BusLogo className="w-10 h-10" />
            <span className="text-2xl font-bold tracking-tight text-[#1E293B]">
              RoadToSchool
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#1E293B]">
            Đăng nhập Quản trị
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Cổng quản lý dịch vụ đưa đón học sinh
          </p>
        </div>

        {/* Thông báo lỗi */}
        {error && (
          <div
            role="alert"
            className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-sm text-red-700 animate-in fade-in"
          >
            <AlertIcon className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Form đăng nhập */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Trường định danh */}
          <div>
            <label
              htmlFor="identifier"
              className="block text-sm font-semibold text-[#1E293B] mb-1.5"
            >
              Email hoặc Số điện thoại
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              required
              disabled={isSubmitting}
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (error) setError(null);
              }}
              placeholder="admin@r2s.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-[#1E293B] placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFCB56] focus:border-transparent transition-all disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          {/* Trường mật khẩu */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-[#1E293B]"
              >
                Mật khẩu
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-slate-600 hover:text-[#1E293B] hover:underline transition-colors"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                disabled={isSubmitting}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 pr-11 rounded-xl border border-slate-300 bg-white text-[#1E293B] placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFCB56] focus:border-transparent transition-all disabled:bg-slate-50 disabled:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? (
                  <EyeOffIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Nút Đăng nhập */}
          <button
            type="submit"
            disabled={isSubmitting || !identifier.trim() || !password}
            className="w-full mt-2 h-11 flex items-center justify-center gap-2 rounded-xl bg-[#FFCB56] hover:bg-[#FBBF24] active:bg-[#F59E0B] text-[#1E293B] font-bold text-sm tracking-wide shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FFCB56] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <SpinnerIcon className="w-4 h-4 text-[#1E293B]" />
                <span>Đang đăng nhập...</span>
              </>
            ) : (
              <span>Đăng nhập</span>
            )}
          </button>
        </form>
      </div>

      {/* Footer bản quyền */}
      <footer className="mt-8 text-center text-xs text-slate-400">
        © 2026 RoadToSchool. Nền tảng quản lý xe buýt học sinh an toàn.
      </footer>
    </div>
  );
}
