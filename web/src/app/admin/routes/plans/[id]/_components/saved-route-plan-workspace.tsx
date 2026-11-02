'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getRoutePlanStatusLabel } from '@/lib/status-labels';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import type { Role, RouteItem, RoutePlanItem } from '@/lib/types';
import { BackLink, ContextLink } from '@/components/admin/common/context-navigation';
import { Button } from '@/components/ui/button';
import { AlertIcon, CheckIcon } from '@/components/icons';
import { RouteMap, type MapPoint } from '@/components/admin/routes/route-map';
import { RoutePlanningWorkspace, PlanningTabs } from '@/components/admin/routes/route-planning-workspace';
import { RoutePlanAssignments } from './route-plan-assignments';
import { CancelRoutePlanModal } from '@/components/admin/routes/cancel-route-plan-modal';
import { getAssignmentProgress, resolveSavedRoutePlanTab } from '@/components/admin/routes/route-plan-assignment-state';
import { RouteMapVisibilityControl } from './route-map-visibility-control';
import { PREVIEW_ROUTE_COLORS } from '@/components/admin/routes/preview-route-selector';
import './saved-route-plan-workspace.css';


/** System-admin presentation only. School admins keep their existing detail page. */
export function SavedRoutePlanWorkspace({ planId, role }: { planId: string; role: Role | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams();
  const requestedTab = query.get('tab');
  const selectedId = query.get('routeId');
  const [plan, setPlan] = useState<RoutePlanItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [route, setRoute] = useState<RouteItem | null>(null);
  const [routeError, setRouteError] = useState<{ id: string; message: string } | null>(null);
  const [routeRevision, setRouteRevision] = useState(0);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ latitude: number; longitude: number; zoom: number } | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [assignmentFocusRequest, setAssignmentFocusRequest] = useState(0);
  const handledAssignmentFocus = useRef(0);
  const [hiddenRouteIds, setHiddenRouteIds] = useState<Set<string>>(new Set());

  const updateQuery = (values: Record<string, string>) => {
    const next = new URLSearchParams(query.toString());
    Object.entries(values).forEach(([key, value]) => next.set(key, value));
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  useEffect(() => {
    let current = true;
    if (role !== 'SYSTEM_ADMIN') return;
    apiClient.getRoutePlanDetail(planId).then(value => {
      if (!current) return;
      setPlan(value);
      setError(null);
    }).catch((reason: unknown) => {
      if (current) setError(reason instanceof Error ? reason.message : 'Không thể tải phương án.');
    });
    return () => { current = false; };
  }, [planId, role, revision]);

  const routes = useMemo(() => plan?.routes ?? [], [plan?.routes]);
  const mapOptions = useMemo(() => routes.map((item, index) => ({
    id: item.id, name: item.name, direction: item.direction, vehiclePlate: item.proposedVehiclePlate,
    color: PREVIEW_ROUTE_COLORS[index % PREVIEW_ROUTE_COLORS.length],
  })), [routes]);
  const { editable: assignmentEditable, actionableSystemPendingGroupCount } = getAssignmentProgress(routes, plan?.status);
  const tab = resolveSavedRoutePlanTab(requestedTab, actionableSystemPendingGroupCount);
  const activeRoute = routes.find(item => item.id === selectedId) ?? routes[0];
  const activeId = activeRoute?.id;
  const mapRoutes = useMemo(() => routes.flatMap((item, index) => hiddenRouteIds.has(item.id) ? [] : [{
    id: item.id, polylineGeometry: item.polylineGeometry,
    color: PREVIEW_ROUTE_COLORS[index % PREVIEW_ROUTE_COLORS.length], active: item.id === activeId,
  }]), [routes, hiddenRouteIds, activeId]);
  useEffect(() => {
    let current = true;
    if (!activeId) return;
    apiClient.getRouteDetail(activeId).then(value => {
      if (current) { setRoute(value); setRouteError(null); }
    }).catch((reason: unknown) => {
      if (current) setRouteError({ id: activeId, message: reason instanceof Error ? reason.message : 'Không thể tải tuyến.' });
    });
    return () => { current = false; };
  }, [activeId, revision, routeRevision]);

  useEffect(() => {
    if (!plan || requestedTab === 'routes' || requestedTab === 'assignments') return;
    const next = new URLSearchParams(query.toString());
    next.set('tab', actionableSystemPendingGroupCount > 0 ? 'assignments' : 'routes');
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [actionableSystemPendingGroupCount, pathname, plan, query, requestedTab, router]);

  const visibleRoute = route?.id === activeId ? route : activeRoute;
  const activeColor = mapOptions.find(item => item.id === activeId)?.color;
  const points: MapPoint[] = (activeId && !hiddenRouteIds.has(activeId) ? visibleRoute?.stops ?? [] : [])
    .filter(stop => stop.stopType === 'PICKUP' || stop.stopType === 'DROPOFF')
    .map(stop => ({ id: stop.id, latitude: stop.latitude, longitude: stop.longitude,
      title: stop.studentName || 'Điểm đón/trả', subtitle: stop.addressText,
      type: 'STUDENT', order: stop.stopOrder, isSelected: true, color: activeColor }));
  const editable = assignmentEditable;
  const chooseRoute = (id: string) => { setFocusPoint(null); updateQuery({ routeId: id }); };
  const openPendingAssignments = () => {
    // Use the workspace's own panel switch so this action also works on mobile.
    pageRef.current?.querySelector<HTMLButtonElement>('.route-workspace-mobile-switch button')?.click();
    const firstPendingRoute = routes.find(item => !item.proposedVehicleId || !item.defaultDriverId);
    setFocusPoint(null);
    updateQuery({ tab: 'assignments', ...(firstPendingRoute ? { routeId: firstPendingRoute.id } : {}) });
    setAssignmentFocusRequest(value => value + 1);
  };

  useEffect(() => {
    if (tab !== 'assignments' || assignmentFocusRequest <= handledAssignmentFocus.current) return;
    const frame = requestAnimationFrame(() => {
      const group = panelRef.current?.querySelector<HTMLElement>('[data-system-pending="true"]');
      if (!group) return;
      handledAssignmentFocus.current = assignmentFocusRequest;
      group.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      const action = group.querySelector<HTMLButtonElement>('[data-assignment-action="DRIVER"]')
        ?? group.querySelector<HTMLButtonElement>('[data-assignment-action="VEHICLE"]');
      (action ?? group).focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [tab, assignmentFocusRequest]);

  if (!plan || error) return <div className="route-planning-page saved-plan-page">
    <BackLink fallback="/admin/routes" />
    {error ? <div className="saved-plan-error" role="alert">{error}<Button variant="outline" onClick={() => setRevision(value => value + 1)}>Thử lại</Button></div>
      : <p role="status">Đang tải phương án…</p>}
  </div>;

  return <div ref={pageRef} className="route-planning-page saved-plan-page">
    <BackLink fallback="/admin/routes" />
    <header className="saved-plan-heading">
      <div className="saved-plan-heading-title"><h1>{plan.name}</h1><p>{plan.schoolName} · {routes.length} tuyến · {plan.totalStudents} học sinh</p></div>
      <div className="saved-plan-heading-actions">
      <span className="saved-plan-status" data-status={plan.status}>{getRoutePlanStatusLabel(plan.status)}</span>
      {editable && routes.length > 0 && <span className="saved-plan-assignment-progress" data-pending={actionableSystemPendingGroupCount > 0} role="status" aria-atomic="true">
        {actionableSystemPendingGroupCount > 0 ? <><AlertIcon className="w-4 h-4" aria-hidden="true" />Còn {actionableSystemPendingGroupCount} nhóm xe chưa đủ</>
          : <><CheckIcon className="w-4 h-4" aria-hidden="true" />Nhà xe đã phân công đủ</>}
      </span>}
      {actionableSystemPendingGroupCount > 0 && <Button type="button" variant="primary" size="sm" onClick={openPendingAssignments}>
        Phân công <span aria-hidden="true">→</span>
      </Button>}
      {editable && <Button className="saved-plan-cancel-button" variant="danger" size="sm" onClick={() => setCancelOpen(true)}>
        <AlertIcon className="w-4 h-4" aria-hidden="true" />
        Hủy phương án
      </Button>}
      </div>
    </header>
    {plan.status === 'CANCELLED' && <p className="saved-plan-notice">Phương án đã hủy{plan.cancellationReason ? `: ${plan.cancellationReason}` : '.'}</p>}
    {plan.status === 'EXPIRED' && <p className="saved-plan-notice">Phương án hết hạn hợp đồng. Thông tin được giữ để tra cứu.</p>}
    <RoutePlanningWorkspace preview panelLabel={tab === 'assignments' ? `Phân công${actionableSystemPendingGroupCount ? ` (${actionableSystemPendingGroupCount})` : ''}` : 'Tuyến'}
      map={routes.length ? <>
        <RouteMap schoolLocation={visibleRoute?.schoolLocation} parkingLocation={visibleRoute?.parkingLocation}
          points={points} routes={mapRoutes} focusPoint={focusPoint} height="100%" />
        <RouteMapVisibilityControl routes={mapOptions} hiddenIds={hiddenRouteIds}
          onToggle={id => setHiddenRouteIds(previous => {
            const next = new Set(previous);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
          })}
          onShowAll={() => setHiddenRouteIds(new Set())}
          onHideAll={() => setHiddenRouteIds(new Set(routes.map(item => item.id)))} />
        {routeError?.id === activeId && <div className="saved-plan-map-error" role="alert">{routeError?.message}
          <Button variant="outline" size="sm" onClick={() => setRouteRevision(value => value + 1)}>Thử lại</Button></div>}
      </> : <p className="route-workspace-empty">Phương án chưa có tuyến để hiển thị.</p>}
      panel={<>
        <PlanningTabs tabs={[{ value: 'routes', label: 'Tuyến' }, { value: 'assignments', label: `Phân công${actionableSystemPendingGroupCount ? ` (${actionableSystemPendingGroupCount})` : ''}` }]}
          value={tab} onChange={value => updateQuery({ tab: value })} />
        <div ref={panelRef} className="route-workspace-content" role="tabpanel" id={`planning-panel-${tab}`} aria-labelledby={`planning-tab-${tab}`}>
          {tab === 'assignments' ? <>
            <RoutePlanAssignments plan={plan} currentUserRole={editable ? role : null} compact
              onUpdated={() => setRevision(value => value + 1)} />
          </> : <>
            <section className="saved-plan-route-list" aria-label="Chọn tuyến xem thông tin">
              {mapOptions.map(item => <button key={item.id} type="button" aria-pressed={activeId === item.id} onClick={() => chooseRoute(item.id)}>
                <i style={{ backgroundColor: item.color }} aria-hidden="true" />
                <span><strong>{item.name}</strong><small>{item.direction === 'TO_SCHOOL' ? 'Chiều đi' : 'Chiều về'}{item.vehiclePlate ? ` · Xe ${item.vehiclePlate}` : ''}</small></span>
              </button>)}
            </section>
            {visibleRoute && <section className="saved-plan-route-info">
              <strong>{visibleRoute.name}</strong>
              <p>{visibleRoute.studentCount} học sinh · {(visibleRoute.totalDistanceMeters / 1000).toFixed(1)} km · {Math.round(visibleRoute.estimatedDurationSeconds / 60)} phút</p>
              <ContextLink href={`/admin/routes/${visibleRoute.id}`}>Xem thông tin tuyến</ContextLink>
            </section>}
            <h2 className="saved-plan-stops-title">Điểm dừng · Giờ dự kiến</h2>
            {visibleRoute?.stops?.length ? <ol className="saved-plan-stops">
              {visibleRoute.stops.map(stop => <li key={stop.id}><button type="button" onClick={() => setFocusPoint({ latitude: stop.latitude, longitude: stop.longitude, zoom: 16 })}>
                <span className="saved-plan-stop-number">{stop.stopOrder}</span>
                <span><strong>{stop.studentName || (stop.stopType.includes('PARKING') ? 'Bãi xe' : plan.schoolName || 'Trường học')}</strong><small>{stop.addressText}</small></span>
                <time>{stop.plannedArrivalTime}</time>
              </button></li>)}
            </ol> : <p className="route-workspace-empty">{routeError?.id === activeId ? 'Chưa tải được điểm dừng.' : route?.id !== activeId && activeId ? 'Đang tải điểm dừng…' : 'Không có điểm dừng.'}</p>}
            {!!plan.unassignedStudents?.length && <details className="saved-plan-readiness"><summary>Học sinh chưa được xếp ({plan.unassignedStudents.length})</summary><ul>
              {plan.unassignedStudents.map(student => <li key={student.id}>{student.fullName} — {student.reason || 'Chưa được xếp tuyến'}</li>)}
            </ul></details>}
            <details className="saved-plan-readiness"><summary>Thông tin phương án</summary>
              <p>Tạo lúc: {new Date(plan.createdAt).toLocaleString('vi-VN')}</p>
              {plan.activatedAt && <p>Duyệt lúc: {new Date(plan.activatedAt).toLocaleString('vi-VN')}{plan.approvedByName ? ` · ${plan.approvedByName}` : ''}</p>}
              {plan.cancelledAt && <p>Hủy lúc: {new Date(plan.cancelledAt).toLocaleString('vi-VN')}</p>}
              <p>Mã phương án: {plan.id}</p>
            </details>
          </>}
        </div>
      </>}
    />
    <CancelRoutePlanModal isOpen={cancelOpen} routePlanId={plan.id} routePlanName={plan.name}
      onClose={() => setCancelOpen(false)} onSuccess={() => { setCancelOpen(false); setRevision(value => value + 1); }} />
  </div>;
}
