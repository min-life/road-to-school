'use client';
import { RoutePlanCancellationReason } from './route-plan-cancellation-reason';
import { RoutePlanReoptimization } from '@/components/admin/routes/route-plan-reoptimization';
import { effectivePlanStatus, lifecycleReason } from '@/lib/school-lifecycle';
import { getRoutePlanStatusLabel } from '@/lib/route-plan-status';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import type { ApprovalReadinessResponse, Role, RouteItem, RoutePlanItem } from '@/lib/types';
import { BackLink } from '@/components/admin/common/context-navigation';
import { Button } from '@/components/ui/button';
import { AlertIcon, CheckIcon } from '@/components/icons';
import { RouteMap, type MapPoint } from '@/components/admin/routes/route-map';
import { RoutePlanningWorkspace, PlanningTabs } from '@/components/admin/routes/route-planning-workspace';
import { SavedPlanRoutesPanel } from './saved-plan-routes-panel';
import { RoutePlanAssignments } from './route-plan-assignments';
import { CancelRoutePlanModal } from '@/components/admin/routes/cancel-route-plan-modal';
import { getAssignmentProgress, resolveSavedRoutePlanTab } from '@/components/admin/routes/route-plan-assignment-state';
import { SchoolRoutePlanApproval } from '@/components/admin/routes/school-route-plan-approval';
import { RouteMapVisibilityControl } from '@/components/admin/routes/route-map-visibility-control';
import { PREVIEW_ROUTE_COLORS } from '@/components/admin/routes/preview-route-selector';
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
    id: item.id, name: item.name, direction: item.direction, vehiclePlate: item.proposedVehiclePlate,
    color: PREVIEW_ROUTE_COLORS[index % PREVIEW_ROUTE_COLORS.length],
  })), [routes]);

  const { editable: assignmentEditable, actionableSystemPendingGroupCount, schoolPendingGroupCount } = getAssignmentProgress(routes, planEffectiveStatus);

  // Số lượng nhóm chưa đủ theo vai trò
  const pendingCount = isSchoolAdmin
    ? (actionableSystemPendingGroupCount > 0 ? actionableSystemPendingGroupCount : schoolPendingGroupCount)
    : actionableSystemPendingGroupCount;

  const tab = resolveSavedRoutePlanTab(requestedTab, pendingCount);
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

  // Tự động chuyển sang tab "assignments" nếu chưa đủ phân công
  useEffect(() => {
    if (!plan || requestedTab === 'routes' || requestedTab === 'assignments') return;
    const next = new URLSearchParams(query.toString());
    next.set('tab', pendingCount > 0 ? 'assignments' : 'routes');
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [pendingCount, pathname, plan, query, requestedTab, router]);

  const visibleRoute = route?.id === activeId ? route : activeRoute;
  const activeColor = mapOptions.find(item => item.id === activeId)?.color;
  const points: MapPoint[] = (activeId && !hiddenRouteIds.has(activeId) ? visibleRoute?.stops ?? [] : [])
    .filter(stop => stop.stopType === 'PICKUP' || stop.stopType === 'DROPOFF')
    .map(stop => ({
      id: stop.id,
      latitude: stop.latitude,
      longitude: stop.longitude,
      title: stop.studentName || 'Điểm đón/trả',
      subtitle: stop.addressText,
      type: 'STUDENT',
      order: stop.stopOrder,
      isSelected: true,
      color: activeColor,
    }));

  const editable = assignmentEditable;
  const canCancel = editable && (!isSchoolAdmin || planEffectiveStatus === 'ACTIVE');
  const chooseRoute = (id: string) => { setFocusPoint(null); updateQuery({ routeId: id }); };

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

  return (
    <div ref={pageRef} className="route-planning-page saved-plan-page system-route-plan-workspace">
      <BackLink fallback="/admin/routes" />
      <header className="saved-plan-heading">
        <div className="saved-plan-heading-title">
          <h1>{plan.name}</h1>
          <p>
            {plan.schoolName} · {routes.length} tuyến · {plan.totalStudents} học sinh
            {plan.firstServiceDate ? ' · Ngày phục vụ đầu tiên: ' + plan.firstServiceDate.split('-').reverse().join('/') : ''}
          </p>
        </div>
        <div className="saved-plan-heading-actions">
          <div className="saved-plan-heading-statuses">
            <span className="saved-plan-status" data-status={effectivePlanStatus(plan)}>
              {getRoutePlanStatusLabel(effectivePlanStatus(plan))}
            </span>
            {effectivePlanStatus(plan) === 'CANCELLED' && <RoutePlanCancellationReason reason={plan.cancellationReason} />}
            {editable && routes.length > 0 && (
              <span className="saved-plan-assignment-progress" data-pending={pendingCount > 0} role="status" aria-atomic="true">
                {actionableSystemPendingGroupCount > 0 ? (
                  <>
                    <AlertIcon className="w-4 h-4" aria-hidden="true" />
                    Còn {actionableSystemPendingGroupCount} nhóm xe chưa đủ
                  </>
                ) : schoolPendingGroupCount > 0 ? (
                  <>
                    <AlertIcon className="w-4 h-4" aria-hidden="true" />
                    Còn {schoolPendingGroupCount} nhóm chưa có giáo viên
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4" aria-hidden="true" />
                    Đã phân công đủ
                  </>
                )}
              </span>
            )}
          </div>
          <div className="saved-plan-heading-buttons">
            {pendingCount > 0 && (
              <Button type="button" variant="primary" size="sm" onClick={openPendingAssignments}>
                Phân công <span aria-hidden="true">→</span>
              </Button>
            )}
            {canCancel && (
              <Button className="saved-plan-cancel-button" variant="danger" size="sm" onClick={() => setCancelOpen(true)}>
                <AlertIcon className="w-4 h-4" aria-hidden="true" />
                Hủy phương án
              </Button>
            )}
          </div>
        </div>
      </header>

      <RoutePlanReoptimization plan={plan} systemAdmin={!isSchoolAdmin} onUpdated={() => { setRoute(null); setRevision(value => value + 1); }} />
      {plan.effectiveStatusReason && <p className="saved-plan-notice" role="status">{lifecycleReason(plan.effectiveStatusReason)}. Phương án chỉ còn để tra cứu.</p>}
      {effectivePlanStatus(plan) === 'EXPIRED' && <p className="saved-plan-notice">Phương án hết hạn hợp đồng. Thông tin được giữ để tra cứu.</p>}

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
              schoolLocation={visibleRoute?.schoolLocation}
              parkingLocation={visibleRoute?.parkingLocation}
              points={points}
              routes={mapRoutes}
              focusPoint={focusPoint}
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
                { value: 'routes', label: 'Tuyến' },
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
                <>
                  <div className="saved-plan-assignment-status" data-pending={pendingCount > 0} role="status" aria-atomic="true">
                    {!editable ? (
                      <>
                        <strong>Phân công đã lưu</strong>
                        <span>Phương án chỉ xem.</span>
                      </>
                    ) : actionableSystemPendingGroupCount > 0 ? (
                      <>
                        <strong>Còn {actionableSystemPendingGroupCount} nhóm xe nhà xe cần xử lý</strong>
                        <span>{isSchoolAdmin ? 'Nhà xe cần hoàn tất phân công xe và tài xế.' : 'Chọn Phân công tài xế hoặc Đổi xe trong từng nhóm bên dưới.'}</span>
                      </>
                    ) : schoolPendingGroupCount > 0 ? (
                      <>
                        <strong>Nhà xe đã hoàn tất phân công</strong>
                        <span>{isSchoolAdmin ? `Cần phân công giáo viên phụ trách cho ${schoolPendingGroupCount} nhóm.` : `Đang chờ trường phân công giáo viên phụ trách cho ${schoolPendingGroupCount} nhóm.`}</span>
                      </>
                    ) : (
                      <>
                        <strong>Đã hoàn tất phân công</strong>
                        <span>Xe, tài xế và giáo viên phụ trách đã đầy đủ.</span>
                      </>
                    )}
                  </div>
                  <RoutePlanAssignments
                    plan={plan}
                    currentUserRole={editable ? role : null}
                    compact
                    onUpdated={() => setRevision(value => value + 1)}
                  />
                </>
              ) : (
                <>
                  <SavedPlanRoutesPanel
                    routes={routes}
                    activeId={activeId}
                    route={visibleRoute}
                    schoolName={plan.schoolName}
                    routeError={routeError?.id === activeId ? routeError.message : undefined}
                    loading={route?.id !== activeId && Boolean(activeId)}
                    onChoose={chooseRoute}
                    onFocus={setFocusPoint}
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
                  <details className="saved-plan-readiness">
                    <summary>Thông tin phương án</summary>
                    <p>Tạo lúc: {new Date(plan.createdAt).toLocaleString('vi-VN')}</p>
                    {plan.firstServiceDate && <p>Ngày phục vụ đầu tiên: {plan.firstServiceDate.split('-').reverse().join('/')}</p>}
                    {plan.activatedAt && <p>Duyệt lúc: {new Date(plan.activatedAt).toLocaleString('vi-VN')}{plan.approvedByName ? ` · ${plan.approvedByName}` : ''}</p>}
                    {plan.cancelledAt && <p>Hủy lúc: {new Date(plan.cancelledAt).toLocaleString('vi-VN')}</p>}
                    <p>Mã phương án: {plan.id}</p>
                  </details>
                </>
              )}
            </div>
          </>
        }
      />
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
