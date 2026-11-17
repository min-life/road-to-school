'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuth } from '@/components/auth/auth-provider';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { LogoutDialog } from '@/components/admin/logout-dialog';
import { NotificationProvider } from '@/components/admin/notifications/notification-provider';

const SIDEBAR_COLLAPSE_STORAGE_KEY = 'r2s_admin_sidebar_collapsed';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY);
      if (stored === 'true') {
        setIsSidebarCollapsed(true);
      } else if (stored === 'false') {
        setIsSidebarCollapsed(false);
      }
    } catch {
      // Storage access blocked or restricted; retain in-memory state
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, String(next));
      } catch {
        // Storage write failed; retain in-memory state
      }
      return next;
    });
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setIsLogoutDialogOpen(false);
    }
  };

  return (
    <AuthGuard>
      <NotificationProvider>
      {user && (
        <div
          className="admin-shell"
          data-sidebar-collapsed={isSidebarCollapsed ? 'true' : 'false'}
        >
          <AdminSidebar
            role={user.role}
            isMobileOpen={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
            onRequestLogout={() => setIsLogoutDialogOpen(true)}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleSidebarCollapse}
          />

          <div className="admin-workspace">
            <AdminHeader
              user={user}
              onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
            />
            <main className="admin-content">
              <div className="admin-content-inner">
                <Suspense fallback={<p className="text-sm text-slate-500">Đang tải…</p>}>{children}</Suspense>
              </div>
            </main>
          </div>

          {/* Hộp thoại xác nhận đăng xuất an toàn */}
          <LogoutDialog
            isOpen={isLogoutDialogOpen}
            isLoading={isLoggingOut}
            onClose={() => !isLoggingOut && setIsLogoutDialogOpen(false)}
            onConfirm={handleConfirmLogout}
          />
        </div>
      )}
      </NotificationProvider>
    </AuthGuard>
  );
}
