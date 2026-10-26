'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  RoutePlanItem,
  RouteItem,
  Role,
  CandidateVehicleItem,
  CandidateDriverItem,
  CandidateBusAttendantItem,
} from '@/lib/types';
import { AlertIcon, InfoIcon, SpinnerIcon, BusIcon } from '@/components/icons';

interface RoutePlanAssignmentsProps {
  plan: RoutePlanItem;
  currentUserRole: Role | null;
  onUpdated: () => void;
}

interface VehicleGroup {
  vehicleId: string | null;
  vehiclePlate: string | null;
  vehicleBrand: string | null;
  vehicleSeats: number | null;
  driverId: string | null;
  driverName: string | null;
  driverPhone: string | null;
  busAttendantId: string | null;
  busAttendantName: string | null;
  busAttendantPhone: string | null;
  routes: RouteItem[];
}

export function RoutePlanAssignments({ plan, currentUserRole, onUpdated }: RoutePlanAssignmentsProps) {
  const isSystemAdmin = currentUserRole === 'SYSTEM_ADMIN';
  const isSchoolAdmin = currentUserRole === 'SCHOOL_ADMIN';
  const isActive = plan.status === 'ACTIVE';

  // Group routes by vehicleId
  const groups: VehicleGroup[] = [];
  const routes = plan.routes || [];

  for (const r of routes) {
    const vId = r.proposedVehicleId || null;
    let group = groups.find((g) => g.vehicleId === vId);
    if (!group) {
      group = {
        vehicleId: vId,
        vehiclePlate: r.proposedVehiclePlate || null,
        vehicleBrand: r.proposedVehicleBrand || null,
        vehicleSeats: r.proposedVehicleSeats || null,
        driverId: r.defaultDriverId || null,
        driverName: r.defaultDriverName || null,
        driverPhone: r.defaultDriverPhone || null,
        busAttendantId: r.defaultBusAttendantId || null,
        busAttendantName: r.defaultBusAttendantName || null,
        busAttendantPhone: r.defaultBusAttendantPhone || null,
        routes: [],
      };
      groups.push(group);
    }
    group.routes.push(r);
  }

  // Modals state
  const [modalType, setModalType] = useState<'VEHICLE' | 'DRIVER' | 'ATTENDANT' | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<VehicleGroup | null>(null);

  // Candidate options
  const [candidateVehicles, setCandidateVehicles] = useState<CandidateVehicleItem[]>([]);
  const [candidateDrivers, setCandidateDrivers] = useState<CandidateDriverItem[]>([]);
  const [candidateAttendants, setCandidateAttendants] = useState<CandidateBusAttendantItem[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Selected new resource ID
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const openModal = async (type: 'VEHICLE' | 'DRIVER' | 'ATTENDANT', group: VehicleGroup) => {
    setSelectedGroup(group);
    setModalType(type);
    setSelectedResourceId('');
    setActionError(null);
    setLoadingOptions(true);

    try {
      if (type === 'VEHICLE') {
        const res = await apiClient.getCandidateVehicles(plan.id, group.vehicleId || undefined);
        setCandidateVehicles(res.candidates || []);
      } else if (type === 'DRIVER') {
        const res = await apiClient.getCandidateDrivers(plan.id);
        setCandidateDrivers(res.candidates || []);
      } else if (type === 'ATTENDANT') {
        const res = await apiClient.getCandidateBusAttendants(plan.id);
        setCandidateAttendants(res.candidates || []);
      }
    } catch (err: any) {
      setActionError(err?.message || 'Không thể tải danh sách tài nguyên ứng viên');
    } finally {
      setLoadingOptions(false);
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedGroup(null);
    setSelectedResourceId('');
    setActionError(null);
  };

  const handleSubmit = async () => {
    if (!selectedGroup || !selectedResourceId) return;
    setSubmitting(true);
    setActionError(null);

    try {
      if (modalType === 'VEHICLE') {
        if (!selectedGroup.vehicleId) {
          throw new Error('Chưa có ID xe hiện tại để thay thế');
        }
        await apiClient.replaceVehicleGroup(plan.id, {
          currentVehicleId: selectedGroup.vehicleId,
          newVehicleId: selectedResourceId,
        });
      } else if (modalType === 'DRIVER') {
        if (!selectedGroup.vehicleId) {
          throw new Error('Cần gán xe trước khi phân công tài xế cho nhóm');
        }
        await apiClient.assignDriverGroup(plan.id, {
          vehicleId: selectedGroup.vehicleId,
          driverId: selectedResourceId,
        });
      } else if (modalType === 'ATTENDANT') {
        if (!selectedGroup.vehicleId) {
          throw new Error('Cần gán xe trước khi phân công giáo viên cho nhóm');
        }
        await apiClient.assignBusAttendantGroup(plan.id, {
          vehicleId: selectedGroup.vehicleId,
          busAttendantId: selectedResourceId,
        });
      }
      closeModal();
      onUpdated();
    } catch (err: any) {
      setActionError(err?.message || 'Không thể cập nhật phân công tài nguyên');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Notice for ACTIVE plans */}
      {isActive && (
        <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200/80 flex items-start gap-3">
          <InfoIcon className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 leading-relaxed">
            <strong className="font-semibold text-blue-950">Lưu ý phân công mặc định:</strong>{' '}
            Phương án đang hoạt động. Thay đổi phân công mặc định dưới đây chỉ áp dụng cho những chuyến xe chưa được tạo trong tương lai. Các chuyến xe đã lập lịch giữ nguyên phân công hiện tại.
          </div>
        </div>
      )}

      {/* Vehicle Groups Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <BusIcon className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-800">
              Phân công tài nguyên theo nhóm xe ({groups.length} nhóm)
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Mỗi nhóm xe vận hành đồng bộ 1 tài xế & 1 giáo viên phụ xe
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {groups.map((group, idx) => (
            <div key={idx} className="p-6 hover:bg-slate-50/40 transition-colors space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Vehicle Column */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Phương tiện (Xe)
                    </span>
                    {isSystemAdmin && (
                      <button
                        onClick={() => openModal('VEHICLE', group)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        [Đổi xe]
                      </button>
                    )}
                  </div>
                  {group.vehiclePlate ? (
                    <div>
                      <span className="text-base font-bold text-slate-900">{group.vehiclePlate}</span>
                      <span className="text-xs text-slate-500 block">
                        {group.vehicleSeats} chỗ • {group.vehicleBrand || 'Xe buýt'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-amber-600 font-semibold italic">Chưa gán xe</span>
                  )}
                </div>

                {/* Driver Column */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Tài xế phụ trách
                    </span>
                    {isSystemAdmin && group.vehicleId && (
                      <button
                        onClick={() => openModal('DRIVER', group)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        [{group.driverId ? 'Đổi tài xế' : 'Phân công'}]
                      </button>
                    )}
                  </div>
                  {group.driverName ? (
                    <div>
                      <span className="text-sm font-bold text-slate-800">{group.driverName}</span>
                      {group.driverPhone && (
                        <span className="text-xs text-slate-500 block font-mono">{group.driverPhone}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-rose-600 font-semibold italic">Chưa phân công</span>
                  )}
                </div>

                {/* Bus Attendant Column */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Giáo viên / Phụ xe
                    </span>
                    {isSchoolAdmin && group.vehicleId && (
                      <button
                        onClick={() => openModal('ATTENDANT', group)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        [{group.busAttendantId ? 'Đổi giáo viên' : 'Phân công'}]
                      </button>
                    )}
                  </div>
                  {group.busAttendantName ? (
                    <div>
                      <span className="text-sm font-bold text-slate-800">{group.busAttendantName}</span>
                      {group.busAttendantPhone && (
                        <span className="text-xs text-slate-500 block font-mono">{group.busAttendantPhone}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-rose-600 font-semibold italic">Chưa phân công</span>
                  )}
                </div>
              </div>

              {/* Routes in group */}
              <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500">Các tuyến dùng xe này:</span>
                {group.routes.map((r) => (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        r.direction === 'TO_SCHOOL' ? 'bg-emerald-500' : 'bg-sky-500'
                      }`}
                    />
                    <span>{r.name}</span>
                    <span className="text-[11px] text-slate-400">({r.studentCount} HS)</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assignment Modal */}
      {modalType && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-800">
              {modalType === 'VEHICLE' && 'Thay đổi xe cho nhóm tuyến'}
              {modalType === 'DRIVER' && 'Phân công tài xế cho nhóm xe'}
              {modalType === 'ATTENDANT' && 'Phân công giáo viên phụ xe cho nhóm'}
            </h3>

            <p className="text-xs text-slate-500">
              Nhóm xe hiện tại: <strong>{selectedGroup.vehiclePlate || 'Chưa có xe'}</strong> (gồm{' '}
              {selectedGroup.routes.length} tuyến)
            </p>

            {loadingOptions ? (
              <div className="py-8 text-center">
                <SpinnerIcon className="w-6 h-6 animate-spin text-[#FFCB56] mx-auto mb-2" />
                <span className="text-xs text-slate-500">Đang tải danh sách lựa chọn...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  {modalType === 'VEHICLE' && 'Chọn phương tiện thay thế:'}
                  {modalType === 'DRIVER' && 'Chọn tài xế phụ trách:'}
                  {modalType === 'ATTENDANT' && 'Chọn giáo viên / phụ xe:'}
                </label>

                {modalType === 'VEHICLE' && (
                  <select
                    value={selectedResourceId}
                    onChange={(e) => setSelectedResourceId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCB56]"
                  >
                    <option value="">-- Chọn xe --</option>
                    {candidateVehicles.map((v) => (
                      <option key={v.id} value={v.id} disabled={!v.isEligible}>
                        {v.licensePlate} ({v.seatCount} chỗ - {v.brand})
                        {!v.isEligible ? ` [✕ ${v.reason}]` : ` [✓ ${v.reason}]`}
                      </option>
                    ))}
                  </select>
                )}

                {modalType === 'DRIVER' && (
                  <select
                    value={selectedResourceId}
                    onChange={(e) => setSelectedResourceId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCB56]"
                  >
                    <option value="">-- Chọn tài xế --</option>
                    {candidateDrivers.map((d) => (
                      <option key={d.id} value={d.id} disabled={!d.isEligible}>
                        {d.fullName} {d.phone ? `(${d.phone})` : ''}
                        {!d.isEligible ? ` [✕ ${d.reason}]` : ` [✓ ${d.reason}]`}
                      </option>
                    ))}
                  </select>
                )}

                {modalType === 'ATTENDANT' && (
                  <select
                    value={selectedResourceId}
                    onChange={(e) => setSelectedResourceId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCB56]"
                  >
                    <option value="">-- Chọn giáo viên phụ xe --</option>
                    {candidateAttendants.map((a) => (
                      <option key={a.id} value={a.id} disabled={!a.isEligible}>
                        {a.fullName} {a.phone ? `(${a.phone})` : ''}
                        {!a.isEligible ? ` [✕ ${a.reason}]` : ` [✓ ${a.reason}]`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {actionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !selectedResourceId}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors flex items-center gap-2 ${
                  submitting || !selectedResourceId
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                }`}
              >
                {submitting && <SpinnerIcon className="w-4 h-4 animate-spin text-white" />}
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
