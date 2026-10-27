'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  DashboardIcon,
  SchoolIcon,
  SettingsIcon,
  LogoutIcon,
  CloseIcon,
  BusLogo,
  StudentIcon,
  TeacherIcon,
  DriverIcon,
  VehicleIcon,
  RequestIcon,
  RouteIcon,
  BusIcon,
  CalendarIcon,
  AlertTriangleIcon,
} from '@/components/icons';
import { Role } from '@/lib/types';
import { getVisibleNavItems, AdminNavItem } from './admin-nav.config';

interface AdminSidebarProps {
  role: Role;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onRequestLogout: () => void;
}

export function AdminSidebar({
  role,
  isMobileOpen,
  onCloseMobile,
  onRequestLogout,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const visibleItems = getVisibleNavItems(role);

  const renderIcon = (id: string, isActive: boolean) => {
    const iconClass = `w-5 h-5 shrink-0 ${
      isActive ? 'text-[#1E293B]' : 'text-slate-500 group-hover:text-slate-800'
    }`;

    switch (id) {
      case 'overview':
        return <DashboardIcon className={iconClass} />;
      case 'schools':
        return <SchoolIcon className={iconClass} />;
      case 'drivers':
        return <DriverIcon className={iconClass} />;
      case 'vehicles':
        return <VehicleIcon className={iconClass} />;
      case 'routes':
        return <RouteIcon className={iconClass} />;
      case 'trips':
        return <BusIcon className={iconClass} />;
      case 'leave-notices':
        return <CalendarIcon className={iconClass} />;
      case 'incidents':
        return <AlertTriangleIcon className={iconClass} />;
      case 'students':
        return <StudentIcon className={iconClass} />;
      case 'teachers':
        return <TeacherIcon className={iconClass} />;
      case 'requests':
        return <RequestIcon className={iconClass} />;
      case 'settings':
        return <SettingsIcon className={iconClass} />;
      default:
        return null;
    }
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between">
      {/* Danh sách mục điều hướng */}
      <nav aria-label="Điều hướng quản trị" className="space-y-1.5 p-3">
        {visibleItems.map((item: AdminNavItem) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onCloseMobile}
              className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#FFCB56]/25 text-[#1E293B] font-semibold border border-[#FFCB56]/40 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#1E293B]'
              }`}
            >
              <div className="flex items-center gap-3">
                {renderIcon(item.id, isActive)}
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Chân sidebar: Đăng xuất */}
      <div className="p-3 border-t border-slate-200/80">
        <button
          type="button"
          onClick={() => {
            onCloseMobile();
            onRequestLogout();
          }}
          className="group w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer text-left"
        >
          <LogoutIcon className="w-5 h-5 text-slate-500 group-hover:text-red-500 shrink-0" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Cố định ở desktop) */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-white border-r border-slate-200/80 shrink-0 h-[calc(100vh-61px)] sticky top-[61px]">
        {navContent}
      </aside>

      {/* Mobile Drawer (Bật nổi trên mobile/tablet nhỏ) */}
      {isMobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Danh mục điều hướng di động"
          className="md:hidden fixed inset-0 z-50 flex"
        >
          {/* Backdrop mờ */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Nội dung Drawer */}
          <div className="relative flex flex-col w-4/5 max-w-xs bg-white h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {/* Header Drawer */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <BusLogo className="w-7 h-7" />
                <span className="font-bold text-[#1E293B]">RoadToSchool</span>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Đóng danh mục"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Links */}
            <div className="flex-1 overflow-y-auto">
              {navContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
