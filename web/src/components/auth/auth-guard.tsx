'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-provider';
import { BusLogo, SpinnerIcon } from '../icons';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (
        user &&
        user.role !== 'SYSTEM_ADMIN' &&
        user.role !== 'SCHOOL_ADMIN'
      ) {
        // Chỉ SYSTEM_ADMIN và SCHOOL_ADMIN được phép truy cập Web
        router.replace('/login');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="min-h-screen flex flex-col items-center justify-center bg-[#FFFDF6]"
      >
        <div className="flex flex-col items-center gap-3">
          <BusLogo className="w-12 h-12 animate-pulse" />
          <div className="flex items-center gap-2 text-slate-600 text-sm">
            <SpinnerIcon className="w-4 h-4 text-[#FFCB56]" />
            <span>Đang xác thực phiên làm việc...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return <>{children}</>;
}
