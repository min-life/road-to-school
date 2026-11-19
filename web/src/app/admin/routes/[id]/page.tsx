'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { BackLink } from '@/components/admin/common/context-navigation';
import { CancelRoutePlanModal } from '@/components/admin/routes/cancel-route-plan-modal';
import { PREVIEW_ROUTE_COLORS } from '@/components/admin/routes/preview-route-selector';
import { getRouteDisplayName, getRouteStopKind, getRouteStopLabel } from '@/components/admin/routes/route-display';
import { RouteMap, type MapPoint } from '@/components/admin/routes/route-map';
import { RoutePlanningWorkspace } from '@/components/admin/routes/route-planning-workspace';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { getRoutePlanStatusLabel } from '@/lib/route-plan-status';
import { effectivePlanStatus } from '@/lib/school-lifecycle';
import type { RouteItem, RouteStopDetail } from '@/lib/types';
import './route-detail.css';

export default function RouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <RouteDetail key={id} routeId={id} />;
}

function RouteDetail({ routeId }: { routeId: string }) {
  const { user } = useAuth();
  const [route, setRoute] = useState<RouteItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'panel' | 'map'>('panel');
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [focusPoint, setFocusPoint] = useState<{ latitude: number; longitude: number; zoom: number } | null>(null);
  const selectedStopButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let current = true;
    async function loadRoute() {
      try {
        const detail = await apiClient.getRouteDetail(routeId);
        if (!current) return;
        const parent = detail.routePlanId ? await apiClient.getRoutePlanDetail(detail.routePlanId) : null;
        if (current) setRoute(parent ? { ...detail, planStatus: effectivePlanStatus(parent) } : detail);
      } catch (reason) {
        if (current) setError(reason instanceof Error ? reason.message : 'Không thể tải thông tin tuyến.');
      }
    }
    void loadRoute();
    return () => { current = false; };
  }, [routeId, revision]);

  useEffect(() => {
    const button = selectedStopButton.current;
    if (button?.getClientRects().length) button.scrollIntoView({ block: 'nearest' });
  }, [selectedStopId, mobileView]);

  const stops = useMemo(() => [...(route?.stops ?? [])].sort((first, second) => first.stopOrder - second.stopOrder), [route?.stops]);
  const schoolName = route?.schoolName || route?.schoolLocation?.name;
  const points = useMemo(() => stops
    .filter(stop => Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude))
    .map((stop): MapPoint => ({
      id: stop.id,
      latitude: stop.latitude,
      longitude: stop.longitude,
      title: getRouteStopLabel(stop, schoolName),
      subtitle: stop.addressText,
      type: getRouteStopKind(stop),
      order: stop.stopOrder,
      eta: stop.plannedArrivalTime,
      isSelected: true,
    })), [stops, schoolName]);

  const routeLabel = route ? getRouteDisplayName(route) : '';
  const isOutbound = route?.direction === 'TO_SCHOOL';
  const routeColor = PREVIEW_ROUTE_COLORS[isOutbound ? 0 : 1];
  const mapRoutes = useMemo(() => route ? [{
    id: route.id, polylineGeometry: route.polylineGeometry, color: routeColor, active: true,
  }] : [], [route, routeColor]);

  const reload = () => {
    setError(null);
    setRoute(null);
    setSelectedStopId(null);
    setFocusPoint(null);
    setRevision(value => value + 1);
  };

  if (error) return (
    <div className="route-detail-page">
      <BackLink fallback="/admin/routes" />
      <div className="route-detail-message" role="alert">
        <p>{error}</p>
        <Button type="button" variant="outline" size="sm" onClick={reload}>Thử lại</Button>
      </div>
    </div>
  );
  if (!route) return <p className="route-detail-message" role="status">Đang tải chi tiết tuyến…</p>;

  const planStatus = route.planStatus ?? route.status;
  const planUrl = route.routePlanId ? `/admin/routes/plans/${route.routePlanId}` : '/admin/routes';
  const canCancel = !!route.routePlanId && user?.role === 'SYSTEM_ADMIN' && planStatus === 'DRAFT';
  const destination = schoolName || 'Trường học';
  const routeEndpoints = isOutbound ? `Bãi xe trung tâm → ${destination}` : `${destination} → Bãi xe trung tâm`;
  const distance = (route.totalDistanceMeters / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  const minutes = Math.round(route.estimatedDurationSeconds / 60);
  const vehicleLabel = route.proposedVehiclePlate && planStatus === 'ACTIVE' ? 'Xe đã phân công'
    : route.proposedVehiclePlate && planStatus === 'DRAFT' ? 'Xe đề xuất' : 'Phương tiện';

  function selectStop(stop: RouteStopDetail) {
    const selected = selectedStopId !== stop.id;
    setSelectedStopId(selected ? stop.id : null);
    setFocusPoint(selected && Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude)
      ? { latitude: stop.latitude, longitude: stop.longitude, zoom: 16 } : null);
  }

  return (
    <div className="route-detail-page">
      <BackLink fallback={planUrl} className="route-detail-back" />
      <header className="route-detail-heading">
        <div>
          <h1>{routeLabel}</h1>
          <p>{routeEndpoints}</p>
        </div>
        <div className="route-detail-statuses">
          <span className="route-detail-read-only">Chỉ xem</span>
          <span className="route-detail-plan-status" data-status={planStatus}>Phương án · {getRoutePlanStatusLabel(planStatus)}</span>
          {canCancel && (
            <Button type="button" variant="outline" size="sm" className="route-detail-cancel" onClick={() => setCancelOpen(true)}>
              Hủy phương án
            </Button>
          )}
        </div>
      </header>

      <dl className="route-detail-summary">
        <div>
          <dt>Giờ dự kiến</dt>
          <dd>{route.departureTime || '—'} – {route.arrivalTime || '—'}</dd>
        </div>
        <div>
          <dt>Quãng đường và thời lượng</dt>
          <dd>{distance} km <span>· {minutes ? `khoảng ${minutes} phút` : route.estimatedDurationSeconds > 0 ? 'dưới 1 phút' : '0 phút'}</span></dd>
        </div>
        <div>
          <dt>{vehicleLabel}</dt>
          <dd>{route.proposedVehiclePlate || 'Chưa gán xe'}{route.proposedVehiclePlate && route.proposedVehicleBrand && <span> · {route.proposedVehicleBrand}</span>}</dd>
        </div>
        <div>
          <dt>Học sinh trên tuyến</dt>
          <dd>{route.studentCount} học sinh</dd>
        </div>
      </dl>

      <RoutePlanningWorkspace
        preview
        panelLabel="Điểm dừng"
        mobileView={mobileView}
        onMobileViewChange={setMobileView}
        map={
          <section className="route-detail-map" aria-label="Bản đồ tuyến">
            <h2>Bản đồ tuyến</h2>
            <RouteMap
              height="100%"
              schoolLocation={points.some(point => point.type === 'SCHOOL') ? undefined : route.schoolLocation}
              parkingLocation={points.some(point => point.type === 'DEPOT') ? undefined : route.parkingLocation}
              points={points}
              routes={mapRoutes}
              routeLegend={[{ label: routeLabel, color: routeColor }]}
              focusPoint={focusPoint}
              selectedPointId={selectedStopId}
              viewportKey={mobileView === 'map' && !focusPoint ? 'map' : undefined}
              onPointClick={point => setSelectedStopId(point.id)}
            />
          </section>
        }
        panel={
          <section className="route-detail-stops" aria-labelledby="route-detail-stops-heading">
            <header>
              <h2 id="route-detail-stops-heading">Điểm dừng ({stops.length})</h2>
              {stops.length > 0 && <span>Giờ dự kiến</span>}
            </header>
            {stops.length > 0 ? (
              <ol className="route-detail-stop-list" aria-label="Thứ tự điểm dừng">
                {stops.map(stop => {
                  const selected = selectedStopId === stop.id;
                  return (
                    <li key={stop.id}>
                      <button type="button" data-kind={getRouteStopKind(stop)}
                        aria-expanded={selected} ref={selected ? selectedStopButton : undefined} onClick={() => selectStop(stop)}>
                        <span className="route-detail-stop-number">{stop.stopOrder}</span>
                        <span className="route-detail-stop-name">
                          <strong>{getRouteStopLabel(stop, schoolName)}</strong>
                          {selected && <small>{stop.addressText || 'Chưa có địa chỉ'}</small>}
                        </span>
                        <time>{stop.plannedArrivalTime || '—'}</time>
                      </button>
                    </li>
                  );
                })}
              </ol>
            ) : <p className="route-detail-message">Chưa có điểm dừng.</p>}
          </section>
        }
      />

      {canCancel && cancelOpen && (
        <CancelRoutePlanModal
          isOpen={cancelOpen}
          routePlanId={route.routePlanId}
          routePlanName={route.routePlanName}
          onClose={() => setCancelOpen(false)}
          onSuccess={reload}
        />
      )}
    </div>
  );
}
