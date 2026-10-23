'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { SpinnerIcon } from '@/components/icons';

export interface AdminSchoolsGuardProps {
  children: React.ReactNode;
}

/**
 * Route protection guard for School Management.
 * Strictly restricts access to SYSTEM_ADMIN only.
 * If user is SCHOOL_ADMIN or any non-SYSTEM_ADMIN role, redirects immediately to /admin
 * without rendering or flashing school data.
 */
export function AdminSchoolsGuard({ children }: AdminSchoolsGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !user) {
        router.replace('/login');
      } else if (user.role !== 'SYSTEM_ADMIN') {
        // SCHOOL_ADMIN or other unauthorized roles cannot access school management
        router.replace('/admin');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="py-16 flex flex-col items-center justify-center text-slate-500"
      >
        <div className="flex items-center gap-2 text-sm">
          <SpinnerIcon className="w-5 h-5 text-amber-500 animate-spin" />
          <span>Đang kiểm tra quyền truy cập...</span>
        </div>
      </div>
    );
  }

  // If not authenticated or not SYSTEM_ADMIN, do not render children
  if (!isAuthenticated || !user || user.role !== 'SYSTEM_ADMIN') {
    return null;
  }

  return <>{children}</>;
}
