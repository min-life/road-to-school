'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { StudentRoutingDetail } from '@/lib/types';
import { RouteIcon, SpinnerIcon, InfoIcon, MapPinIcon } from '@/components/icons';
import { RouteMap, MapPoint } from '@/components/admin/routes/route-map';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface StudentRoutingSectionProps {
  studentId: string;
  studentName: string;
}

export function StudentRoutingSection({
  studentId,
  studentName,
}: StudentRoutingSectionProps) {
  const [detail, setDetail] = useState<StudentRoutingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDirection, setActiveDirection] = useState<'OUTBOUND' | 'RETURN'>('OUTBOUND');

  useEffect(() => {
    async function loadRouting() {
      try {
        setLoading(true);
        const data = await apiClient.getStudentRoutingDetail(studentId);
        setDetail(data);
      } catch (err) {
        console.error('Lỗi tải thông tin tuyến học sinh:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRouting();
  }, [studentId]);

  if (loading) {
    return (
      <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex items-center justify-center py-10 text-slate-400">
        <SpinnerIcon className="w-6 h-6 animate-spin text-primary mr-2" />
        <span className="text-xs">Đang kiểm tra tuyến đường đưa đón...</span>
      </Card>
    );
  }

  if (!detail || detail.routingStatus !== 'ASSIGNED_DRAFT') {
    let message = 'Học sinh chưa được phân tuyến đưa đón.';
    if (detail?.routingStatus === 'MISSING_ADDRESS') {
      message = 'Học sinh chưa cập nhật tọa độ/địa chỉ đón trả hợp lệ để phân tuyến.';
    } else if (detail?.routingStatus === 'NO_ROUTE_PLAN') {
      message = 'Trường học chưa có phương án tuyến đưa đón nào được lập.';
    } else if (detail?.routingStatus === 'NOT_ASSIGNED') {
      message = 'Học sinh chưa được phân bổ vào phương án tuyến hiện tại của trường.';
    }

    return (
      <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <RouteIcon className="w-4 h-4 text-slate-400" />
          <span>Tuyến đường đưa đón</span>
        </h2>
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
          <InfoIcon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 leading-relaxed">{message}</p>
        </div>
      </Card>
    );
  }

  const isOutbound = activeDirection === 'OUTBOUND';
  const currentRoute = isOutbound ? detail.outboundRoute : detail.returnRoute;
  const currentStudentAddress = isOutbound
    ? detail.outboundRoute?.pickupAddressText || ''
    : detail.returnRoute?.dropoffAddressText || '';
  const currentStudentLat = isOutbound
    ? detail.outboundRoute?.pickupLatitude || 0
    : detail.returnRoute?.dropoffLatitude || 0;
  const currentStudentLng = isOutbound
    ? detail.outboundRoute?.pickupLongitude || 0
    : detail.returnRoute?.dropoffLongitude || 0;

  // Student Map Privacy: Polyline is drawn, but ONLY 3 markers: Parking Lot, School, Current Student!
  const privacyPoints: MapPoint[] = currentRoute
    ? [
        {
          id: studentId,
          title: studentName,
          subtitle: currentStudentAddress,
          latitude: currentStudentLat,
          longitude: currentStudentLng,
          type: 'STUDENT',
          order: 1,
          eta: currentRoute.plannedArrivalTime,
          isSelected: true,
        },
      ]
    : [];

  return (
    <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <RouteIcon className="w-4 h-4 text-blue-600" />
              <span>Tuyến đường đưa đón</span>
            </h2>
            <Badge className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Đã phân tuyến (DRAFT)
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Phương án: <span className="font-semibold text-slate-700">{detail.routePlanName}</span> • Tuyến dự kiến — Chưa kích hoạt chuyến đi chính thức
          </p>
        </div>

        {/* Direction Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <Button
            type="button"
            onClick={() => setActiveDirection('OUTBOUND')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeDirection === 'OUTBOUND'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Chiều đi (Đón tới trường)
          </Button>
          <Button
            type="button"
            onClick={() => setActiveDirection('RETURN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeDirection === 'RETURN'
                ? 'bg-white text-amber-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Chiều về (Trả về nhà)
          </Button>
        </div>
      </div>

      {currentRoute ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Route Info Card (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {activeDirection === 'OUTBOUND' ? 'Tuyến chiều đi' : 'Tuyến chiều về'}
                </span>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{currentRoute.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 text-xs">
                <div>
                  <p className="text-[11px] text-slate-400">Xe đề xuất (Proposed)</p>
                  <p className="font-mono font-bold text-slate-800 mt-0.5">
                    {currentRoute.proposedVehiclePlate || 'Chưa gán'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">
                    {activeDirection === 'OUTBOUND' ? 'Giờ đón dự kiến' : 'Giờ trả dự kiến'}
                  </p>
                  <p className="font-mono font-bold text-emerald-700 mt-0.5">
                    {currentRoute.plannedArrivalTime}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 text-xs">
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <MapPinIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Điểm đón/trả:</span>
                </p>
                <p className="font-medium text-slate-700 mt-0.5">
                  {currentStudentAddress}
                </p>
              </div>
            </div>

            {/* Privacy Guarantee Note */}
            <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 text-[11px] text-blue-800 leading-relaxed">
              <strong className="font-semibold text-blue-950">Bảo mật vị trí cá nhân:</strong> Trên bản đồ,
              hệ thống chỉ hiển thị vị trí của học sinh hiện tại, bãi xe và trường học nhằm bảo vệ quyền riêng tư.
              Thông tin và vị trí các học sinh khác trên cùng tuyến được ẩn hoàn toàn.
            </div>
          </div>

          {/* Privacy Map (7 cols) */}
          <div className="lg:col-span-7">
            <RouteMap
              schoolLocation={currentRoute.schoolLocation}
              parkingLocation={currentRoute.parkingLocation}
              points={privacyPoints}
              polylineGeometry={currentRoute.polylineGeometry}
              height="360px"
            />
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">Chưa có thông tin chiều di chuyển này</p>
      )}
    </Card>
  );
}
