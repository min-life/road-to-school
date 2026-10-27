'use client';

import React, { useState, useEffect, useMemo, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api-client';
import { TripDetail } from '@/lib/types';
import { useAuth } from '@/components/auth/auth-provider';
import { useVisibleRefresh } from '@/hooks/use-visible-refresh';
import type { RefreshContext } from '@/lib/refresh-loop';
import {
  ChevronLeftIcon,
  SpinnerIcon,
  AlertIcon,
  RouteIcon,
  BusIcon,
  ClockIcon,
  MapPinIcon,
} from '@/components/icons';
import { RouteMap, MapPoint } from '@/components/admin/routes/route-map';
import { TripAssignmentModal } from '@/components/admin/trips/trip-assignment-modal';
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
  const router = useRouter();
  const { user } = useAuth();

  const currentUserRole = user?.role || null;
  const currentUserSchoolId = user?.schoolId || null;
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      if (res) { setTrip(res); metadataAt.current = Date.now(); }
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

  const canEditAssignment = useMemo(() => {
    if (!currentUserRole || !trip) return false;
    if (trip.status !== 'SCHEDULED') return false;
    if (currentUserRole === 'SYSTEM_ADMIN') return true;
    if (currentUserRole === 'SCHOOL_ADMIN' && currentUserSchoolId === trip.schoolId) return true;
    return false;
  }, [currentUserRole, currentUserSchoolId, trip]);

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
        <Link
          href="/admin/trips"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          <span>Quay lại danh sách chuyến xe</span>
        </Link>
        <Card className="p-8 rounded-2xl bg-white border border-rose-200 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <AlertIcon className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-800">Không tìm thấy chuyến xe</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{error || 'Chuyến xe không tồn tại hoặc bạn không có quyền xem.'}</p>
          <Button
            onClick={() => router.push('/admin/trips')}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Về trang danh sách
          </Button>
        </Card>
      </div>
    );
  }

  const isToSchool = trip.direction === 'TO_SCHOOL';

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/trips"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          <span>Quay lại danh sách chuyến xe</span>
        </Link>
        <span className="text-xs text-slate-400">
          Mã chuyến: <code className="text-slate-600 font-mono text-[11px]">{trip.id.slice(0, 8)}...</code>
        </span>
      </div>

      {/* Header Card */}
      <Card className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageHeader className="space-y-1.5">
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

            <Badge className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {trip.status}
            </Badge>
          </div>

          <p className="text-xs text-slate-500">
            Ngày dịch vụ: <strong className="text-slate-800 font-semibold">{formatServiceDateLong(trip.serviceDate)}</strong>
            {' • '}
            Trường: <strong className="text-slate-700 font-semibold">{trip.schoolName}</strong>
            {' • '}
            Phương án: <span className="text-slate-600">{trip.routePlanName}</span>
          </p>
        </PageHeader>

        {/* Action: Edit Assignment */}
        {canEditAssignment && (
          <Button
            onClick={() => setIsEditModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>Đổi phân công chuyến</span>
          </Button>
        )}
      </Card>

      {/* 4 Cards: Thời gian, Xe, Tài xế, Giáo viên */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Giờ vận hành */}
        <Card className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Khung giờ vận hành
          </span>
          <div className="text-xl font-black text-slate-800 font-mono">
            {trip.scheduledStartTime} – {trip.scheduledEndTime}
          </div>
          <span className="text-[11px] text-slate-500 block">
            Khởi hành từ {isToSchool ? 'Bãi xe' : 'Trường học'}
          </span>
        </Card>

        {/* Card 2: Xe đưa đón */}
        <Card className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Phương tiện (Xe)
          </span>
          <div className="text-base font-bold text-slate-900">
            {trip.vehiclePlate || 'Chưa gán xe'}
          </div>
          <span className="text-xs text-slate-500 block">
            {trip.vehicleSeats} chỗ • {trip.vehicleBrand}
          </span>
        </Card>

        {/* Card 3: Tài xế */}
        <Card className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Tài xế phụ trách
          </span>
          <div className="text-base font-bold text-slate-900">
            {trip.driverName || 'Chưa gán tài xế'}
          </div>
          <span className="text-xs text-slate-500 block font-mono">
            {trip.driverPhone || '—'}
          </span>
        </Card>

        {/* Card 4: Giáo viên */}
        <Card className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Giáo viên phụ xe
          </span>
          <div className="text-base font-bold text-slate-900">
            {trip.busAttendantName || 'Chưa gán giáo viên'}
          </div>
          <span className="text-xs text-slate-500 block font-mono">
            {trip.busAttendantPhone || '—'}
          </span>
        </Card>
      </div>

      {/* Main Content: Map & Stops Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: RouteMap (7 cols) */}
        <Card className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <RouteIcon className="w-4 h-4 text-slate-500" />
              <span>Bản đồ lộ trình chuyến xe</span>
            </h2>
            <span className="text-xs text-slate-400">
              {mapPoints.length} điểm đón học sinh
            </span>
          </div>

          <div className="p-3">
            <p className="text-xs text-slate-500 mb-2">
              {trip.status === 'COMPLETED' || trip.status === 'CANCELLED'
                ? history === null ? 'Đang tải hành trình' : history.length && !showPlanned ? 'Hành trình ghi nhận' : 'Tuyến dự kiến'
                : !location?.latestPosition ? 'Chưa có vị trí' : location.freshness === 'STALE' ? 'Mất cập nhật' : `Cập nhật lúc ${new Date(location.latestPosition.recordedAt).toLocaleTimeString('vi-VN')}`}
              {!showPlanned && historyParts.length > 1 ? ' · Có đoạn chưa ghi nhận' : ''}
            </p>
            {!!history?.length && <div className="flex gap-2 mb-2 text-xs">
              <Button className={`px-3 py-2 rounded-lg ${!showPlanned ? 'bg-amber-200' : 'bg-slate-100'}`} onClick={() => setShowPlanned(false)}>Hành trình ghi nhận</Button>
              <Button className={`px-3 py-2 rounded-lg ${showPlanned ? 'bg-amber-200' : 'bg-slate-100'}`} onClick={() => setShowPlanned(true)}>Tuyến dự kiến</Button>
            </div>}
            <RouteMap
              schoolLocation={schoolLocation}
              parkingLocation={parkingLocation}
              points={mapPoints}
              polylineGeometry={trip.polylineGeometry}
              vehiclePosition={location?.latestPosition}
              recordedTrack={history?.length && !showPlanned ? historyParts : undefined}
              focusPoint={focusPoint}
              height="500px"
              className="rounded-xl overflow-hidden"
            />
          </div>
        </Card>

        {/* Right Column: Stops Timeline (5 cols) */}
        <Card className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-slate-500" />
              <span>Trình tự điểm dừng ({trip.stops?.length || 0})</span>
            </h2>
          </div>

          <div className="p-4 max-h-[500px] overflow-y-auto space-y-3">
            {trip.stops && trip.stops.length > 0 ? (
              trip.stops.map((stop, idx) => {
                const isParking = stop.stopType === 'PARKING_START' || stop.stopType === 'PARKING_END';
                const isSchool = stop.stopType === 'SCHOOL_ARRIVAL' || stop.stopType === 'SCHOOL_DEPARTURE';

                return (
                  <div
                    key={stop.id || idx}
                    onClick={() => {
                      setFocusPoint({ latitude: stop.latitude, longitude: stop.longitude, zoom: 16 });
                    }}
                    className="p-3 rounded-xl border border-slate-100 hover:border-primary hover:bg-amber-50/20 transition-all cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center">
                          {stop.stopOrder}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {isParking
                            ? 'Bãi xe trung tâm'
                            : isSchool
                            ? trip.schoolName
                            : stop.studentName || 'Điểm đón học sinh'}
                        </span>
                      </div>

                      {stop.plannedArrivalTime && (
                        <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          {stop.plannedArrivalTime}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 pl-7 leading-relaxed flex items-start gap-1">
                      <MapPinIcon className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                      <span>{stop.addressText}</span>
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                Không có dữ liệu điểm dừng
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Assignment Modal */}
      <TripAssignmentModal
        isOpen={isEditModalOpen}
        trip={trip}
        currentUserRole={currentUserRole}
        onClose={() => setIsEditModalOpen(false)}
        onUpdated={() => {
          loadTripDetail();
        }}
      />
    </div>
  );
}
