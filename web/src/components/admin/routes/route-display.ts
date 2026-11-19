import type { RouteItem, RouteStopDetail } from '@/lib/types';

export function getRouteDisplayName(item: Pick<RouteItem, 'id' | 'name' | 'direction'>, routes?: RouteItem[]) {
  const name = item.name?.trim();
  const code = /^(?:TD|TV)(\d+)-[0-9A-F]{8}$/i.exec(name ?? '');
  if (name && !code) return name;

  const direction = item.direction === 'TO_SCHOOL' ? 'đi' : 'về';
  const index = routes?.filter(route => route.direction === item.direction).findIndex(route => route.id === item.id) ?? -1;
  const order = code?.[1] ?? (index >= 0 ? String(index + 1).padStart(2, '0') : '');
  return order ? `Tuyến ${direction} ${order}` : `Tuyến ${direction}`;
}

export function getRouteStopKind(stop: RouteStopDetail) {
  if (stop.stopType === 'PARKING_START' || stop.stopType === 'PARKING_END') return 'DEPOT';
  if (stop.stopType === 'SCHOOL_ARRIVAL' || stop.stopType === 'SCHOOL_DEPARTURE') return 'SCHOOL';
  return 'STUDENT';
}

export function getRouteStopLabel(stop: RouteStopDetail, schoolName?: string) {
  const kind = getRouteStopKind(stop);
  if (kind === 'DEPOT') return 'Bãi xe trung tâm';
  if (kind === 'SCHOOL') return schoolName || 'Trường học';
  return stop.studentName || (stop.stopType === 'PICKUP' ? 'Điểm đón' : 'Điểm trả');
}
