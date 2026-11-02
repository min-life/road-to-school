'use client';

import { useRef, useEffect } from 'react';
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

export function PreviewRouteSelector({ routes, hiddenIndices, activeIndex, onToggle, onSelectAll, onInspect }: {
  routes: PreviewRoute[];
  hiddenIndices: Set<number>;
  activeIndex: number;
  onToggle: (index: number) => void;
  onSelectAll: (visible: boolean) => void;
  onInspect: (index: number) => void;
}) {
  const allRef = useRef<HTMLInputElement>(null);
  const shown = routes.filter((_, index) => !hiddenIndices.has(index)).length;
  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = shown > 0 && shown < routes.length;
  }, [shown, routes.length]);

  return <section className="preview-route-selector" aria-label="Các tuyến hiển thị trên bản đồ">
    <div className="preview-route-selection-bar">
      <label><input ref={allRef} type="checkbox" checked={routes.length > 0 && shown === routes.length}
        disabled={!routes.length} onChange={event => onSelectAll(event.target.checked)} />Chọn tất cả</label>
      <button type="button" onClick={() => onSelectAll(false)} disabled={shown === 0}>Bỏ chọn tất cả</button>
      <span aria-live="polite">Hiện {shown}/{routes.length} tuyến</span>
    </div>
    <div className="preview-route-list" tabIndex={0} role="region" aria-label="Danh sách tuyến, cuộn để xem thêm">
      {routes.map((route, index) => {
        return <article key={`${route.proposedVehiclePlate}-${index}`}
        className={`preview-route-card${activeIndex === index ? ' is-inspected' : ''}`}>
        <input className="preview-route-visibility" type="checkbox" checked={!hiddenIndices.has(index)} onChange={() => onToggle(index)} aria-label={`Hiển thị ${route.name} trên bản đồ`} />
        <button className="preview-route-card-button" type="button" aria-pressed={activeIndex === index}
          aria-label={`Xem điểm dừng của ${route.name}`} onClick={() => onInspect(index)}>
        <div className="preview-route-card-heading">
          <i style={{ backgroundColor: PREVIEW_ROUTE_COLORS[index % PREVIEW_ROUTE_COLORS.length] }} aria-hidden="true" />
          <div className="preview-route-card-info">
            <strong>{route.name}</strong>
            <p className="preview-route-vehicle"><BusFront size={14} aria-hidden="true" /><span>{route.proposedVehiclePlate || 'Chưa có xe'}</span> · {route.studentCount}/{route.proposedVehicleSeatCount || route.seatCount} chỗ</p>
            <p>{(route.totalDistanceMeters / 1000).toFixed(1)} km · ~{Math.round(route.estimatedDurationSeconds / 60)} phút</p>
          </div>
        </div>
        <div className="preview-route-schedule">
          {groupRouteSchedule(route).map(group => <span key={`${group.departureTime}-${group.arrivalTime}`}>
            {group.days.length > 0 && <b>{group.days.join(', ')}</b>}
            <time>{group.departureTime} – {group.arrivalTime}</time>
          </span>)}
        </div>
        </button>
      </article>;
      })}
    </div>
  </section>;
}
