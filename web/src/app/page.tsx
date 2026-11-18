'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { SpinnerIcon } from '@/components/icons';

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
        <Image
          src="/road-to-school-icon.svg"
          alt="Road To School"
          width={88}
          height={55}
          loading="eager"
          unoptimized
        />
        <div className="flex items-center gap-2 text-slate-600 text-sm">
          <SpinnerIcon className="w-4 h-4 text-[#FFCB56]" />
          <span>Đang chuyển hướng...</span>
        </div>
      </div>
    </div>
  );
}
