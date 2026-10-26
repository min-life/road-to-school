'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { RouteItem, Role } from '@/lib/types';
import {
  ArrowLeftIcon,
  SpinnerIcon,
  AlertIcon,
  RouteIcon,
  TrashIcon,
  InfoIcon,
} from '@/components/icons';
import { RouteMap, MapPoint } from '@/components/admin/routes/route-map';
import { CancelRoutePlanModal } from '@/components/admin/routes/cancel-route-plan-modal';
import { authStorage } from '@/lib/auth-storage';

export default function RouteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const routeId = params.id as string;

  const [route, setRoute] = useState<RouteItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  useEffect(() => {
    const user = authStorage.getUser();
    if (user) {
      setCurrentUserRole(user.role);
    }
  }, []);

  const fetchRouteDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getRouteDetail(routeId);
      setRoute(data);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải thông tin tuyến đường');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeId) {
      fetchRouteDetail();
    }
  }, [routeId]);

  const [focusPoint, setFocusPoint] = useState<{ latitude: number; longitude: number; zoom?: number } | null>(null);

  const parkingLocation = useMemo(() => {
    if (route?.parkingLocation) return route.parkingLocation;
    if (!route?.stops) return undefined;
    const parkingStop = route.stops.find(
      (s) => s.stopType === 'PARKING_START' || s.stopType === 'PARKING_END'
    );
    if (!parkingStop) return undefined;
    return {
      latitude: parkingStop.latitude,
      longitude: parkingStop.longitude,
      addressText: parkingStop.addressText || 'Bãi xe trung tâm',
    };
  }, [route]);

  const schoolLocation = useMemo(() => {
    if (route?.schoolLocation) return route.schoolLocation;
    if (!route?.stops) return undefined;
    const schoolStop = route.stops.find(
      (s) => s.stopType === 'SCHOOL_ARRIVAL' || s.stopType === 'SCHOOL_DEPARTURE'
    );
    if (!schoolStop) return undefined;
    return {
      latitude: schoolStop.latitude,
      longitude: schoolStop.longitude,
      name: route.schoolName || schoolStop.addressText || 'Trường học',
    };
  }, [route]);

  const mapPoints: MapPoint[] = useMemo(() => {
    if (!route || !route.stops) return [];
    return route.stops
      .filter((s) => s.stopType === 'PICKUP' || s.stopType === 'DROPOFF')
      .map((s) => ({
        id: s.id,
        latitude: s.latitude,
        longitude: s.longitude,
        title: s.studentName || 'Điểm dừng học sinh',
        subtitle: s.addressText,
        type: 'STUDENT',
        order: s.stopOrder,
        eta: s.plannedArrivalTime,
        isSelected: true,
      }));
  }, [route]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <SpinnerIcon className="w-8 h-8 animate-spin text-[#FFCB56] mb-3" />
        <p className="text-sm font-medium">Đang tải chi tiết tuyến đường...</p>
      </div>
    );
  }

  if (error || !route) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertIcon className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Không tìm thấy tuyến đường</h2>
        <p className="text-sm text-slate-500">{error}</p>
        <Link
          href="/admin/routes"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>Quay lại danh sách tuyến</span>
        </Link>
      </div>
    );
  }

  const isToSchool = route.direction === 'TO_SCHOOL';
  const isDraft = route.planStatus === 'DRAFT' || route.status === 'DRAFT';
  const isActive = route.planStatus === 'ACTIVE' || route.status === 'ACTIVE';
  const isSystemAdmin = currentUserRole === 'SYSTEM_ADMIN';
  const distanceKm = (route.totalDistanceMeters / 1000).toFixed(1);
  const durationMins = Math.round(route.estimatedDurationSeconds / 60);

  const planUrl = route.routePlanId ? `/admin/routes/plans/${route.routePlanId}` : '/admin/routes';

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link href="/admin/routes" className="hover:text-slate-800 transition-colors">
          Phương án tuyến
        </Link>
        <span>/</span>
        {route.routePlanId ? (
          <Link href={planUrl} className="hover:text-slate-800 font-medium transition-colors">
            {route.routePlanName || 'Chi tiết phương án'}
          </Link>
        ) : (
          <span>{route.routePlanName || 'Chi tiết phương án'}</span>
        )}
        <span>/</span>
        <span className="text-slate-800 font-bold">{route.name}</span>
      </div>

      {/* Top Banner Notice: RoutePlan is the unit of cancellation */}
      <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3">
        <InfoIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <strong className="font-semibold text-amber-950">Chế độ xem tuyến (Read-Only):</strong> Đây là hành trình
          chi tiết thuộc phương án{' '}
          <Link href={planUrl} className="font-bold underline text-amber-950 hover:text-amber-800">
            {route.routePlanName || 'này'}
          </Link>
          . Không thể chỉnh sửa hoặc hủy riêng lẻ từng tuyến. Mọi thao tác hủy chỉ thực hiện ở cấp độ Phương án tuyến.
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={planUrl}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            title="Quay lại Phương án tuyến"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-800">{route.name}</h1>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  isToSchool
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                {isToSchool ? 'Chiều đi: Bãi xe → Trường' : 'Chiều về: Trường → Bãi xe'}
              </span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : isDraft
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                Phương án: {isActive ? 'ACTIVE' : isDraft ? 'DRAFT' : 'CANCELLED'}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Thuộc phương án:{' '}
              <Link href={planUrl} className="font-semibold text-slate-700 hover:text-blue-600 hover:underline">
                {route.routePlanName}
              </Link>{' '}
              • Trường: <span className="font-semibold text-slate-700">{route.schoolName}</span>
            </p>
          </div>
        </div>

        {isSystemAdmin && isDraft && (
          <button
            onClick={() => setIsCancelModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors cursor-pointer shadow-xs"
          >
            <TrashIcon className="w-4 h-4 text-rose-600" />
            <span>Hủy toàn bộ phương án tuyến</span>
          </button>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Xe đề xuất (Proposed)</p>
          <p className="text-lg font-mono font-bold text-slate-800 mt-1">
            {route.proposedVehiclePlate || 'Chưa gán'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {route.proposedVehicleBrand || 'Xe dự kiến'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Số học sinh trên tuyến</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{route.studentCount} em</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Đã phân tuyến 2 chiều</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Quãng đường dự kiến</p>
          <p className="text-2xl font-black text-blue-600 mt-1">{distanceKm} km</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Theo lộ trình VietMap</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Thời gian di chuyển</p>
          <p className="text-2xl font-black text-amber-600 mt-1">~{durationMins} phút</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {route.departureTime} → {route.arrivalTime}
          </p>
        </div>
      </div>

      {/* Main Grid: Interactive Map & Stops List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Interactive Map (7 cols) */}
        <div className="lg:col-span-7 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <RouteIcon className="w-4 h-4 text-slate-500" />
              <span>Bản đồ hành trình tuyến</span>
            </h3>
            <span className="text-xs text-slate-500">
              {route.stops?.length || 0} điểm dừng dọc tuyến
            </span>
          </div>

          <RouteMap
            schoolLocation={schoolLocation}
            parkingLocation={parkingLocation}
            points={mapPoints}
            polylineGeometry={route.polylineGeometry}
            focusPoint={focusPoint}
            height="520px"
          />
        </div>

        {/* Sequential Stops Timeline (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800">Lộ trình & Thứ tự đón/trả</h3>
            <span className="text-xs font-semibold text-slate-500">
              {route.departureTime} - {route.arrivalTime}
            </span>
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {route.stops && route.stops.length > 0 ? (
              route.stops.map((stop) => {
                const isDepot = stop.stopType === 'PARKING_START' || stop.stopType === 'PARKING_END';
                const isSchool = stop.stopType === 'SCHOOL_ARRIVAL' || stop.stopType === 'SCHOOL_DEPARTURE';

                return (
                  <div
                    key={stop.id}
                    onClick={() => setFocusPoint({ latitude: stop.latitude, longitude: stop.longitude, zoom: 16 })}
                    className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/80 transition-all bg-slate-50/40 cursor-pointer"
                    title="Nhấn để định vị điểm dừng này trên bản đồ"
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                        isDepot
                          ? 'bg-blue-600 text-white'
                          : isSchool
                          ? 'bg-[#FFCB56] text-[#1E293B]'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {isDepot ? 'P' : isSchool ? 'S' : stop.stopOrder}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {isDepot
                            ? 'Bãi xe trung tâm'
                            : isSchool
                            ? 'Trường học'
                            : stop.studentName || 'Học sinh'}
                        </p>
                        <span className="font-mono text-xs font-bold text-emerald-700 ml-2">
                          {stop.plannedArrivalTime}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{stop.addressText}</p>
                      {stop.studentCode && (
                        <span className="inline-block mt-1 text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          Mã: {stop.studentCode}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">Chưa có danh sách điểm dừng</p>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Entire RoutePlan Modal */}
      {isCancelModalOpen && (
        <CancelRoutePlanModal
          isOpen={isCancelModalOpen}
          routePlanId={route.routePlanId}
          routePlanName={route.routePlanName}
          onClose={() => setIsCancelModalOpen(false)}
          onSuccess={() => {
            fetchRouteDetail();
          }}
        />
      )}
    </div>
  );
}
