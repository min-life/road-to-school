'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { EyeIcon, EyeOffIcon, SpinnerIcon, AlertIcon } from '@/components/icons';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { ApiError } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
      }
    } finally {
      // The router can preserve this page when navigating away and back after logout.
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageShell>
      {/* Container Thẻ đăng nhập */}
      <div>
        {/* Header: Logo & Tiêu đề */}
        <PageHeader className="auth-heading">
          <h1 className="text-xl font-bold text-foreground">
            Đăng nhập
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Cổng quản lý dịch vụ đưa đón học sinh
          </p>
        </PageHeader>

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
              className="block text-sm font-semibold text-foreground mb-1.5"
            >
              Email hoặc Số điện thoại
            </label>
            <Input
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-foreground placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          {/* Trường mật khẩu */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-foreground"
              >
                Mật khẩu
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-slate-600 hover:text-foreground hover:underline transition-colors"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <Input
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
                className="w-full px-3.5 py-2.5 pr-11 rounded-xl border border-slate-300 bg-white text-foreground placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:bg-slate-50 disabled:text-slate-500"
              />
              <Button
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
              </Button>
            </div>
          </div>

          {/* Nút Đăng nhập */}
          <Button variant="primary" size="default"
            type="submit"
            disabled={isSubmitting || !identifier.trim() || !password}
            className="w-full mt-2 h-11 flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-[var(--brand-primary-hover)] active:bg-[var(--brand-primary-hover)] text-foreground font-bold text-sm tracking-wide shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <SpinnerIcon className="w-4 h-4 text-foreground" />
                <span>Đang đăng nhập...</span>
              </>
            ) : (
              <span>Đăng nhập</span>
            )}
          </Button>
        </form>
      </div>

      {/* Footer bản quyền */}
      <footer className="auth-footer">
        © 2026 RoadToSchool. Nền tảng quản lý xe buýt học sinh an toàn.
      </footer>
    </AuthPageShell>
  );
}
