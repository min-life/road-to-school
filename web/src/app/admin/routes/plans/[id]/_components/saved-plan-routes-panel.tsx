'use client';

import { useState } from 'react';
import { BusFront } from 'lucide-react';
import type { RouteDirection, RouteItem } from '@/lib/types';
import { ContextLink } from '@/components/admin/common/context-navigation';
import { PlanningTabs } from '@/components/admin/routes/route-planning-workspace';
import { groupRouteSchedule, PREVIEW_ROUTE_COLORS } from '@/components/admin/routes/preview-route-selector';

/** Viewing a direction or card does not change the map visibility selection. */
export function SavedPlanRoutesPanel({ routes, activeId, route, schoolName, routeError, loading, onChoose, onFocus }: {
  routes: RouteItem[]; activeId?: string; route?: RouteItem; schoolName?: string;
  routeError?: string; loading: boolean; onChoose: (id: string) => void;
  onFocus: (point: { latitude: number; longitude: number; zoom: number }) => void;
}) {
  const [selection, setSelection] = useState<{ routeId?: string; direction: RouteDirection } | null>(null);
  const activeDirection = routes.find(item => item.id === activeId)?.direction ?? 'TO_SCHOOL';
  const direction = selection && selection.routeId === activeId ? selection.direction : activeDirection;
  const entries = routes.map((item, index) => ({ item, color: PREVIEW_ROUTE_COLORS[index % PREVIEW_ROUTE_COLORS.length] }));
  const shown = entries.filter(entry => entry.item.direction === direction);
  const detail = route?.direction === direction ? route : undefined;

  return <div className="saved-plan-routes-panel">
    <div className="saved-plan-direction-tabs"><PlanningTabs label="Chiều tuyến" value={direction} tabs={[
      { value: 'TO_SCHOOL', label: `Chiều đi (${routes.filter(item => item.direction === 'TO_SCHOOL').length})` },
      { value: 'TO_PARKING', label: `Chiều về (${routes.filter(item => item.direction === 'TO_PARKING').length})` },
    ]} onChange={value => {
      setSelection({ routeId: activeId, direction: value });
      const first = routes.find(item => item.direction === value);
      if (first && first.id !== activeId) onChoose(first.id);
    }} /></div>
    <div className="saved-plan-direction-panel" role="tabpanel" id={`planning-panel-${direction}`} aria-labelledby={`planning-tab-${direction}`} tabIndex={0}>
      {!shown.length ? <p className="route-workspace-empty">Không có tuyến ở chiều này.</p> : <>
        <section className="saved-plan-route-list" aria-label="Chọn tuyến xem thông tin" tabIndex={0}>
          {shown.map(({ item, color }) => <button key={item.id} type="button" aria-pressed={activeId === item.id} onClick={() => onChoose(item.id)}>
            <i style={{ backgroundColor: color }} aria-hidden="true" />
            <span><strong>{item.name}</strong>
              <span className="saved-plan-route-vehicle"><BusFront size={14} aria-hidden="true" />{item.proposedVehiclePlate || 'Chưa có xe'} · {item.studentCount}{item.proposedVehicleSeats ? `/${item.proposedVehicleSeats} chỗ` : ' học sinh'}</span>
              <small>{(item.totalDistanceMeters / 1000).toFixed(1)} km · ~{Math.round(item.estimatedDurationSeconds / 60)} phút</small>
              <span className="saved-plan-route-schedule">{groupRouteSchedule({ derivedWeeklySchedule: item.derivedWeeklySchedule, departureTime: item.departureTime ?? '—', arrivalTime: item.arrivalTime ?? '—' }).map(group => <span key={`${group.departureTime}-${group.arrivalTime}`}>
                {group.days.length > 0 && <b>{group.days.join(', ')}</b>}<time>{group.departureTime} – {group.arrivalTime}</time>
              </span>)}</span>
            </span>
          </button>)}
        </section>
        <section className="saved-plan-stops-section" aria-label="Điểm dừng của tuyến đang xem">
          <div className="saved-plan-stops-heading"><h2>Điểm dừng · Giờ dự kiến</h2>
            {detail && <ContextLink href={`/admin/routes/${detail.id}`}>Chi tiết tuyến ↗</ContextLink>}
          </div>
          {detail && <p className="saved-plan-active-route">{detail.name}</p>}
          {detail?.stops?.length ? <ol className="saved-plan-stops" tabIndex={0} aria-label={`Điểm dừng của ${detail.name}`}>
            {detail.stops.map(stop => <li key={stop.id}><button type="button" onClick={() => onFocus({ latitude: stop.latitude, longitude: stop.longitude, zoom: 16 })}>
              <span className="saved-plan-stop-number">{stop.stopOrder}</span>
              <span><strong>{stop.studentName || (stop.stopType.includes('PARKING') ? 'Bãi xe' : schoolName || 'Trường học')}</strong><small>{stop.addressText}</small></span>
              <time>{stop.plannedArrivalTime}</time>
            </button></li>)}
          </ol> : <p className="route-workspace-empty">{routeError ? 'Chưa tải được điểm dừng.' : loading ? 'Đang tải điểm dừng…' : 'Không có điểm dừng.'}</p>}
        </section>
      </>}
    </div>
  </div>;
}
