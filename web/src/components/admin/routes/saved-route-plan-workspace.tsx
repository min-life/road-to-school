'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import type { ApprovalReadinessResponse, Role, RouteItem, RoutePlanItem } from '@/lib/types';
import { BackLink, ContextLink } from '@/components/admin/common/context-navigation';
import { Button } from '@/components/ui/button';
import { AlertIcon } from '@/components/icons';
import { RouteMap, type MapPoint } from './route-map';
import { RoutePlanningWorkspace, PlanningTabs } from './route-planning-workspace';
import { RoutePlanAssignments } from './route-plan-assignments';
import { CancelRoutePlanModal } from './cancel-route-plan-modal';
import { getAssignmentProgress, resolveSavedRoutePlanTab } from './route-plan-assignment-state';
import './saved-route-plan-workspace.css';

const statusLabels = { DRAFT: 'Nháp', ACTIVE: 'Đã duyệt', EXPIRED: 'Hết hạn', CANCELLED: 'Đã hủy' };

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
  const [readiness, setReadiness] = useState<ApprovalReadinessResponse | null>(null);
  const [readinessError, setReadinessError] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ latitude: number; longitude: number; zoom: number } | null>(null);

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

  useEffect(() => {
    let current = true;
    if (role !== 'SYSTEM_ADMIN' || plan?.status !== 'DRAFT') return;
    apiClient.getApprovalReadiness(planId).then(value => {
      if (current) { setReadiness(value); setReadinessError(false); }
    }).catch(() => { if (current) setReadinessError(true); });
    return () => { current = false; };
  }, [planId, role, plan?.status, revision]);

  const routes = plan?.routes ?? [];
  const { editable: assignmentEditable, actionableSystemPendingGroupCount, schoolPendingGroupCount } = getAssignmentProgress(routes, plan?.status);
  const tab = resolveSavedRoutePlanTab(requestedTab, actionableSystemPendingGroupCount);
  const activeRoute = routes.find(item => item.id === selectedId) ?? routes[0];
  const activeId = activeRoute?.id;
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
  const points: MapPoint[] = (visibleRoute?.stops ?? [])
    .filter(stop => stop.stopType === 'PICKUP' || stop.stopType === 'DROPOFF')
    .map(stop => ({ id: stop.id, latitude: stop.latitude, longitude: stop.longitude,
      title: stop.studentName || 'Điểm đón/trả', subtitle: stop.addressText,
      type: 'STUDENT', order: stop.stopOrder, isSelected: true }));
  const editable = assignmentEditable;
  const chooseRoute = (id: string) => { setFocusPoint(null); updateQuery({ routeId: id }); };

  if (!plan || error) return <div className="route-planning-page saved-plan-page">
    <BackLink fallback="/admin/routes" />
    {error ? <div className="saved-plan-error" role="alert">{error}<Button variant="outline" onClick={() => setRevision(value => value + 1)}>Thử lại</Button></div>
      : <p role="status">Đang tải phương án…</p>}
  </div>;

  return <div className="route-planning-page saved-plan-page">
    <BackLink fallback="/admin/routes" />
    <header className="saved-plan-heading">
      <div><h1>{plan.name}</h1><p>{plan.schoolName} · {routes.length} tuyến · {plan.totalStudents} học sinh</p></div>
      <span data-status={plan.status}>{statusLabels[plan.status]}</span>
      {editable && <Button className="saved-plan-cancel-button" variant="danger" size="sm" onClick={() => setCancelOpen(true)}>
        <AlertIcon className="w-4 h-4" aria-hidden="true" />
        Hủy phương án
      </Button>}
    </header>
    {plan.status === 'CANCELLED' && <p className="saved-plan-notice">Phương án đã hủy{plan.cancellationReason ? `: ${plan.cancellationReason}` : '.'}</p>}
    {plan.status === 'EXPIRED' && <p className="saved-plan-notice">Phương án hết hạn hợp đồng. Thông tin được giữ để tra cứu.</p>}
    <RoutePlanningWorkspace preview panelLabel={tab === 'assignments' ? `Phân công${actionableSystemPendingGroupCount ? ` (${actionableSystemPendingGroupCount})` : ''}` : 'Tuyến'}
      map={routes.length ? <>
        <RouteMap schoolLocation={visibleRoute?.schoolLocation} parkingLocation={visibleRoute?.parkingLocation}
          points={points} polylineGeometry={visibleRoute?.polylineGeometry} focusPoint={focusPoint} height="100%" />
        {routeError?.id === activeId && <div className="saved-plan-map-error" role="alert">{routeError?.message}
          <Button variant="outline" size="sm" onClick={() => setRouteRevision(value => value + 1)}>Thử lại</Button></div>}
      </> : <p className="route-workspace-empty">Phương án chưa có tuyến để hiển thị.</p>}
      panel={<>
        <PlanningTabs tabs={[{ value: 'routes', label: 'Tuyến' }, { value: 'assignments', label: `Phân công${actionableSystemPendingGroupCount ? ` (${actionableSystemPendingGroupCount})` : ''}` }]}
          value={tab} onChange={value => updateQuery({ tab: value })} />
        <div className="saved-plan-route-toolbar"><label className="saved-plan-route-select">Tuyến trên bản đồ
          <select value={activeId ?? ''} disabled={!routes.length} onChange={event => chooseRoute(event.target.value)}>
            {routes.map(item => <option key={item.id} value={item.id}>{item.direction === 'TO_SCHOOL' ? 'Đi' : 'Về'} · {item.name}</option>)}
          </select>
        </label></div>
        <div className="route-workspace-content" role="tabpanel" id={`planning-panel-${tab}`} aria-labelledby={`planning-tab-${tab}`}>
          {tab === 'assignments' ? <>
            <div className="saved-plan-assignment-status" data-pending={actionableSystemPendingGroupCount > 0} role="status" aria-atomic="true">
              {actionableSystemPendingGroupCount > 0 ? <>
                <strong>Còn {actionableSystemPendingGroupCount} nhóm xe nhà xe cần xử lý</strong>
                <span>Chọn Phân công tài xế hoặc Đổi xe trong từng nhóm bên dưới.</span>
              </> : schoolPendingGroupCount > 0 ? <>
                <strong>Nhà xe đã hoàn tất phân công</strong>
                <span>Đang chờ trường phân công giáo viên phụ xe cho {schoolPendingGroupCount} nhóm.</span>
              </> : <>
                <strong>Đã hoàn tất phân công</strong>
                <span>Xe, tài xế và giáo viên phụ xe đã đầy đủ.</span>
              </>}
            </div>
            {plan.status === 'DRAFT' && <details className="saved-plan-readiness">
              <summary>{readinessError ? 'Chưa tải được điều kiện duyệt' : !readiness ? 'Đang kiểm tra điều kiện duyệt…' : readiness.isReadyForApproval ? 'Đủ điều kiện để trường phê duyệt' : `Còn ${readiness.blockers.length} mục cần bổ sung trước khi duyệt`}</summary>
              {readinessError ? <Button size="sm" variant="outline" onClick={() => setRevision(value => value + 1)}>Thử lại</Button>
                : <ul>{readiness?.blockers.map((item, index) => <li key={index}>{item.message}</li>)}</ul>}
              <p>Trường học phân công giáo viên phụ xe và phê duyệt phương án.</p>
            </details>}
            <RoutePlanAssignments plan={plan} currentUserRole={editable ? role : null} compact
              onUpdated={() => setRevision(value => value + 1)} />
          </> : <>
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
