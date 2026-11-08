'use client';

import type { PreviewRoute } from '@/lib/types';
import { BusFront } from 'lucide-react';

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

/** Inspecting a card never changes which polylines are visible. */
export function PreviewRouteSelector({ routes, activeId, onInspect }: {
  routes: PreviewRouteEntry[];
  activeId?: string;
  onInspect: (entry: PreviewRouteEntry) => void;
}) {
  return <section className="preview-route-selector" aria-label="Các tuyến trong phương án">
    <div className="preview-route-list" tabIndex={0} role="region" aria-label="Danh sách tuyến, cuộn để xem thêm">
      {routes.map(entry => <article key={entry.id} className={`preview-route-card${activeId === entry.id ? ' is-inspected' : ''}`}>
        <button className="preview-route-card-button" type="button" aria-pressed={activeId === entry.id}
          aria-label={`Xem thông tin ${entry.route.name}`} onClick={() => onInspect(entry)}>
          <span className="preview-route-card-heading">
            <i style={{ backgroundColor: entry.color }} aria-hidden="true" />
            <span className="preview-route-card-info"><strong>{entry.route.name}</strong>
              <small>{entry.direction === 'OUTBOUND' ? 'Chiều đi' : 'Chiều về'}</small>
              <span className="preview-route-vehicle"><BusFront size={14} aria-hidden="true" /><span>{entry.route.proposedVehiclePlate || 'Chưa có xe'}</span> · {entry.route.studentCount}/{entry.route.proposedVehicleSeatCount || entry.route.seatCount} chỗ</span>
              <small>{(entry.route.totalDistanceMeters / 1000).toFixed(1)} km · ~{Math.round(entry.route.estimatedDurationSeconds / 60)} phút</small>
            </span>
          </span>
          <span className="preview-route-schedule">
            {groupRouteSchedule(entry.route).map(group => <span key={`${group.departureTime}-${group.arrivalTime}`}>
              {group.days.length > 0 && <b>{group.days.join(', ')}</b>}
              <time>{group.departureTime} – {group.arrivalTime}</time>
            </span>)}
          </span>
        </button>
      </article>)}
    </div>
  </section>;
}
