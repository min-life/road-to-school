'use client';
import { RoutePlanCancellationReason } from './route-plan-cancellation-reason';
import { RoutePlanReoptimization } from '@/components/admin/routes/route-plan-reoptimization';
import { effectivePlanStatus, lifecycleReason } from '@/lib/school-lifecycle';
import { getRoutePlanStatusLabel } from '@/lib/route-plan-status';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import type { ApprovalReadinessResponse, Role, RouteItem, RoutePlanItem, RouteStopDetail } from '@/lib/types';
import { BackLink } from '@/components/admin/common/context-navigation';
import { LifecycleDialog } from '@/components/admin/common/lifecycle-dialog';
import { Button } from '@/components/ui/button';
import { AlertIcon } from '@/components/icons';
import { RouteMap, type MapPoint } from '@/components/admin/routes/route-map';
import { RoutePlanningWorkspace, PlanningTabs } from '@/components/admin/routes/route-planning-workspace';
import { SavedPlanRoutesPanel } from './saved-plan-routes-panel';
import { getRouteDisplayName, getRouteStopKind, getRouteStopLabel } from '@/components/admin/routes/route-display';
import { RoutePlanAssignments } from './route-plan-assignments';
import { CancelRoutePlanModal } from '@/components/admin/routes/cancel-route-plan-modal';
import { getAssignmentProgress, resolveSavedRoutePlanTab } from '@/components/admin/routes/route-plan-assignment-state';
import { SchoolRoutePlanApproval } from '@/components/admin/routes/school-route-plan-approval';
import { RouteMapVisibilityControl } from '@/components/admin/routes/route-map-visibility-control';
import { PREVIEW_ROUTE_COLORS } from '@/components/admin/routes/preview-route-selector';
import { decodePolyline } from '@/lib/polyline';
import './system-route-plan-workspace.css';
import './saved-route-plan-workspace.css';

type SavedRoutePlanWorkspaceProps = { planId: string; role: Role | null; schoolId?: string | null };

export function SavedRoutePlanWorkspace({ planId, role, schoolId }: SavedRoutePlanWorkspaceProps) {
  const isSchoolAdmin = role === 'SCHOOL_ADMIN';
  const allowed = role === 'SYSTEM_ADMIN' || isSchoolAdmin;
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

  // Approval readiness state for School Admin
  const [readinessResult, setReadinessResult] = useState<{ planId: string; revision: number; value: ApprovalReadinessResponse } | null>(null);
  const [readinessFailure, setReadinessFailure] = useState<number | null>(null);
  const readiness = readinessResult?.planId === planId && readinessResult.revision === revision ? readinessResult.value : null;
  const readinessError = readinessFailure === revision;

  const [cancelOpen, setCancelOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ latitude: number; longitude: number; zoom: number } | null>(null);
  const [focusCoordinates, setFocusCoordinates] = useState<[number, number][] | null>(null);
  const [selectedStop, setSelectedStop] = useState<{ routeId: string; stopId: string } | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [assignmentFocusRequest, setAssignmentFocusRequest] = useState(0);
  const handledAssignmentFocus = useRef(0);
  const [hiddenRouteIds, setHiddenRouteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!menuOpen) return;
    const handleDown = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key === 'Escape') {
        setMenuOpen(false);
      } else if (e instanceof MouseEvent && !(e.target as HTMLElement).closest('#saved-plan-actions-menu')) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleDown);
    window.addEventListener('mousedown', handleDown);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('mousedown', handleDown);
    };
  }, [menuOpen]);

  const updateQuery = (values: Record<string, string>) => {
    const next = new URLSearchParams(query.toString());
    Object.entries(values).forEach(([key, value]) => next.set(key, value));
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  useEffect(() => {
    let current = true;
    if (!allowed) return;
    apiClient.getRoutePlanDetail(planId).then(value => {
      if (!current) return;
      if (isSchoolAdmin && value.schoolId !== schoolId) {
        throw new Error('Bạn không có quyền xem phương án của trường khác.');
      }
      setPlan(value);
      setError(null);
    }).catch((reason: unknown) => {
      if (current) {
        setPlan(null);
        setRoute(null);
        setError(reason instanceof Error ? reason.message : 'Không thể tải phương án.');
      }
    });
    return () => { current = false; };
  }, [planId, allowed, isSchoolAdmin, schoolId, revision]);

  const planEffectiveStatus = plan ? effectivePlanStatus(plan) : undefined;
  useEffect(() => {
    let current = true;
    if (!allowed || plan?.id !== planId || planEffectiveStatus !== 'DRAFT') return;
    apiClient.getApprovalReadiness(planId).then(value => {
      if (current) { setReadinessResult({ planId, revision, value }); setReadinessFailure(null); }
    }).catch(() => { if (current) setReadinessFailure(revision); });
    return () => { current = false; };
  }, [planId, allowed, plan?.id, planEffectiveStatus, revision]);

  const routes = useMemo(() => plan?.routes ?? [], [plan?.routes]);
  const mapOptions = useMemo(() => routes.map((item, index) => ({
    id: item.id, name: getRouteDisplayName(item, routes), direction: item.direction, vehiclePlate: item.proposedVehiclePlate,
    color: PREVIEW_ROUTE_COLORS[index % PREVIEW_ROUTE_COLORS.length],
  })), [routes]);

  const { editable: assignmentEditable, actionableSystemPendingGroupCount, schoolPendingGroupCount } = getAssignmentProgress(routes, planEffectiveStatus);

  // Số lượng nhóm chưa đủ theo vai trò
  const pendingCount = isSchoolAdmin
    ? (actionableSystemPendingGroupCount > 0 ? actionableSystemPendingGroupCount : schoolPendingGroupCount)
    : actionableSystemPendingGroupCount;

  // Groups metrics for 3-step assignment banner
  const groupsList = useMemo(() => {
    const list: { vehicleId: string | null; driverId: string | null; busAttendantId: string | null }[] = [];
    for (const r of routes) {
      const vId = r.proposedVehicleId || null;
      let g = list.find(item => item.vehicleId === vId);
      if (!g) {
        g = { vehicleId: vId, driverId: r.defaultDriverId || null, busAttendantId: r.defaultBusAttendantId || null };
        list.push(g);
      }
    }
    return list;
  }, [routes]);

  const totalGroups = groupsList.length;
  const systemReadyCount = groupsList.filter(g => g.vehicleId && g.driverId).length;
  const attendantReadyCount = groupsList.filter(g => g.busAttendantId).length;

  const systemStepReady = totalGroups > 0 && systemReadyCount === totalGroups;
  const attendantStepReady = totalGroups > 0 && attendantReadyCount === totalGroups;
  const planIsActive = planEffectiveStatus === 'ACTIVE';
  const approvalStepReady = planIsActive || Boolean(readiness?.isReadyForApproval);

  const tab = resolveSavedRoutePlanTab(requestedTab, pendingCount);
  const activeRoute = routes.find(item => item.id === selectedId) ?? routes[0];
  const activeId = activeRoute?.id;
  const selectedStopId = selectedStop?.routeId === activeId ? selectedStop?.stopId : undefined;
  const activeRouteVisible = !!activeId && !hiddenRouteIds.has(activeId);

  const mapRoutes = useMemo(() => routes.flatMap((item, index) => hiddenRouteIds.has(item.id) ? [] : [{
    id: item.id, polylineGeometry: item.polylineGeometry,
    color: PREVIEW_ROUTE_COLORS[index % PREVIEW_ROUTE_COLORS.length], active: item.id === activeId,
    opacity: tab === 'routes' && activeRouteVisible ? 0.35 : undefined,
  }]), [routes, hiddenRouteIds, activeId, activeRouteVisible, tab]);

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

  // Tự động chuyển sang tab "assignments" nếu chưa đủ phân công
  useEffect(() => {
    if (!plan || requestedTab === 'routes' || requestedTab === 'assignments') return;
    const next = new URLSearchParams(query.toString());
    next.set('tab', pendingCount > 0 ? 'assignments' : 'routes');
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [pendingCount, pathname, plan, query, requestedTab, router]);

  const visibleRoute = route?.id === activeId ? route : activeRoute;
  const activeMapOption = mapOptions.find(item => item.id === activeId);
  const points: MapPoint[] = (activeRouteVisible ? visibleRoute?.stops ?? [] : [])
    .filter(stop => Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude))
    .map(stop => ({
      id: stop.id,
      latitude: stop.latitude,
      longitude: stop.longitude,
      title: getRouteStopLabel(stop, plan?.schoolName),
      subtitle: stop.addressText,
      type: getRouteStopKind(stop),
      order: stop.stopOrder,
      eta: stop.plannedArrivalTime,
      isSelected: true,
      color: activeMapOption?.color,
    }));

  const editable = assignmentEditable;
  const canCancel = editable && (!isSchoolAdmin || planEffectiveStatus === 'ACTIVE');
  const chooseRoute = (id: string) => {
    if (id === activeId) return;
    setFocusPoint(null);
    setFocusCoordinates(null);
    setSelectedStop(null);
    updateQuery({ routeId: id });
  };

  const selectStop = (stop: RouteStopDetail) => {
    if (!activeId) return;
    if (selectedStopId === stop.id) {
      setSelectedStop(null);
      setFocusPoint(null);
      return;
    }
    setSelectedStop({ routeId: activeId, stopId: stop.id });
    if (activeRouteVisible && Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude)) {
      setFocusCoordinates(null);
      setFocusPoint({ latitude: stop.latitude, longitude: stop.longitude, zoom: 16 });
    }
  };

  const openPendingAssignments = () => {
    pageRef.current?.querySelector<HTMLButtonElement>('.route-workspace-mobile-switch button')?.click();
    const firstPendingRoute = routes.find(item => !item.proposedVehicleId || !item.defaultDriverId || (isSchoolAdmin && !item.defaultBusAttendantId));
    setFocusPoint(null);
    updateQuery({ tab: 'assignments', ...(firstPendingRoute ? { routeId: firstPendingRoute.id } : {}) });
    setAssignmentFocusRequest(value => value + 1);
  };

  useEffect(() => {
    if (tab !== 'assignments' || assignmentFocusRequest <= handledAssignmentFocus.current) return;
    const frame = requestAnimationFrame(() => {
      const group = panelRef.current?.querySelector<HTMLElement>(isSchoolAdmin ? '[data-school-pending="true"], [data-system-pending="true"]' : '[data-system-pending="true"]');
      if (!group) return;
      handledAssignmentFocus.current = assignmentFocusRequest;
      group.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      const action = group.querySelector<HTMLButtonElement>('[data-assignment-action="BUS_ATTENDANT"]')
        ?? group.querySelector<HTMLButtonElement>('[data-assignment-action="DRIVER"]')
        ?? group.querySelector<HTMLButtonElement>('[data-assignment-action="VEHICLE"]');
      (action ?? group).focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [tab, assignmentFocusRequest, isSchoolAdmin]);

  if (!allowed) return <p role="alert">Bạn không có quyền xem phương án tuyến.</p>;

  if (!plan || error) {
    return (
      <div className="route-planning-page saved-plan-page system-route-plan-workspace">
        <BackLink fallback="/admin/routes" />
        {error ? (
          <div className="saved-plan-error" role="alert">
            {error}
            <Button variant="outline" onClick={() => setRevision(value => value + 1)}>Thử lại</Button>
          </div>
        ) : (
          <p role="status">Đang tải phương án…</p>
        )}
      </div>
    );
  }

  const firstServiceDate = plan.firstServiceDate?.split('-').reverse().join('/');
  const schoolInTitle = plan.schoolName && plan.name.toLocaleLowerCase('vi').includes(plan.schoolName.toLocaleLowerCase('vi'));

  return (
    <div ref={pageRef} className="route-planning-page saved-plan-page system-route-plan-workspace">
      <BackLink fallback="/admin/routes" />
      <header className="saved-plan-heading">
        <div className="saved-plan-heading-title">
          <h1>{plan.name}</h1>
          <p className="saved-plan-summary">
            {plan.schoolName && !schoolInTitle && <span>{plan.schoolName}</span>}
            <span>{routes.length} tuyến · {plan.totalStudents} học sinh</span>
            {firstServiceDate && <span>Phục vụ từ <strong>{firstServiceDate}</strong></span>}
          </p>
        </div>
        <div className="saved-plan-heading-actions">
          <div className="saved-plan-heading-statuses">
            <span className="saved-plan-status" data-status={effectivePlanStatus(plan)}>
              {getRoutePlanStatusLabel(effectivePlanStatus(plan))}
            </span>
            {effectivePlanStatus(plan) === 'CANCELLED' && <RoutePlanCancellationReason reason={plan.cancellationReason} />}
            {tab !== 'assignments' && pendingCount > 0 && (
              <Button type="button" variant="primary" size="sm" onClick={openPendingAssignments}>
                Phân công <span aria-hidden="true">→</span>
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => setInfoOpen(true)}>
              Thông tin phương án
            </Button>
            {canCancel && (
              <div id="saved-plan-actions-menu" className="relative inline-block text-left">
                <button
                  type="button"
                  id="saved-plan-actions-menu-btn"
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                  aria-label="Thao tác khác"
                  className="inline-flex items-center justify-center w-9 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold shadow-2xs cursor-pointer"
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  •••
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-1 w-44 rounded-xl border border-slate-200 bg-white shadow-lg p-1 z-30 animate-in fade-in">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 cursor-pointer"
                      onClick={() => {
                        setMenuOpen(false);
                        setCancelOpen(true);
                      }}
                    >
                      <AlertIcon className="w-3.5 h-3.5" aria-hidden="true" />
                      Hủy phương án
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <RoutePlanReoptimization plan={plan} systemAdmin={!isSchoolAdmin} onUpdated={() => { setRoute(null); setRevision(value => value + 1); }} />
      {plan.effectiveStatusReason && <p className="saved-plan-notice" role="status">{lifecycleReason(plan.effectiveStatusReason)}. Phương án chỉ còn để tra cứu.</p>}
      {effectivePlanStatus(plan) === 'EXPIRED' && <p className="saved-plan-notice">Phương án hết hạn hợp đồng. Thông tin được giữ để tra cứu.</p>}

      {tab === 'assignments' && totalGroups > 0 && (
        <div className="saved-plan-step-banner" role="region" aria-label="Tiến độ phân công">
          <div className="step-banner-item">
            <div className="step-banner-header">
              <span className={`step-dot ${systemStepReady ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" />
              <h3>Xe và tài xế</h3>
            </div>
            <p className={`step-banner-desc ${systemStepReady ? 'success' : 'warning'}`}>
              {systemStepReady ? 'Đã đủ xe và tài xế' : `${systemReadyCount}/${totalGroups} nhóm đã đủ xe và tài xế`}
            </p>
          </div>
          <div className="step-banner-item">
            <div className="step-banner-header">
              <span className={`step-dot ${attendantStepReady ? 'bg-emerald-500' : actionableSystemPendingGroupCount > 0 ? 'bg-slate-400' : 'bg-amber-500'}`} aria-hidden="true" />
              <h3>Giáo viên phụ trách</h3>
            </div>
            <p className={`step-banner-desc ${attendantStepReady ? 'success' : actionableSystemPendingGroupCount > 0 ? 'neutral' : 'warning'}`}>
              {attendantStepReady
                ? 'Đã phân công đủ giáo viên'
                : actionableSystemPendingGroupCount > 0
                ? 'Chờ nhà trường phân công'
                : `${attendantReadyCount}/${totalGroups} nhóm đã có giáo viên`}
            </p>
          </div>
          <div className="step-banner-item">
            <div className="step-banner-header">
              <span className={`step-dot ${approvalStepReady ? 'bg-emerald-500' : 'bg-slate-400'}`} aria-hidden="true" />
              <h3>Duyệt phương án</h3>
            </div>
            <p className={`step-banner-desc ${approvalStepReady ? 'success' : 'neutral'}`}>
              {planIsActive
                ? 'Đã duyệt'
                : planEffectiveStatus === 'CANCELLED'
                ? 'Đã hủy'
                : planEffectiveStatus === 'EXPIRED'
                ? 'Đã hết hạn'
                : approvalStepReady
                ? 'Sẵn sàng duyệt'
                : 'Chờ đủ phân công'}
            </p>
          </div>
        </div>
      )}

      <RoutePlanningWorkspace
        preview
        panelLabel={tab === 'assignments' ? `Phân công${pendingCount ? ` (${pendingCount})` : ''}` : 'Tuyến'}
        footer={
          isSchoolAdmin && effectivePlanStatus(plan) === 'DRAFT' ? (
            <SchoolRoutePlanApproval
              plan={plan}
              readiness={readiness}
              failed={readinessError}
              onRefresh={() => setRevision(value => value + 1)}
              onApproved={updated => { setPlan(updated); setRevision(value => value + 1); }}
            />
          ) : undefined
        }
        map={routes.length ? (
          <>
            <RouteMap
              schoolLocation={points.some(point => point.type === 'SCHOOL') ? undefined : visibleRoute?.schoolLocation}
              parkingLocation={points.some(point => point.type === 'DEPOT') ? undefined : visibleRoute?.parkingLocation}
              points={points}
              routes={mapRoutes}
              focusPoint={focusPoint}
              focusCoordinates={focusCoordinates}
              selectedPointId={selectedStopId ?? null}
              onPointClick={(point) => {
                if (activeId) setSelectedStop({ routeId: activeId, stopId: point.id });
              }}
              routeLegend={activeRouteVisible && activeMapOption ? [{ label: activeMapOption.name, color: activeMapOption.color }] : undefined}
              height="100%"
            />
            <RouteMapVisibilityControl
              routes={mapOptions}
              hiddenIds={hiddenRouteIds}
              onToggle={id => setHiddenRouteIds(previous => {
                const next = new Set(previous);
                if (next.has(id)) next.delete(id); else next.add(id);
                return next;
              })}
              onShowAll={() => setHiddenRouteIds(new Set())}
              onHideAll={() => setHiddenRouteIds(new Set(routes.map(item => item.id)))}
            />
            {routeError?.id === activeId && (
              <div className="saved-plan-map-error" role="alert">
                {routeError?.message}
                <Button variant="outline" size="sm" onClick={() => setRouteRevision(value => value + 1)}>Thử lại</Button>
              </div>
            )}
          </>
        ) : (
          <p className="route-workspace-empty">Phương án chưa có tuyến để hiển thị.</p>
        )}
        panel={
          <>
            <PlanningTabs
              tabs={[
                { value: 'routes', label: `Tuyến (${routes.length})` },
                { value: 'assignments', label: `Phân công${pendingCount ? ` (${pendingCount})` : ''}` },
              ]}
              value={tab}
              onChange={value => updateQuery({ tab: value })}
            />
            <div
              ref={panelRef}
              className={`route-workspace-content${tab === 'routes' ? ' saved-plan-routes-content' : ''}`}
              role="tabpanel"
              id={`planning-panel-${tab}`}
              aria-labelledby={`planning-tab-${tab}`}
            >
              {tab === 'assignments' ? (
                <RoutePlanAssignments
                  plan={plan}
                  currentUserRole={editable ? role : null}
                  compact
                  hiddenRouteIds={hiddenRouteIds}
                  assignmentFocusRequest={assignmentFocusRequest}
                  onViewOnMap={(targetRoutes) => {
                    const coords: [number, number][] = [];
                    targetRoutes.forEach((r) => {
                      if (r.polylineGeometry) {
                        coords.push(...decodePolyline(r.polylineGeometry));
                      }
                      r.stops?.forEach((s) => {
                        if (s.latitude && s.longitude) coords.push([s.longitude, s.latitude]);
                      });
                    });
                    if (coords.length > 0) {
                      setFocusCoordinates([...coords]);
                    }
                    pageRef.current?.querySelector<HTMLButtonElement>('.route-workspace-mobile-switch button:last-child')?.click();
                  }}
                  onUpdated={() => setRevision(value => value + 1)}
                />
              ) : (
                <>
                  <SavedPlanRoutesPanel
                    routes={routes}
                    activeId={activeId}
                    route={visibleRoute}
                    schoolName={plan.schoolName}
                    routeError={routeError?.id === activeId ? routeError.message : undefined}
                    loading={route?.id !== activeId && Boolean(activeId)}
                    selectedStopId={selectedStopId}
                    onChoose={chooseRoute}
                    onSelectStop={selectStop}
                  />
                  {!!plan.unassignedStudents?.length && (
                    <details className="saved-plan-readiness">
                      <summary>Học sinh chưa được xếp ({plan.unassignedStudents.length})</summary>
                      <ul>
                        {plan.unassignedStudents.map(student => (
                          <li key={student.id}>{student.fullName} — {student.reason || 'Chưa được xếp tuyến'}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </>
              )}
            </div>
          </>
        }
      />
      <LifecycleDialog open={infoOpen} title="Thông tin phương án" onClose={() => setInfoOpen(false)}>
        <dl className="saved-plan-info-list">
          <div><dt>Tạo lúc</dt><dd>{new Date(plan.createdAt).toLocaleString('vi-VN')}</dd></div>
          {firstServiceDate && <div><dt>Ngày phục vụ đầu tiên</dt><dd>{firstServiceDate}</dd></div>}
          {plan.activatedAt && <div><dt>Duyệt lúc</dt><dd>{new Date(plan.activatedAt).toLocaleString('vi-VN')}</dd></div>}
          {plan.approvedByName && <div><dt>Người duyệt</dt><dd>{plan.approvedByName}</dd></div>}
          {plan.cancelledAt && <div><dt>Hủy lúc</dt><dd>{new Date(plan.cancelledAt).toLocaleString('vi-VN')}</dd></div>}
        </dl>
      </LifecycleDialog>
      {canCancel && (
        <CancelRoutePlanModal
          isOpen={cancelOpen}
          routePlanId={plan.id}
          routePlanName={plan.name}
          onClose={() => setCancelOpen(false)}
          onSuccess={() => { setCancelOpen(false); setRevision(value => value + 1); }}
        />
      )}
    </div>
  );
}
