'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { SpinnerIcon } from '@/components/icons';

export interface SchoolAdminGuardProps {
  children: React.ReactNode;
}

/**
 * Route protection guard for School Admin-specific management (Students, Teachers).
 * Strictly restricts access to SCHOOL_ADMIN with an assigned schoolId.
 * If user is not SCHOOL_ADMIN, redirects to /admin.
 */
export function SchoolAdminGuard({ children }: SchoolAdminGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !user) {
        router.replace('/login');
      } else if (user.role !== 'SCHOOL_ADMIN') {
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

  if (!isAuthenticated || !user || user.role !== 'SCHOOL_ADMIN') {
    return null;
  }

  return <>{children}</>;
}
