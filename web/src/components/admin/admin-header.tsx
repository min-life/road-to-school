'use client';

import React from 'react';
import { MenuIcon, LogoutIcon } from '@/components/icons';
import { User } from '@/lib/types';
import { formatRoleLabel, getAvatarInitial } from './admin-nav.config';
import { Button } from '@/components/ui/button';
import { NotificationBell } from './notifications/notification-bell';

interface AdminHeaderProps {
  user: User;
  onToggleMobileMenu: () => void;
  onRequestLogout: () => void;
}

export function AdminHeader({
  user,
  onToggleMobileMenu,
  onRequestLogout,
}: AdminHeaderProps) {
  const roleLabel = formatRoleLabel(user.role);
  const initial = getAvatarInitial(user.fullName);

  return (
    <header className="admin-header">
      {/* Brand & Mobile Hamburger Toggle */}
      <div className="admin-header-leading">
        <Button
          type="button"
          onClick={onToggleMobileMenu}
          aria-label="Mở danh mục điều hướng"
          className="admin-mobile-toggle"
        >
          <MenuIcon className="w-5 h-5" />
        </Button>

        <div className="min-w-0">
          <div className="flex flex-col">
            <span className="admin-header-identity">
              RoadToSchool
            </span>
            <span className="admin-header-subtitle">
              Cổng Quản trị Viên
            </span>
          </div>
        </div>
      </div>

      {/* User Information & Quick Actions */}
      <div className="admin-header-actions">
        <NotificationBell />
        <div className="flex items-center gap-2.5">
          {/* Avatar / Fallback Initial */}
          {user.avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={user.avatarUrl}
              alt={user.fullName}
              className="admin-user-avatar"
            />
          ) : (
            <div
              className="admin-user-avatar"
              aria-hidden="true"
            >
              {initial}
            </div>
          )}

          <div className="admin-user-copy">
            <strong>
              {user.fullName}
            </strong>
            <small>
              {roleLabel}
            </small>
          </div>
        </div>

        {/* Nút Đăng xuất */}
        <Button
          type="button"
          onClick={onRequestLogout}
          aria-label="Đăng xuất khỏi hệ thống"
          title="Đăng xuất"
          className="admin-header-logout"
        >
          <LogoutIcon className="w-3.5 h-3.5" />
        </Button>
      </div>
    </header>
  );
}
