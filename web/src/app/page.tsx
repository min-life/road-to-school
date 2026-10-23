'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { BusLogo, SpinnerIcon } from '@/components/icons';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/admin');
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

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
          <span>Đang chuyển hướng...</span>
        </div>
      </div>
    </div>
  );
}
