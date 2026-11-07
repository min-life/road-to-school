'use client';
import { getTripStatusLabel } from '@/lib/status-labels';
import { BackLink, ContextLink } from '@/components/admin/common/context-navigation';
import { effectivePlanStatus, lifecycleError, lifecycleReason, type TripAdminFinalization } from '@/lib/school-lifecycle';

import React, { useState, useEffect, useMemo, useRef, useId, use } from 'react';
import { apiClient, ApiError } from '@/lib/api-client';
import { TripDetail } from '@/lib/types';
import { Copy } from 'lucide-react';
import { toast } from '@/stores/toast-store';
import { useAuth } from '@/components/auth/auth-provider';
import { useVisibleRefresh } from '@/hooks/use-visible-refresh';
import type { RefreshContext } from '@/lib/refresh-loop';
import {
  SpinnerIcon,
  AlertIcon,
  RouteIcon,
  BusIcon,
} from '@/components/icons';
import { RouteMap, MapPoint } from '@/components/admin/routes/route-map';
import { tripAssignmentLock } from '@/lib/business-improvements';
import { TripAssignmentModal } from './_components/trip-assignment-modal';
import { TripAttendancePanel, TripAttendanceSummary } from './_components/trip-attendance';
import { TripStopsPanel } from './_components/trip-stops-panel';
import { useTripAttendance } from './_components/use-trip-attendance';
import './_components/trip-detail.css';
import { getRecordedHistory, getTripLocation, splitRecordedHistory, type RecordedPoint, type TripLocationState } from '@/lib/trip-location';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';

export default function AdminTripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: tripId } = use(params);
  const { user } = useAuth();

  return <TripDetailContent key={JSON.stringify([tripId, user?.id, user?.role, user?.schoolId])} tripId={tripId} />;
}

function TripDetailContent({ tripId }: { tripId: string }) {
  const { user } = useAuth();
  const [panelTab, setPanelTab] = useState<'attendance' | 'stops'>('attendance');
  const tabId = useId();
  const currentUserRole = user?.role || null;
  const currentUserSchoolId = user?.schoolId || null;
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [policy, setPolicy] = useState<{ tripId: string; blocked: boolean; audit?: TripAdminFinalization | null; error?: string } | null>(null);
  const [location, setLocation] = useState<TripLocationState | null>(null);
  const [history, setHistory] = useState<RecordedPoint[] | null>(null);
  const [showPlanned, setShowPlanned] = useState(false);
  const metadataAt = useRef(0), historyLoaded = useRef(false);
  const historyParts = useMemo(() => splitRecordedHistory(history ?? []), [history]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ latitude: number; longitude: number; zoom?: number } | null>(null);


  const fetchTripDetail = async ({ isCurrent, immediate }: RefreshContext) => {
    if (!user) return;
    try {
      setError(null);
      const [detail, position] = await Promise.all([
        immediate || !trip || Date.now() - metadataAt.current >= 15000 ? apiClient.getTripDetail(tripId) : Promise.resolve(null),
        getTripLocation(tripId).catch(err => {
          if (err instanceof ApiError && [401, 403, 404].includes(err.statusCode)) throw err;
          return null;
        }),
      ]);
      let res = detail;
      if (!isCurrent()) return;
      if (!res && trip && position?.status && trip.status !== position.status) res = await apiClient.getTripDetail(tripId);
      if (!isCurrent()) return;
      if (res) {
        setTrip(res); metadataAt.current = Date.now();
        setPolicy({ tripId, blocked: true, audit: res.adminFinalization });
        // Fail closed for assignment when current lifecycle eligibility cannot be verified.
        try {
          const [plan, pending] = await Promise.all([
            apiClient.getRoutePlanDetail(res.routePlanId),
            currentUserRole === 'SYSTEM_ADMIN' && (res.status === 'SCHEDULED' || res.status === 'IN_PROGRESS') ? apiClient.getAdminFinalizations() : Promise.resolve([]),
          ]);
          if (!isCurrent()) return;
          const audit = pending.find(row => row.id === tripId)?.adminFinalization ?? res.adminFinalization;
          const blocked = !['DRAFT', 'ACTIVE'].includes(effectivePlanStatus(plan)) || audit?.state === 'PENDING';
          setPolicy({ tripId, blocked, audit });
          if (blocked) setIsEditModalOpen(false);
        } catch (reason) {
          if (!isCurrent()) return;
          setPolicy({ tripId, blocked: true, error: lifecycleError(reason), audit: res.adminFinalization });
          setIsEditModalOpen(false);
        }
      }
      if (position) setLocation(position);
      else setLocation(previous => previous ? { ...previous, freshness: 'STALE' } : null);
      const status = res?.status ?? position?.status ?? trip?.status;
      if (status !== 'SCHEDULED') setIsEditModalOpen(false);
      const terminal = status === 'COMPLETED' || status === 'CANCELLED';
      if (terminal && !historyLoaded.current) {
        const points = await getRecordedHistory(tripId, isCurrent);
        if (!isCurrent()) return;
        if (points) { setHistory(points); historyLoaded.current = true; }
      }
      return !terminal || !historyLoaded.current;
    } catch (err: unknown) {
      if (!isCurrent()) return;
      if (err instanceof ApiError && [401, 403, 404].includes(err.statusCode)) {
        setTrip(null); setLocation(null); setHistory(null); setIsEditModalOpen(false); setError(err.message); return false;
      }
      if (!trip) setError(err instanceof Error ? err.message : 'Không thể tải thông tin chi tiết chuyến xe');
    } finally {
      if (isCurrent()) setLoading(false);
    }
  };
  const identity = JSON.stringify([tripId, user?.id, user?.role, user?.schoolId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Clear private details when the authenticated scope changes.
  useEffect(() => { setTrip(null); setLocation(null); setHistory(null); historyLoaded.current = false; metadataAt.current = 0;
    setShowPlanned(false); setIsEditModalOpen(false); setLoading(true); }, [identity]);
  const loadTripDetail = useVisibleRefresh(identity, fetchTripDetail, 5000);
  const attendance = useTripAttendance(tripId, identity, Boolean(user && ['SYSTEM_ADMIN', 'SCHOOL_ADMIN'].includes(user.role)));

  const assignmentLock = trip ? tripAssignmentLock(trip, attendance.data) : null;
  const canEditAssignment = useMemo(() => {
    if (!currentUserRole || !trip) return false;
    if (assignmentLock || attendance.error) return false;
    if (trip.status !== 'SCHEDULED' || !policy || policy.tripId !== trip.id || policy.blocked) return false;
    if (currentUserRole === 'SYSTEM_ADMIN') return true;
    if (currentUserRole === 'SCHOOL_ADMIN' && currentUserSchoolId === trip.schoolId) return true;
    return false;
  }, [currentUserRole, currentUserSchoolId, trip, policy, assignmentLock, attendance.error]);

  // Locations for Map
  const parkingLocation = useMemo(() => {
    if (!trip?.stops) return undefined;
    const parkingStop = trip.stops.find(
      (s) => s.stopType === 'PARKING_START' || s.stopType === 'PARKING_END'
    );
    if (!parkingStop) return undefined;
    return {
      latitude: parkingStop.latitude,
      longitude: parkingStop.longitude,
      addressText: parkingStop.addressText || 'Bãi xe',
    };
  }, [trip]);

  const schoolLocation = useMemo(() => {
    if (!trip?.stops) return undefined;
    const schoolStop = trip.stops.find(
      (s) => s.stopType === 'SCHOOL_ARRIVAL' || s.stopType === 'SCHOOL_DEPARTURE'
    );
    if (!schoolStop) return undefined;
    return {
      latitude: schoolStop.latitude,
      longitude: schoolStop.longitude,
      name: trip.schoolName || schoolStop.addressText || 'Trường học',
    };
  }, [trip]);

  const mapPoints: MapPoint[] = useMemo(() => {
    if (!trip?.stops) return [];
    return trip.stops
      .filter((s) => s.stopType === 'PICKUP' || s.stopType === 'DROPOFF')
      .map((s) => ({
        id: s.id,
        latitude: s.latitude,
        longitude: s.longitude,
        title: s.studentName || 'Điểm đón học sinh',
        subtitle: s.addressText,
        type: 'STUDENT',
        order: s.stopOrder,
        eta: s.plannedArrivalTime,
        isSelected: true,
      }));
  }, [trip]);

  const formatServiceDateLong = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dt = new Date(Date.UTC(y, m, d, 12, 0, 0));
      const viDays = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      return `${viDays[dt.getUTCDay()]}, ngày ${String(d).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`;
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <SpinnerIcon className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
        <p className="text-sm text-slate-500">Đang tải chi tiết chuyến xe...</p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="space-y-4">
        <BackLink fallback="/admin/trips" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800" />
        <Card className="p-8 rounded-2xl bg-white border border-rose-200 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <AlertIcon className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-800">Không tìm thấy chuyến xe</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{error || 'Chuyến xe không tồn tại hoặc bạn không có quyền xem.'}</p>
          <BackLink fallback="/admin/trips" className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors" />
        </Card>
      </div>
    );
  }

  const isCancelled = trip.status === 'CANCELLED';
  const actualTime = (value: string) => new Date(value).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false });
  const focusStudent = (studentId: string) => {
    const stop = trip.stops?.find(stop => stop.studentId === studentId);
    if (stop && Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude)) {
      setFocusPoint({ latitude: stop.latitude, longitude: stop.longitude, zoom: 16 });
    }
  };
  const isToSchool = trip.direction === 'TO_SCHOOL';

  return (
    <div className="trip-detail-page">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <BackLink fallback="/admin/trips" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors" />
        <Button type="button" variant="ghost" size="sm" className="trip-detail-copy" title={trip.id} aria-label="Sao chép mã chuyến" onClick={async () => {
          try { await navigator.clipboard.writeText(trip.id); toast.success('Đã sao chép mã chuyến'); }
          catch { toast.error('Không thể sao chép mã chuyến'); }
        }}><code>{trip.id.slice(0, 8)}</code><Copy className="w-3.5 h-3.5" aria-hidden="true" /></Button>
      </div>

      {/* Header Card */}
      <Card className="trip-detail-header">
        <PageHeader className="trip-detail-header-content">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <BusIcon className="w-6 h-6 text-slate-700" />
              <span>{trip.routeName}</span>
            </h1>

            {isToSchool ? (
              <Badge className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Chiều đi (Đến trường)
              </Badge>
            ) : (
              <Badge className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                Chiều về (Về bãi xe)
              </Badge>
            )}

            <Badge className="trip-detail-status" data-status={trip.status}>
              {getTripStatusLabel(trip.status)}
            </Badge>
            {(policy?.tripId === trip.id && (policy.audit?.state === 'PENDING' || (!['COMPLETED', 'CANCELLED'].includes(trip.status) && policy.blocked))) && <details className="trip-detail-policy-note" data-finalized={policy.audit?.state === 'FINALIZED'}>
              <summary><AlertIcon className="w-4 h-4" aria-hidden="true" /><span>{policy.audit?.state === 'FINALIZED' ? 'Lịch sử xử lý hành chính' : 'Cần kiểm tra điều kiện vận hành'}</span></summary>
              <div className="trip-detail-policy-content">
                <p className="text-sm">{policy.error || policy.audit?.reason || lifecycleReason(policy.audit?.trigger) || 'Chuyến không còn đủ điều kiện đổi phân công.'}</p>
                {policy.audit?.finalizedAt && <p className="text-xs text-slate-500">Ghi nhận: {new Date(policy.audit.finalizedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}. Việc kết thúc hành chính không xác nhận học sinh đã xuống xe.</p>}
                {currentUserRole === 'SYSTEM_ADMIN' && policy.audit?.state === 'PENDING' && <ContextLink href="/admin/trips?tab=finalizations" className="text-sm font-semibold text-blue-700">Xử lý hành chính</ContextLink>}
                {policy.error && <Button type="button" variant="outline" size="sm" onClick={loadTripDetail}>Thử lại</Button>}
              </div>
            </details>}
          </div>

          <p className="trip-detail-service-line">
            <span title={formatServiceDateLong(trip.serviceDate)}>{formatServiceDateLong(trip.serviceDate)}</span>
            <span>Dự kiến <strong>{trip.scheduledStartTime} – {trip.scheduledEndTime}</strong></span>
            <span>Xe <strong>{trip.vehiclePlate || 'Chưa gán'}</strong></span>
            <span title={trip.driverName}>Tài xế: <strong>{trip.driverName || 'Chưa gán'}</strong></span>
            <span title={trip.busAttendantName}>Giáo viên: <strong>{trip.busAttendantName || 'Chưa gán'}</strong></span>
          </p>
          <details className="trip-detail-expanded">
            <summary>Chi tiết <span aria-hidden="true">⌄</span></summary>
            <dl className="trip-detail-metadata">
              <div><dt>Trường học</dt><dd>{trip.schoolName}</dd></div>
              <div><dt>Phương án tuyến</dt><dd><ContextLink href={`/admin/routes/plans/${trip.routePlanId}`}>{trip.routePlanName}</ContextLink></dd></div>
              <div><dt>Lịch dự kiến</dt><dd>{trip.scheduledStartTime} – {trip.scheduledEndTime}</dd><small>{trip.actualStartTime || trip.actualEndTime ? `Thực tế: ${trip.actualStartTime ? actualTime(trip.actualStartTime) : 'Chưa bắt đầu'} – ${trip.actualEndTime ? actualTime(trip.actualEndTime) : 'Chưa kết thúc'}` : `Khởi hành từ ${isToSchool ? 'bãi xe' : 'trường học'}`}</small></div>
              <div><dt>Phương tiện</dt><dd>{trip.vehiclePlate || 'Chưa gán xe'}</dd><small>{trip.vehicleSeats ? `${trip.vehicleSeats} chỗ` : 'Chưa cập nhật sức chứa'}{trip.vehicleBrand ? ` · ${trip.vehicleBrand}` : ''}</small></div>
              <div><dt>Tài xế</dt><dd>{trip.driverName || 'Chưa gán tài xế'}</dd><small>{trip.driverPhone || 'Chưa cập nhật số điện thoại'}</small></div>
              <div><dt>Giáo viên phụ xe</dt><dd>{trip.busAttendantName || 'Chưa gán giáo viên'}</dd><small>{trip.busAttendantPhone || 'Chưa cập nhật số điện thoại'}</small></div>
            </dl>
            {isCancelled && trip.cancellationReason && <p className="trip-detail-cancellation"><strong>Lý do hủy:</strong> {trip.cancellationReason}</p>}
            {policy?.tripId === trip.id && policy.audit?.state === 'FINALIZED' && <div className="trip-detail-policy-content">
              <strong className="text-xs">Lịch sử xử lý hành chính</strong>
              <p className="text-sm">{policy.audit.reason || lifecycleReason(policy.audit.trigger)}</p>
              {policy.audit.finalizedAt && <p className="text-xs text-slate-500">Ghi nhận: {new Date(policy.audit.finalizedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}. Việc kết thúc hành chính không xác nhận học sinh đã xuống xe.</p>}
            </div>}
          </details>
        </PageHeader>

        {trip.status === 'SCHEDULED' && (assignmentLock || attendance.error) && <p className="text-sm text-amber-800" role="status">{attendance.error ? 'Chưa thể kiểm tra phân công: không tải được điểm danh.' : assignmentLock}</p>}
      {/* Action: Edit Assignment */}
        {canEditAssignment && (
          <Button
            onClick={() => setIsEditModalOpen(true)}
            variant="outline"
          >
            <span>Đổi phân công chuyến</span>
          </Button>
        )}
      </Card>

      <TripAttendanceSummary data={attendance.data} cancelled={isCancelled} />

      {/* Main Content: Map & Stops Timeline */}
      <div className="trip-detail-layout">
        {/* Left Column: RouteMap (7 cols) */}
        <Card className="trip-detail-map">
          <div className="trip-detail-map-heading">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <RouteIcon className="w-4 h-4 text-slate-500" />
              <span>Bản đồ lộ trình chuyến xe</span>
            </h2>
            <span className="text-xs text-slate-400">
              {mapPoints.length} điểm {isToSchool ? 'đón' : 'trả'} học sinh
            </span>
          </div>

          <div className="trip-detail-map-body">
            <p className="text-xs text-slate-500 mb-2">
              {trip.status === 'COMPLETED' || trip.status === 'CANCELLED'
                ? history === null ? 'Đang tải hành trình' : history.length && !showPlanned ? 'Hành trình ghi nhận' : 'Tuyến dự kiến'
                : !location?.latestPosition ? 'Chưa có vị trí' : location.freshness === 'STALE' ? 'Mất cập nhật' : `Cập nhật lúc ${new Date(location.latestPosition.recordedAt).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`}
              {!showPlanned && historyParts.length > 1 ? ' · Có đoạn chưa ghi nhận' : ''}
            </p>
            {!!history?.length && <div className="flex gap-2 mb-2 text-xs">
              <Button className={`px-3 py-2 rounded-lg ${!showPlanned ? 'bg-amber-200' : 'bg-slate-100'}`} onClick={() => setShowPlanned(false)}>Hành trình ghi nhận</Button>
              <Button className={`px-3 py-2 rounded-lg ${showPlanned ? 'bg-amber-200' : 'bg-slate-100'}`} onClick={() => setShowPlanned(true)}>Tuyến dự kiến</Button>
            </div>}
            <div className="trip-detail-map-canvas">
            <RouteMap
              schoolLocation={schoolLocation}
              parkingLocation={parkingLocation}
              points={mapPoints}
              polylineGeometry={trip.polylineGeometry}
              vehiclePosition={location?.latestPosition}
              recordedTrack={history?.length && !showPlanned ? historyParts : undefined}
              focusPoint={focusPoint}
              height="100%"
              className="rounded-xl overflow-hidden"
            />
            </div>
          </div>
        </Card>

        <Card className="trip-detail-side">
          <div className="trip-detail-tabs" role="tablist" aria-label="Thông tin chuyến xe">
            {(['attendance', 'stops'] as const).map(tab => <Button
              key={tab} type="button" role="tab" id={`${tabId}-${tab}-tab`}
              aria-controls={`${tabId}-${tab}-panel`} aria-selected={panelTab === tab}
              tabIndex={panelTab === tab ? 0 : -1}
              variant={panelTab === tab ? 'primary' : 'ghost'}
              onClick={() => setPanelTab(tab)}
              onKeyDown={event => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const next = event.key === 'Home' ? 'attendance' : event.key === 'End' ? 'stops' : tab === 'attendance' ? 'stops' : 'attendance';
                setPanelTab(next);
                document.getElementById(`${tabId}-${next}-tab`)?.focus();
              }}
            >{tab === 'attendance' ? `Học sinh${attendance.data ? ` (${attendance.data.totalStudents})` : ''}` : `Điểm dừng (${trip.stops?.length || 0})`}</Button>)}
          </div>
          <div role="tabpanel" id={`${tabId}-attendance-panel`} aria-labelledby={`${tabId}-attendance-tab`} hidden={panelTab !== 'attendance'}>
            <TripAttendancePanel data={attendance.data} error={attendance.error} updatedAt={attendance.updatedAt} onRefresh={attendance.refresh} isRefreshing={attendance.isRefreshing} cancelled={isCancelled} onFocusStudent={focusStudent} />
          </div>
          <div role="tabpanel" id={`${tabId}-stops-panel`} aria-labelledby={`${tabId}-stops-tab`} hidden={panelTab !== 'stops'}>
            <TripStopsPanel stops={trip.stops ?? []} schoolName={trip.schoolName} onFocus={setFocusPoint} />
          </div>
        </Card>
      </div>

      {/* Assignment Modal */}
      <TripAssignmentModal
        isOpen={isEditModalOpen}
        trip={trip}
        lockReason={assignmentLock || (attendance.error ? 'Không thể kiểm tra điểm danh.' : null)}
        currentUserRole={currentUserRole}
        onClose={() => setIsEditModalOpen(false)}
        onUpdated={() => {
          loadTripDetail();
          attendance.refresh();
        }}
      />
    </div>
  );
}
