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
import { BrandLogo } from '@/components/common/brand-logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
      isActive ? 'text-navy' : 'text-current'
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
    <div className="admin-nav-content">
      {/* Danh sách mục điều hướng */}
      <nav aria-label="Điều hướng quản trị" className="admin-nav">
        {visibleItems.map((item: AdminNavItem) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              data-active={isActive}
              onClick={onCloseMobile}
              className="admin-nav-link"
            >
              <div className="flex items-center gap-3">
                {renderIcon(item.id, isActive)}
                <span className="admin-nav-label">{item.label}</span>
              </div>
              {item.badge && (
                <Badge className="admin-nav-badge text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Chân sidebar: Đăng xuất */}
      <div className="admin-nav-footer">
        <Button
          type="button"
          aria-label="Đăng xuất"
          title="Đăng xuất"
          onClick={() => {
            onCloseMobile();
            onRequestLogout();
          }}
          className="admin-nav-logout"
        >
          <LogoutIcon className="w-5 h-5 shrink-0" />
          <span className="admin-nav-label">Đăng xuất</span>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Cố định ở desktop) */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <BrandLogo />
          <BrandLogo icon />
        </div>
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
          <div className="admin-drawer">
            {/* Header Drawer */}
            <div className="admin-drawer-header">
              <div className="flex items-center gap-2.5">
                <BrandLogo />
              </div>
              <Button
                type="button"
                onClick={onCloseMobile}
                aria-label="Đóng danh mục"
                className="admin-drawer-close"
              >
                <CloseIcon className="w-5 h-5" />
              </Button>
            </div>

            {/* Menu Links */}
            <div className="flex flex-1 min-h-0 flex-col">
              {navContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
