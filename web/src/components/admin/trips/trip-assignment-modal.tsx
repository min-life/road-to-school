'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { TripDetail, Vehicle, DriverItem, SchoolEmployeeItem, Role } from '@/lib/types';
import { authStorage } from '@/lib/auth-storage';
import { AlertIcon, SpinnerIcon, BusIcon } from '@/components/icons';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

interface TripAssignmentModalProps {
  isOpen: boolean;
  trip: TripDetail;
  currentUserRole?: Role | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function TripAssignmentModal({
  isOpen,
  trip,
  currentUserRole,
  onClose,
  onUpdated,
}: TripAssignmentModalProps) {
  const role = currentUserRole || authStorage.getUser()?.role;
  const isSystemAdmin = role === 'SYSTEM_ADMIN';
  const isSchoolAdmin = role === 'SCHOOL_ADMIN';

  const [baseline, setBaseline] = useState(trip);
  const stale = trip.status !== 'SCHEDULED' || [trip.vehicleId, trip.driverId, trip.busAttendantId].join() !==
    [baseline.vehicleId, baseline.driverId, baseline.busAttendantId].join();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [attendants, setAttendants] = useState<SchoolEmployeeItem[]>([]);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(trip.vehicleId || '');
  const [selectedDriverId, setSelectedDriverId] = useState<string>(trip.driverId || '');
  const [selectedAttendantId, setSelectedAttendantId] = useState<string>(trip.busAttendantId || '');

  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const displayError = stale ? 'Chuyến xe hoặc phân công đã thay đổi. Vui lòng mở lại form.' : error;

  useEffect(() => {
    let current = true;
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Snapshot the form once on open, never on polling updates.
      setBaseline(trip);
      setError(null);
      setSelectedVehicleId(trip.vehicleId || '');
      setSelectedDriverId(trip.driverId || '');
      setSelectedAttendantId(trip.busAttendantId || '');

      const loadOptions = async () => {
        try {
          setLoadingOptions(true);
          if (isSystemAdmin) {
            const [vRes, dRes] = await Promise.all([
              apiClient.listVehicles({ limit: 100 }),
              apiClient.getDrivers({ limit: 100 }),
            ]);
            if (!current) return;
            setVehicles(vRes.items || []);
            setDrivers(dRes.items || []);
          } else if (isSchoolAdmin) {
            const aRes = await apiClient.getSchoolEmployees(trip.schoolId, {
              limit: 50,
              role: 'BUS_ATTENDANT',
            });
            if (!current) return;
            setAttendants(aRes.items || []);
          }
        } catch (err: unknown) {
          if (current) setError(err instanceof Error ? err.message : 'Không thể tải danh sách tài nguyên');
        } finally {
          if (current) setLoadingOptions(false);
        }
      };
      loadOptions();
    }
    return () => { current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Capture trip only when opening/changing Trip; polling must not reset drafts.
  }, [isOpen, trip.id, isSystemAdmin, isSchoolAdmin]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (stale) { onUpdated(); return; }
    const payload: import('@/lib/types').UpdateTripAssignmentRequest = {
      expectedVehicleId: baseline.vehicleId,
      expectedDriverId: baseline.driverId,
      expectedBusAttendantId: baseline.busAttendantId,
    };

    if (isSystemAdmin) {
      if (!selectedVehicleId || !selectedDriverId) {
        setError('Vui lòng chọn đầy đủ Xe và Tài xế');
        return;
      }
      if (selectedVehicleId !== baseline.vehicleId) payload.vehicleId = selectedVehicleId;
      if (selectedDriverId !== baseline.driverId) payload.driverId = selectedDriverId;
    } else if (isSchoolAdmin) {
      if (!selectedAttendantId) {
        setError('Vui lòng chọn Giáo viên phụ xe');
        return;
      }
      if (selectedAttendantId !== baseline.busAttendantId) payload.busAttendantId = selectedAttendantId;
    } else {
      setError('Bạn không có quyền thực hiện thao tác này');
      return;
    }

    if (!payload.vehicleId && !payload.driverId && !payload.busAttendantId) { onClose(); return; }
    try {
      setSubmitting(true);
      setError(null);
      await apiClient.updateTripAssignment(trip.id, payload);
      onUpdated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật phân công chuyến xe');
      onUpdated();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <Card className="ui-dialog-panel bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <BusIcon className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-800">Điều chỉnh phân công chuyến xe</h3>
          </div>
          <Button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
          >
            ✕
          </Button>
        </div>

        <div className="text-xs text-slate-500 space-y-1">
          <p>
            Chuyến: <strong className="text-slate-700">{trip.routeName}</strong> • Ngày chạy:{' '}
            <strong className="text-slate-700">{trip.serviceDate}</strong>
          </p>
          <p className="text-amber-700 font-medium">
            * Thay đổi này chỉ áp dụng riêng cho chuyến xe này, không ảnh hưởng đến phân công mặc định của phương án tuyến cha.
          </p>
          <div className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
            {isSystemAdmin
              ? 'Phân quyền: SYSTEM_ADMIN chỉ được phân công Xe & Tài xế'
              : 'Phân quyền: SCHOOL_ADMIN chỉ được phân công Giáo viên phụ xe'}
          </div>
        </div>

        {loadingOptions ? (
          <div className="py-8 text-center">
            <SpinnerIcon className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
            <span className="text-xs text-slate-500">Đang tải danh sách tài nguyên khả dụng...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phương tiện: Editable cho SYSTEM_ADMIN, Read-only cho SCHOOL_ADMIN */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Xe đưa đón:</label>
              {isSystemAdmin ? (
                <Select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.licensePlate} ({v.seatCount} chỗ - {v.brand})
                    </option>
                  ))}
                </Select>
              ) : (
                <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 flex items-center justify-between">
                  <span>
                    {trip.vehiclePlate} ({trip.vehicleSeats} chỗ - {trip.vehicleBrand})
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Chỉ SYSTEM_ADMIN chỉnh sửa
                  </span>
                </div>
              )}
            </div>

            {/* Tài xế: Editable cho SYSTEM_ADMIN, Read-only cho SCHOOL_ADMIN */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Tài xế phụ trách:</label>
              {isSystemAdmin ? (
                <Select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} {d.phone ? `(${d.phone})` : ''}
                    </option>
                  ))}
                </Select>
              ) : (
                <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 flex items-center justify-between">
                  <span>
                    {trip.driverName} {trip.driverPhone ? `(${trip.driverPhone})` : ''}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Chỉ SYSTEM_ADMIN chỉnh sửa
                  </span>
                </div>
              )}
            </div>

            {/* Giáo viên phụ xe: Read-only cho SYSTEM_ADMIN, Editable cho SCHOOL_ADMIN */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Giáo viên phụ xe (Trường sở tại):
              </label>
              {isSchoolAdmin ? (
                <Select
                  value={selectedAttendantId}
                  onChange={(e) => setSelectedAttendantId(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {attendants.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.fullName} {a.phone ? `(${a.phone})` : ''}
                    </option>
                  ))}
                </Select>
              ) : (
                <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 flex items-center justify-between">
                  <span>
                    {trip.busAttendantName || 'Chưa phân công'}{' '}
                    {trip.busAttendantPhone ? `(${trip.busAttendantPhone})` : ''}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Chỉ SCHOOL_ADMIN chỉnh sửa
                  </span>
                </div>
              )}
            </div>

            {displayError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertIcon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{displayError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <Button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                disabled={submitting || stale}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {submitting && <SpinnerIcon className="w-4 h-4 animate-spin text-white" />}
                <span>Lưu thay đổi</span>
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
