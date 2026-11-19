'use client';

import type { PreviewRoute } from '@/lib/types';
import { MoreHorizontal } from 'lucide-react';

export const PREVIEW_ROUTE_COLORS = ['#2563eb', '#9333ea', '#ea580c', '#059669', '#db2777', '#0891b2', '#4f46e5', '#a16207'];

const WEEKDAYS = [
  ['monday', 'T2'], ['tuesday', 'T3'], ['wednesday', 'T4'], ['thursday', 'T5'],
  ['friday', 'T6'], ['saturday', 'T7'], ['sunday', 'CN'],
] as const;

export function groupRouteSchedule(route: Pick<PreviewRoute, 'derivedWeeklySchedule' | 'departureTime' | 'arrivalTime'>) {
  const groups = new Map<string, { days: string[]; departureTime: string; arrivalTime: string }>();
  for (const [day, label] of WEEKDAYS) {
    const schedule = route.derivedWeeklySchedule?.[day];
    if (!schedule) continue;
    const key = `${schedule.departureTime}-${schedule.arrivalTime}`;
    const group = groups.get(key);
    if (group) group.days.push(label);
    else groups.set(key, { days: [label], ...schedule });
  }
  return groups.size ? [...groups.values()] : [{ days: [], departureTime: route.departureTime, arrivalTime: route.arrivalTime }];
}

export interface PreviewRouteEntry {
  id: string;
  direction: 'OUTBOUND' | 'RETURN';
  index: number;
  route: PreviewRoute;
  color: string;
}

export function previewRouteLabel(direction: PreviewRouteEntry['direction'], index: number) {
  return `Tuyến ${direction === 'OUTBOUND' ? 'đi' : 'về'} ${String(index + 1).padStart(2, '0')}`;
}

export function PreviewRouteSelector({ routes, active, onInspect, onRemove, pending }: {
  routes: PreviewRouteEntry[];
  active: PreviewRouteEntry;
  onInspect: (entry: PreviewRouteEntry) => void;
  onRemove?: () => void;
  pending: boolean;
}) {
  const { route } = active;
  const seats = route.proposedVehicleSeatCount ?? route.seatCount;
  const schedule = groupRouteSchedule(route);

  return <section className="preview-route-selector" aria-label="Tuyến đang xem">
    {routes.length > 1 && <label className="preview-route-select">
      <span>Chọn tuyến</span>
      <select value={active.id} onChange={event => {
        const entry = routes.find(item => item.id === event.target.value);
        if (entry) onInspect(entry);
      }}>
        {routes.map(entry => <option key={entry.id} value={entry.id}>
          {previewRouteLabel(entry.direction, entry.index)}{entry.route.proposedVehiclePlate ? ` · ${entry.route.proposedVehiclePlate}` : ''}
        </option>)}
      </select>
    </label>}
    <article className="preview-route-card">
      <div className="preview-route-card-heading">
        <i style={{ backgroundColor: active.color }} aria-hidden="true" />
        <h3>{previewRouteLabel(active.direction, active.index)}</h3>
        <strong>{route.proposedVehiclePlate || 'Chưa có xe'}</strong>
        {onRemove && <details key={active.id} className="preview-route-menu">
          <summary aria-label="Thao tác tuyến về"><MoreHorizontal size={18} aria-hidden="true" /></summary>
          <div><button type="button" disabled={pending} onClick={onRemove}>
            {pending ? 'Đang bỏ tuyến…' : 'Bỏ tuyến về'}
          </button></div>
        </details>}
      </div>
      <div className="preview-route-metrics">
        <span>{(route.totalDistanceMeters / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km</span>
        <span>{seats == null ? `${route.studentCount} học sinh` : `${route.studentCount}/${seats} chỗ`}</span>
      </div>
      <div className="preview-route-schedule" aria-label="Giờ dự kiến theo ngày">
        {schedule.map(group => <div key={`${group.departureTime}-${group.arrivalTime}`}>
          <strong><time>{group.departureTime}</time> – <time>{group.arrivalTime}</time></strong>
          {group.days.length > 0 && <span>{group.days.join(', ')}</span>}
        </div>)}
      </div>
    </article>
  </section>;
}
