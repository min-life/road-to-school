'use client';

import { useState } from 'react';
import { BusFront } from 'lucide-react';
import type { RouteDirection, RouteItem, RouteStopDetail } from '@/lib/types';
import { ContextLink } from '@/components/admin/common/context-navigation';
import { PlanningTabs } from '@/components/admin/routes/route-planning-workspace';
import { groupRouteSchedule, PREVIEW_ROUTE_COLORS } from '@/components/admin/routes/preview-route-selector';
import { getRouteDisplayName, getRouteStopLabel } from '@/components/admin/routes/route-display';

export function SavedPlanRoutesPanel({ routes, activeId, route, schoolName, routeError, loading, selectedStopId, onChoose, onSelectStop }: {
  routes: RouteItem[]; activeId?: string; route?: RouteItem; schoolName?: string;
  routeError?: string; loading: boolean; selectedStopId?: string; onChoose: (id: string) => void;
  onSelectStop: (stop: RouteStopDetail) => void;
}) {
  const [selection, setSelection] = useState<{ routeId?: string; direction: RouteDirection } | null>(null);
  const activeDirection = routes.find(item => item.id === activeId)?.direction ?? 'TO_SCHOOL';
  const direction = selection && selection.routeId === activeId ? selection.direction : activeDirection;
  const entries = routes.map((item, index) => ({ item, color: PREVIEW_ROUTE_COLORS[index % PREVIEW_ROUTE_COLORS.length] }));
  const shown = entries.filter(entry => entry.item.direction === direction);
  const detail = route?.id === activeId && route?.direction === direction ? route : undefined;
  const stops = detail?.stops ?? [];

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
          {shown.map(({ item, color }) => {
            const selected = item.id === activeId;
            const schedule = groupRouteSchedule({ derivedWeeklySchedule: item.derivedWeeklySchedule, departureTime: item.departureTime ?? '—', arrivalTime: item.arrivalTime ?? '—' });
            const singleSchedule = schedule.length === 1 ? schedule[0] : undefined;
            return <div key={item.id} className="saved-plan-route-card" data-selected={selected} style={{ borderInlineStartColor: color }}>
              <button type="button" aria-pressed={selected} onClick={() => onChoose(item.id)}>
                <span className="saved-plan-route-card-title">
                  <strong>{getRouteDisplayName(item, routes)}</strong>
                  {singleSchedule && <time>{singleSchedule.departureTime} – {singleSchedule.arrivalTime}</time>}
                </span>
                <span className="saved-plan-route-vehicle">
                  <BusFront size={14} aria-hidden="true" />{item.proposedVehiclePlate || 'Chưa có xe'} · {item.studentCount}{item.proposedVehicleSeats ? `/${item.proposedVehicleSeats} chỗ` : ' học sinh'} · {(item.totalDistanceMeters / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km · {Math.round(item.estimatedDurationSeconds / 60)} phút
                </span>
                <span className="saved-plan-route-schedule">
                  {schedule.map(group => <span key={`${group.departureTime}-${group.arrivalTime}`}>
                    {group.days.length > 0 && <b>{group.days.join(', ')}</b>}
                    {!singleSchedule && <time>{group.departureTime} – {group.arrivalTime}</time>}
                  </span>)}
                </span>
              </button>
              {selected && <ContextLink className="saved-plan-route-detail" href={`/admin/routes/${item.id}`}>Xem chi tiết tuyến →</ContextLink>}
            </div>;
          })}
        </section>
        <section className="saved-plan-stops-section" aria-label="Điểm dừng của tuyến đang xem">
          <div className="saved-plan-stops-heading">
            <h2>Điểm dừng{stops.length > 0 ? ` (${stops.length})` : ''}</h2>
            <span>Giờ dự kiến</span>
          </div>
          {detail && stops.length > 0 ? <ol className="saved-plan-stops" tabIndex={0} aria-label={`Điểm dừng của ${getRouteDisplayName(detail, routes)}`}>
            {stops.map(stop => <li key={stop.id}><button type="button" aria-expanded={stop.id === selectedStopId} onClick={() => onSelectStop(stop)}>
              <span className="saved-plan-stop-number">{stop.stopOrder}</span>
              <span><strong>{getRouteStopLabel(stop, schoolName)}</strong>{stop.id === selectedStopId && stop.addressText && <small>{stop.addressText}</small>}</span>
              <time>{stop.plannedArrivalTime || '—'}</time>
            </button></li>)}
          </ol> : <p className="route-workspace-empty">{routeError ? 'Chưa tải được điểm dừng.' : loading ? 'Đang tải điểm dừng…' : 'Không có điểm dừng.'}</p>}
        </section>
      </>}
    </div>
  </div>;
}
