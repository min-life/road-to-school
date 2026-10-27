'use client';

import React, { useState } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuth } from '@/components/auth/auth-provider';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { LogoutDialog } from '@/components/admin/logout-dialog';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
      {user && (
        <div className="admin-shell">
          <AdminSidebar
            role={user.role}
            isMobileOpen={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
            onRequestLogout={() => setIsLogoutDialogOpen(true)}
          />

          <div className="admin-workspace">
            <AdminHeader
              user={user}
              onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
              onRequestLogout={() => setIsLogoutDialogOpen(true)}
            />
            <main className="admin-content">
              <div className="admin-content-inner">
                {children}
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
    </AuthGuard>
  );
}
