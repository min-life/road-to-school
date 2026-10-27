'use client';

import React from 'react';
import { BusLogo, MenuIcon, LogoutIcon } from '@/components/icons';
import { User } from '@/lib/types';
import { formatRoleLabel, getAvatarInitial } from './admin-nav.config';
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
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs">
      {/* Brand & Mobile Hamburger Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          aria-label="Mở danh mục điều hướng"
          className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <MenuIcon className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <BusLogo className="w-8 h-8 shrink-0" />
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-[#1E293B] leading-none">
              RoadToSchool
            </span>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline mt-0.5">
              Cổng Quản trị Viên
            </span>
          </div>
        </div>
      </div>

      {/* User Information & Quick Actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        <NotificationBell />
        <div className="flex items-center gap-2.5">
          {/* Avatar / Fallback Initial */}
          {user.avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={user.avatarUrl}
              alt={user.fullName}
              className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-xs"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full bg-[#FFCB56] text-[#1E293B] font-bold flex items-center justify-center text-sm shadow-xs border border-amber-300"
              aria-hidden="true"
            >
              {initial}
            </div>
          )}

          <div className="hidden sm:flex flex-col text-left">
            <span className="text-sm font-semibold text-[#1E293B] leading-tight">
              {user.fullName}
            </span>
            <span className="text-xs text-slate-500 mt-0.5">
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Nút Đăng xuất */}
        <button
          type="button"
          onClick={onRequestLogout}
          aria-label="Đăng xuất khỏi hệ thống"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer"
        >
          <LogoutIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Đăng xuất</span>
        </button>
      </div>
    </header>
  );
}
