const navigationOrigin = 'https://road-to-school.invalid';

export function schoolTabFromQuery(value: string | null): 'employees' | 'students' | 'routes' | 'trips' {
  return value === 'students' || value === 'routes' || value === 'trips' ? value : 'employees';
}

/** Accept local admin destinations only; never use browser history as an implicit fallback. */
export function safeAdminReturnTo(value: string | null | undefined, currentPath?: string): string | null {
  if (!value || value.length > 4096 || !value.startsWith('/admin') || /[\\\u0000-\u0020]/.test(value)) return null;
  try {
    const url = new URL(value, navigationOrigin);
    if (url.origin !== navigationOrigin || !/^\/admin(?:\/|$)/.test(url.pathname)) return null;
    if (currentPath && url.pathname === currentPath) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

export function withReturnTo(destination: string, source: string): string {
  const target = safeAdminReturnTo(destination);
  if (!target) return destination;
  const url = new URL(target, navigationOrigin);
  const returnTo = safeAdminReturnTo(source, url.pathname);
  if (returnTo) url.searchParams.set('returnTo', returnTo);
  return url.pathname + url.search + url.hash;
}

export function backLabel(destination: string): string {
  const url = new URL(destination, navigationOrigin);
  const path = url.pathname;
  if (/^\/admin\/schools\/[^/]+$/.test(path)) {
    if (url.searchParams.get('tab') === 'students') return 'Quay lại học sinh của trường';
    if (url.searchParams.get('tab') === 'routes') return 'Quay lại phương án của trường';
    if (url.searchParams.get('tab') === 'trips') return 'Quay lại chuyến xe của trường';
    return 'Quay lại trường học';
  }
  if (/^\/admin\/routes\/plans\/[^/]+$/.test(path)) return 'Quay lại phương án tuyến';
  const labels: Record<string, string> = {
    '/admin': 'Quay lại tổng quan',
    '/admin/schools': 'Quay lại danh sách trường',
    '/admin/drivers': 'Quay lại danh sách tài xế',
    '/admin/teachers': 'Quay lại danh sách giáo viên',
    '/admin/students': 'Quay lại danh sách học sinh',
    '/admin/trips': 'Quay lại danh sách chuyến xe',
    '/admin/routes': 'Quay lại danh sách phương án',
    '/admin/notifications': 'Quay lại thông báo',
    '/admin/leave-notices': 'Quay lại báo nghỉ',
    '/admin/incidents': 'Quay lại sự cố',
    '/admin/requests': 'Quay lại yêu cầu',
  };
  return labels[path] || 'Quay lại trang trước';
}
