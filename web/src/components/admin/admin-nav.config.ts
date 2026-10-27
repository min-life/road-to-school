import type { Role } from '../../lib/types.ts';

export interface AdminNavItem {
  id: string;
  label: string;
  href: string;
  allowedRoles: Role[];
  badge?: string;
  isDeferred?: boolean;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    id: 'overview',
    label: 'Tổng quan',
    href: '/admin',
    allowedRoles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'],
  },
  {
    id: 'schools',
    label: 'Trường học',
    href: '/admin/schools',
    allowedRoles: ['SYSTEM_ADMIN'],
  },
  {
    id: 'drivers',
    label: 'Tài xế',
    href: '/admin/drivers',
    allowedRoles: ['SYSTEM_ADMIN'],
  },
  {
    id: 'vehicles',
    label: 'Phương tiện',
    href: '/admin/vehicles',
    allowedRoles: ['SYSTEM_ADMIN'],
  },
  {
    id: 'routes',
    label: 'Phương án tuyến',
    href: '/admin/routes',
    allowedRoles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'],
  },
  {
    id: 'trips',
    label: 'Chuyến xe',
    href: '/admin/trips',
    allowedRoles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'],
  },
  {
    id: 'leave-notices',
    label: 'Báo nghỉ',
    href: '/admin/leave-notices',
    allowedRoles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'],
  },
  {
    id: 'incidents',
    label: 'Sự cố',
    href: '/admin/incidents',
    allowedRoles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'],
  },
  {
    id: 'students',
    label: 'Học sinh',
    href: '/admin/students',
    allowedRoles: ['SCHOOL_ADMIN'],
  },
  {
    id: 'teachers',
    label: 'Giáo viên',
    href: '/admin/teachers',
    allowedRoles: ['SCHOOL_ADMIN'],
  },
  {
    id: 'requests',
    label: 'Yêu cầu',
    href: '/admin/requests',
    allowedRoles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'],
  },
  {
    id: 'settings',
    label: 'Cài đặt',
    href: '/admin/settings',
    allowedRoles: ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'],
  },
];

/**
 * Lọc danh sách menu theo vai trò người dùng (chỉ cho phép menu được phân quyền)
 */
export function getVisibleNavItems(role: Role): AdminNavItem[] {
  return ADMIN_NAV_ITEMS.filter((item) => item.allowedRoles.includes(role));
}

/**
 * Chuyển đổi mã Role kỹ thuật sang nhãn tiếng Việt trang trọng
 */
export function formatRoleLabel(role: Role): string {
  switch (role) {
    case 'SYSTEM_ADMIN':
      return 'Quản trị hệ thống';
    case 'SCHOOL_ADMIN':
      return 'Quản trị trường học';
    case 'BUS_ATTENDANT':
      return 'Giáo viên';
    case 'DRIVER':
      return 'Tài xế';
    case 'PARENT':
      return 'Phụ huynh';
    default:
      return role;
  }
}

/**
 * Lấy chữ cái đại diện đầu tiên cho Avatar placeholder
 */
export function getAvatarInitial(fullName?: string | null): string {
  if (!fullName || typeof fullName !== 'string') return 'A';
  const trimmed = fullName.trim();
  if (!trimmed) return 'A';
  return trimmed.charAt(0).toUpperCase();
}
