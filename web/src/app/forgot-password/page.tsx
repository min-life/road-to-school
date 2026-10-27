'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  EyeIcon,
  EyeOffIcon,
  SpinnerIcon,
  AlertIcon,
  CheckIcon,
} from '@/components/icons';
import { apiClient, ApiError } from '@/lib/api-client';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [countdown, setCountdown] = useState(0);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  // Đếm ngược thời hạn hiệu lực của mã OTP (mặc định 300s = 5 phút)
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Bước 1: Gửi yêu cầu nhận mã OTP
  const handleRequestOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmed = identifier.trim();
    if (!trimmed) {
      setError('Vui lòng nhập email hoặc số điện thoại');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.forgotPasswordRequestOtp({ identifier: trimmed });
      setInfoMessage(res.message);
      setStep(2);
      setCountdown(300); // 5 phút TTL
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Không thể gửi yêu cầu mã xác minh. Vui lòng thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gửi lại mã OTP khi đồng hồ về 0
  const handleResendOtp = async () => {
    if (countdown > 0 || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await apiClient.forgotPasswordRequestOtp({ identifier: identifier.trim() });
      setInfoMessage(res.message);
      setCountdown(300);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Không thể gửi lại mã xác thực. Vui lòng thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bước 2: Xác nhận OTP và đặt lại mật khẩu mới
  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!otp.trim()) {
      setError('Vui lòng nhập mã xác thực OTP');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có tối thiểu 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.resetPassword({
        identifier: identifier.trim(),
        otp: otp.trim(),
        newPassword,
        confirmPassword,
      });

      setSuccess(true);
      // Tự động chuyển hướng về trang đăng nhập sau 2.5 giây
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Đặt lại mật khẩu không thành công. Vui lòng thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageShell>
      <div>
        {/* Header Logo */}
        <PageHeader className="auth-heading">
          <h1 className="text-xl font-bold text-foreground">
            {step === 1 ? 'Quên mật khẩu' : 'Đặt lại mật khẩu'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {step === 1
              ? 'Nhập thông tin tài khoản để nhận mã xác minh OTP'
              : `Nhập mã 6 số gửi đến ${identifier}`}
          </p>
        </PageHeader>

        {/* Thông báo Thành công */}
        {success ? (
          <div className="text-center py-6 animate-in fade-in">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
              <CheckIcon className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">
              Đặt lại mật khẩu thành công!
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Mật khẩu mới đã được cập nhật. Đang chuyển hướng về trang đăng nhập...
            </p>
            <Link data-variant="primary" data-size="default"
              href="/login"
              className="ui-button inline-flex items-center justify-center h-10 px-6 rounded-xl bg-primary hover:bg-[var(--brand-primary-hover)] text-foreground font-bold text-sm shadow-sm transition-all"
            >
              Đăng nhập ngay
            </Link>
          </div>
        ) : (
          <>
            {/* Phản hồi trung tính Anti-Enumeration */}
            {infoMessage && (
              <div
                role="status"
                className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed"
              >
                {infoMessage}
              </div>
            )}

            {/* Thông báo lỗi */}
            {error && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-sm text-red-700 animate-in fade-in"
              >
                <AlertIcon className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* FORM BƯỚC 1: YÊU CẦU MÃ */}
            {step === 1 && (
              <form onSubmit={handleRequestOtp} className="space-y-5" noValidate>
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
                    required
                    autoFocus
                    disabled={isSubmitting}
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="admin@r2s.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-foreground placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:bg-slate-50"
                  />
                </div>

                <Button variant="primary" size="default"
                  type="submit"
                  disabled={isSubmitting || !identifier.trim()}
                  className="w-full mt-2 h-11 flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-[var(--brand-primary-hover)] active:bg-[var(--brand-primary-hover)] text-foreground font-bold text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <SpinnerIcon className="w-4 h-4 text-foreground" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <span>Gửi mã</span>
                  )}
                </Button>
              </form>
            )}

            {/* FORM BƯỚC 2: NHẬP OTP & ĐẶT LẠI MẬT KHẨU */}
            {step === 2 && (
              <form onSubmit={handleResetPassword} className="space-y-4" noValidate>
                {/* Trường OTP */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="otp"
                      className="block text-sm font-semibold text-foreground"
                    >
                      Mã xác thực OTP
                    </label>
                    <span className="text-xs font-mono font-medium text-slate-500">
                      {countdown > 0 ? (
                        `Hết hạn: ${formatCountdown(countdown)}`
                      ) : (
                        <Button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={isSubmitting}
                          className="text-amber-700 font-semibold hover:underline"
                        >
                          Gửi lại mã
                        </Button>
                      )}
                    </span>
                  </div>
                  <Input
                    id="otp"
                    name="otp"
                    type="text"
                    maxLength={8}
                    required
                    autoFocus
                    disabled={isSubmitting}
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Nhập mã 6 chữ số"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-foreground placeholder-slate-400 text-sm tracking-widest text-center font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:bg-slate-50"
                  />
                </div>

                {/* Mật khẩu mới */}
                <div>
                  <label
                    htmlFor="newPassword"
                    className="block text-sm font-semibold text-foreground mb-1.5"
                  >
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      disabled={isSubmitting}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full px-3.5 py-2.5 pr-11 rounded-xl border border-slate-300 bg-white text-foreground placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:bg-slate-50"
                    />
                    <Button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      tabIndex={-1}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showNewPassword ? (
                        <EyeOffIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Xác nhận mật khẩu mới */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-semibold text-foreground mb-1.5"
                  >
                    Xác nhận mật khẩu mới
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      disabled={isSubmitting}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="Nhập lại mật khẩu mới"
                      className="w-full px-3.5 py-2.5 pr-11 rounded-xl border border-slate-300 bg-white text-foreground placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:bg-slate-50"
                    />
                    <Button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showConfirmPassword ? (
                        <EyeOffIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Nút Hoàn tất */}
                <Button variant="primary" size="default"
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !otp.trim() ||
                    newPassword.length < 6 ||
                    confirmPassword.length < 6
                  }
                  className="w-full mt-2 h-11 flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-[var(--brand-primary-hover)] active:bg-[var(--brand-primary-hover)] text-foreground font-bold text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <SpinnerIcon className="w-4 h-4 text-foreground" />
                      <span>Đang cập nhật...</span>
                    </>
                  ) : (
                    <span>Hoàn tất</span>
                  )}
                </Button>
              </form>
            )}

            {/* Quay lại trang đăng nhập */}
            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-foreground transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span>Quay lại đăng nhập</span>
              </Link>
            </div>
          </>
        )}
      </div>

      <footer className="auth-footer">
        © 2026 RoadToSchool. Nền tảng quản lý xe buýt học sinh an toàn.
      </footer>
    </AuthPageShell>
  );
}
