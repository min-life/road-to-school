'use client';
import { BackLink, useBackDestination } from '@/components/admin/common/context-navigation';
import { withReturnTo } from '@/lib/back-navigation';

import { toast } from '@/stores/toast-store';

import React, { useState, useEffect, useMemo, Suspense, useCallback, memo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import {
  RoutePreparationData,
  RoutePreviewResponse,
  PreviewRoute,
  RouteConstraints,
  RouteDirection,
} from '@/lib/types';
import {
  SpinnerIcon,
  CheckIcon,
  AlertIcon,
  SearchIcon,
  InfoIcon,
  SchoolIcon,
  ClockIcon,
  TrashIcon,
} from '@/components/icons';
import { RouteMap, MapPoint } from '@/components/admin/routes/route-map';
import { RoutePlanningWorkspace, PlanningTabs } from '@/components/admin/routes/route-planning-workspace';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/auth-provider';
import { useShallow } from 'zustand/react/shallow';
import { RoutePlanDraftProvider, useRoutePlanDraft } from '@/components/admin/routes/route-plan-draft-provider';

const DraftRouteMap = memo(RouteMap);

function CreateRoutePlanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const schoolId = searchParams.get('schoolId');
  const backDestination = useBackDestination('/admin/routes');

  const [setupTab, setSetupTab] = useState<'STUDENTS' | 'VEHICLES'>('STUDENTS');
  const [studentMapSnapshot, setStudentMapSnapshot] = useState<{ route: PreviewRoute | undefined; points: MapPoint[] } | null>(null);

  // Preparation Data
  const [prepData, setPrepData] = useState<RoutePreparationData | null>(null);
  const [loadingPrep, setLoadingPrep] = useState(true);
  const [prepError, setPrepError] = useState<string | null>(null);

  // Form selections
  const { selectedStudentIds, setSelectedStudentIds } = useRoutePlanDraft(useShallow(state => ({ selectedStudentIds: state.selectedStudentIds, setSelectedStudentIds: state.setSelectedStudentIds })));
  const { selectedVehicleIds, setSelectedVehicleIds } = useRoutePlanDraft(useShallow(state => ({ selectedVehicleIds: state.selectedVehicleIds, setSelectedVehicleIds: state.setSelectedVehicleIds })));
  const { studentSearch, setStudentSearch } = useRoutePlanDraft(useShallow(state => ({ studentSearch: state.studentSearch, setStudentSearch: state.setStudentSearch })));
  const { studentPickerTab, setStudentPickerTab } = useRoutePlanDraft(useShallow(state => ({ studentPickerTab: state.studentPickerTab, setStudentPickerTab: state.setStudentPickerTab })));
  const { vehiclePickerTab, setVehiclePickerTab } = useRoutePlanDraft(useShallow(state => ({ vehiclePickerTab: state.vehiclePickerTab, setVehiclePickerTab: state.setVehiclePickerTab })));
  const { vehicleSearch, setVehicleSearch } = useRoutePlanDraft(useShallow(state => ({ vehicleSearch: state.vehicleSearch, setVehicleSearch: state.setVehicleSearch })));

  // Editable Time Constraints (PO decisions: max duration & stop service duration)
  const { maxRouteDurationMinutes, setMaxRouteDurationMinutes } = useRoutePlanDraft(useShallow(state => ({ maxRouteDurationMinutes: state.maxRouteDurationMinutes, setMaxRouteDurationMinutes: state.setMaxRouteDurationMinutes })));
  const { defaultStopServiceSeconds, setDefaultStopServiceSeconds } = useRoutePlanDraft(useShallow(state => ({ defaultStopServiceSeconds: state.defaultStopServiceSeconds, setDefaultStopServiceSeconds: state.setDefaultStopServiceSeconds })));
  const { stopServiceOverrides, setStopServiceOverrides } = useRoutePlanDraft(useShallow(state => ({ stopServiceOverrides: state.stopServiceOverrides, setStopServiceOverrides: state.setStopServiceOverrides })));
  const { showOverridesAccordion, setShowOverridesAccordion } = useRoutePlanDraft(useShallow(state => ({ showOverridesAccordion: state.showOverridesAccordion, setShowOverridesAccordion: state.setShowOverridesAccordion })));

  // Map camera focus
  const { focusPoint, setFocusPoint } = useRoutePlanDraft(useShallow(state => ({ focusPoint: state.focusPoint, setFocusPoint: state.setFocusPoint })));

  // Preview State
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<RoutePreviewResponse | null>(null);
  const { activePreviewTab, setActivePreviewTab } = useRoutePlanDraft(useShallow(state => ({ activePreviewTab: state.activePreviewTab, setActivePreviewTab: state.setActivePreviewTab })));
  const { activeRouteIndex, setActiveRouteIndex } = useRoutePlanDraft(useShallow(state => ({ activeRouteIndex: state.activeRouteIndex, setActiveRouteIndex: state.setActiveRouteIndex })));
  const [isConfirming, setIsConfirming] = useState(false);
  const [cancellingReturnIndex, setCancellingReturnIndex] = useState<number | null>(null);

  const handleMapPointClick = useCallback((pt: MapPoint) => {
    setFocusPoint({ latitude: pt.latitude, longitude: pt.longitude, zoom: 16 });
  }, [setFocusPoint]);

  // 1. Fetch Preparation Data
  const loadData = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoadingPrep(true);
      setPrepError(null);
      const data = await apiClient.getRoutePreparationData(schoolId);
      setPrepData(data);

      // Default: select ALL eligible students (Section 7.1)
      const allIds = new Set(data.eligibleStudents.map((s) => s.id));
      setSelectedStudentIds(allIds);

      // Ensure no unavailable vehicle remains selected
      setSelectedVehicleIds((prev) => {
        const availableSet = new Set(data.availableVehicles.map((v) => v.id));
        const next = new Set<string>();
        for (const id of prev) {
          if (availableSet.has(id)) {
            next.add(id);
          }
        }
        return next;
      });
    } catch (err: any) {
      setPrepError(err?.message || 'Không thể tải dữ liệu chuẩn bị lập tuyến.');
    } finally {
      setLoadingPrep(false);
    }
  }, [schoolId, setSelectedStudentIds, setSelectedVehicleIds]);

  useEffect(() => {
    if (!schoolId) {
      setPrepError('Thiếu thông tin trường học. Vui lòng chọn trường trước.');
      setLoadingPrep(false);
      return;
    }
    loadData();
  }, [schoolId, loadData]);

  // Capacity Pre-check (Section 9.2)
  const totalSelectedSeats = useMemo(() => {
    if (!prepData) return 0;
    return prepData.availableVehicles
      .filter((v) => selectedVehicleIds.has(v.id))
      .reduce((sum, v) => sum + v.seatCount, 0);
  }, [prepData, selectedVehicleIds]);

  const selectedStudentsCount = selectedStudentIds.size;
  const isCapacitySufficient = totalSelectedSeats >= selectedStudentsCount && selectedStudentsCount > 0;
  const missingSeats = Math.max(0, selectedStudentsCount - totalSelectedSeats);

  // Filtered Students for Picker
  const filteredStudents = useMemo(() => {
    if (!prepData) return [];
    if (!studentSearch.trim()) return prepData.eligibleStudents;
    const q = studentSearch.toLowerCase();
    return prepData.eligibleStudents.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.addressText.toLowerCase().includes(q),
    );
  }, [prepData, studentSearch]);

  const filteredIneligibleStudents = useMemo(() => {
    if (!prepData || !prepData.ineligibleStudents) return [];
    if (!studentSearch.trim()) return prepData.ineligibleStudents;
    const q = studentSearch.toLowerCase();
    return prepData.ineligibleStudents.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.addressText && s.addressText.toLowerCase().includes(q)) ||
        s.reasonMessage.toLowerCase().includes(q),
    );
  }, [prepData, studentSearch]);

  // Toggle student selection (pure toggle, does not focus map)
  const handleToggleStudent = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllStudents = () => {
    if (!prepData) return;
    setSelectedStudentIds(new Set(prepData.eligibleStudents.map((s) => s.id)));
  };

  const handleDeselectAllStudents = () => {
    setSelectedStudentIds(new Set());
  };

  // Toggle vehicle selection
  const handleToggleVehicle = (id: string) => {
    setSelectedVehicleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVehicles = () => {
    if (!prepData) return;
    setSelectedVehicleIds(new Set(prepData.availableVehicles.map((v) => v.id)));
  };

  const handleDeselectAllVehicles = () => {
    setSelectedVehicleIds(new Set());
  };

  // Filtered Vehicles
  const filteredAvailableVehicles = useMemo(() => {
    if (!prepData) return [];
    if (!vehicleSearch.trim()) return prepData.availableVehicles;
    const q = vehicleSearch.toLowerCase();
    return prepData.availableVehicles.filter(
      (v) =>
        v.licensePlate.toLowerCase().includes(q) ||
        v.brand.toLowerCase().includes(q) ||
        v.color.toLowerCase().includes(q),
    );
  }, [prepData, vehicleSearch]);

  const filteredUnavailableVehicles = useMemo(() => {
    if (!prepData || !prepData.unavailableVehicles) return [];
    if (!vehicleSearch.trim()) return prepData.unavailableVehicles;
    const q = vehicleSearch.toLowerCase();
    return prepData.unavailableVehicles.filter(
      (v) =>
        v.licensePlate.toLowerCase().includes(q) ||
        v.brand.toLowerCase().includes(q) ||
        v.color.toLowerCase().includes(q) ||
        v.reasonMessage.toLowerCase().includes(q),
    );
  }, [prepData, vehicleSearch]);

  // Per-student service override handlers
  const handleSetStudentOverride = (
    studentId: string,
    serviceSeconds: number,
    direction?: RouteDirection,
  ) => {
    setStopServiceOverrides((prev) => {
      const filtered = prev.filter(
        (o) => !(o.studentId === studentId && (direction ? o.direction === direction : !o.direction)),
      );
      if (serviceSeconds !== defaultStopServiceSeconds) {
        return [...filtered, { studentId, serviceSeconds, direction }];
      }
      return filtered;
    });
  };

  const handleResetOverrides = () => {
    setStopServiceOverrides([]);
  };

  // Trigger VRP Optimization
  const handleRunOptimization = async () => {
    if (!prepData || !schoolId) return;
    if (selectedStudentsCount === 0) {
      setOptimizeError('Vui lòng chọn ít nhất 1 học sinh');
      return;
    }
    if (selectedVehicleIds.size === 0) {
      setOptimizeError('Vui lòng chọn ít nhất 1 phương tiện');
      return;
    }

    try {
      setIsOptimizing(true);
      setOptimizeError(null);

      // Clean overrides to only reference selected students
      const cleanOverrides = stopServiceOverrides.filter((o) => selectedStudentIds.has(o.studentId));

      const res = await apiClient.optimizeRoutePreview({
        schoolId,
        studentIds: Array.from(selectedStudentIds),
        vehicleIds: Array.from(selectedVehicleIds),
        constraints: {
          maxRouteDurationMinutes: maxRouteDurationMinutes || undefined,
          defaultStopServiceSeconds,
          stopServiceOverrides: cleanOverrides.length > 0 ? cleanOverrides : undefined,
        },
      });

      setPreviewResult(res);
      setActivePreviewTab('OUTBOUND');
      setActiveRouteIndex(0);
    } catch (err: any) {
      setOptimizeError(err?.message || 'Lỗi khi gọi thuật toán tối ưu VietMap VRP. Vui lòng thử lại.');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Cancel Individual Return Route in Preview (Section 14.3)
  const handleCancelReturnRoute = async (index: number) => {
    if (!previewResult) return;
    const confirmed = window.confirm(
      'Bạn có chắc chắn muốn hủy tuyến về này? Các học sinh trên tuyến này sẽ bị loại khỏi tuyến đi tương ứng và các tuyến đi liên quan sẽ được tự động tính toán lại.',
    );
    if (!confirmed) return;

    try {
      setCancellingReturnIndex(index);
      setOptimizeError(null);
      const updated = await apiClient.cancelReturnRoute(previewResult.previewToken, index);
      toast.info('Đã bỏ tuyến chiều về khỏi bản xem trước.');
      setPreviewResult(updated);
      setActiveRouteIndex(0);
    } catch (err: any) {
      setOptimizeError(err?.message || 'Không thể hủy tuyến về này');
    } finally {
      setCancellingReturnIndex(null);
    }
  };

  // Cancel All & Recreate (Section 15)
  const handleCancelAllAndRecreate = () => {
    const confirmed = window.confirm(
      'Hủy kết quả xem trước? Cấu hình học sinh, xe và ràng buộc sẽ được giữ nguyên để bạn tinh chỉnh.',
    );
    if (!confirmed) return;
    setPreviewResult(null);
    setOptimizeError(null);
  };

  // Confirm RoutePlan (Section 16)
  const handleConfirmRoutePlan = async () => {
    if (!previewResult) return;
    const confirmed = window.confirm(
      `Xác nhận lưu toàn bộ phương án tuyến DRAFT (${previewResult.outboundRoutes.length} tuyến đi, ${previewResult.returnRoutes.length} tuyến về)? Sau khi xác nhận, toàn bộ phương án chỉ có thể hủy cùng nhau.`,
    );
    if (!confirmed) return;

    try {
      setIsConfirming(true);
      setOptimizeError(null);
      const confirmedPlan = await apiClient.confirmRoutePlan({
        previewToken: previewResult.previewToken,
      });
      toast.success('Đã tạo phương án tuyến.');
      if (confirmedPlan?.id) {
        router.push(withReturnTo(`/admin/routes/plans/${confirmedPlan.id}`, backDestination.href));
      } else {
        router.push('/admin/routes');
      }
    } catch (err: any) {
      setOptimizeError(err?.message || 'Lỗi khi xác nhận lưu phương án tuyến');
      setIsConfirming(false);
    }
  };

  // Map Points for initial setup: SELECTED STUDENTS ONLY (RM-003 Section 4.2)
  const initialMapPoints: MapPoint[] = useMemo(() => {
    if (!prepData) return [];
    return prepData.eligibleStudents
      .filter((s) => selectedStudentIds.has(s.id))
      .map((s) => ({
        id: s.id,
        title: s.fullName,
        subtitle: s.addressText,
        latitude: s.latitude,
        longitude: s.longitude,
        type: 'STUDENT',
        isSelected: true,
      }));
  }, [prepData, selectedStudentIds]);

  // Map Points for Preview state
  const activePreviewRoute: PreviewRoute | undefined = useMemo(() => {
    if (!previewResult) return undefined;
    const routes = activePreviewTab === 'RETURN' ? previewResult.returnRoutes : previewResult.outboundRoutes;
    return routes[activeRouteIndex] || routes[0];
  }, [previewResult, activePreviewTab, activeRouteIndex]);

  const previewMapPoints: MapPoint[] = useMemo(() => {
    if (!activePreviewRoute) return [];
    return activePreviewRoute.stops
      .filter((st) => st.type === 'PICKUP' || st.type === 'DROPOFF' || st.stopType === 'PICKUP' || st.stopType === 'DROPOFF')
      .map((st) => ({
        id: st.studentId || `stop-${st.stopOrder}`,
        title: st.studentName || 'Điểm đón/trả',
        subtitle: st.addressText,
        latitude: st.latitude,
        longitude: st.longitude,
        type: 'STUDENT',
        order: st.stopOrder,
        eta: st.plannedArrivalTime,
        isSelected: true,
      }));
  }, [activePreviewRoute]);

  // Memoized School Location & Parking Location
  const schoolLocation = useMemo(() => {
    if (!prepData) return undefined;
    return {
      latitude: prepData.school.latitude,
      longitude: prepData.school.longitude,
      name: prepData.school.name,
    };
  }, [prepData?.school.latitude, prepData?.school.longitude, prepData?.school.name]);

  const parkingLocation = useMemo(() => {
    if (!prepData) return undefined;
    return prepData.parkingLot;
  }, [prepData?.parkingLot]);

  if (loadingPrep) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <SpinnerIcon className="w-9 h-9 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium">Đang chuẩn bị dữ liệu trường học và học sinh...</p>
      </div>
    );
  }

  if (prepError || !prepData) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertIcon className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Không thể bắt đầu lập tuyến</h2>
        <p className="text-sm text-slate-500">{prepError}</p>
        <BackLink fallback="/admin/routes" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors" />
      </div>
    );
  }

  // School Schedule summary string
  const weeklySchedule = prepData.school.weeklySchedule as Record<string, { start?: string; end?: string }> | null;
  const scheduleEntries = weeklySchedule
    ? Object.entries(weeklySchedule).filter(([_, v]) => v && v.start && v.end)
    : [];

  const visibleMapRoute = activePreviewTab === 'STUDENTS' ? studentMapSnapshot?.route : activePreviewRoute;
  const visibleMapPoints = activePreviewTab === 'STUDENTS' ? (studentMapSnapshot?.points ?? previewMapPoints) : previewMapPoints;

  return (
    <div className="route-planning-page">
      <PageHeader className="flex flex-col items-start gap-2">
        <BackLink fallback="/admin/routes" className="text-sm text-slate-500" />
        <h1 className="text-2xl font-bold">Lập phương án tuyến</h1>
      </PageHeader>
            {optimizeError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertIcon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800 leading-relaxed font-medium">
              {optimizeError}
            </div>
          </div>
          <Button
            type="button"
            onClick={loadData}
            className="shrink-0 px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 transition-colors cursor-pointer"
          >
            Tải lại dữ liệu
          </Button>
        </div>
      )}


      <RoutePlanningWorkspace preview={Boolean(previewResult)}
        configuration={!previewResult ? (<Card className="route-workspace-config route-workspace-config-form">
              <div className="route-workspace-schedule">
                <span className="flex items-center gap-2"><ClockIcon className="w-4 h-4" />Lịch học</span>
                {scheduleEntries.length > 0 && (
                  <strong>{scheduleEntries[0][1].start}–{scheduleEntries[0][1].end}</strong>
                )}
                <details className="route-workspace-schedule-info">
                  <summary aria-label="Thông tin lịch học"><InfoIcon className="w-4 h-4" /></summary>
                  <p>Giờ đón/trả được tính từ lịch học của trường. Lộ trình dùng chung cho các ngày học trong tuần.</p>
                </details>
              </div>
              <div className="route-workspace-config-fields">
                {/* Max Route Duration */}
                <div>
                  <label htmlFor="route-max-duration" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Thời gian tối đa mỗi tuyến
                  </label>
                  <div className="route-workspace-number-field">
                  <Input
                    id="route-max-duration"
                    aria-describedby="route-max-duration-help"
                    type="number"
                    min={15}
                    max={240}
                    value={maxRouteDurationMinutes ?? ''}
                    onChange={(e) =>
                      setMaxRouteDurationMinutes(
                        e.target.value ? parseInt(e.target.value, 10) : undefined,
                      )
                    }
                    placeholder="Không giới hạn"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-primary"
                  />
                  <span>phút</span>
                  </div>
                  <p id="route-max-duration-help" className="text-[11px] text-slate-500 mt-1">
                    Bao gồm di chuyển và dừng đón/trả.
                  </p>
                </div>

                {/* Default Stop Service Seconds */}
                <div>
                  <label htmlFor="route-default-stop" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Thời gian dừng mỗi điểm
                  </label>
                  <div className="route-workspace-number-field">
                  <Input
                    id="route-default-stop"
                    type="number"
                    min={10}
                    max={600}
                    step={5}
                    value={defaultStopServiceSeconds}
                    onChange={(e) =>
                      setDefaultStopServiceSeconds(
                        Math.max(10, Math.min(600, parseInt(e.target.value, 10) || 60)),
                      )
                    }
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-primary"
                  />
                  <span>giây</span>
                  </div>
                </div>
              </div>

              {/* Per-Stop Service Overrides Accordion */}
              <div className="border border-slate-200 rounded-xl overflow-hidden mt-2">
                <Button
                  type="button"
                  aria-expanded={showOverridesAccordion}
                  aria-controls="route-student-overrides"
                  onClick={() => setShowOverridesAccordion((prev) => !prev)}
                  className="route-workspace-overrides-toggle"
                >
                  <span>
                    Tùy chỉnh theo học sinh
                    {stopServiceOverrides.length > 0 && (
                      <Badge className="ml-2 px-2 py-0.5 rounded-full bg-primary text-foreground text-[10px]">
                        {stopServiceOverrides.length}
                      </Badge>
                    )}
                  </span>
                  <span aria-hidden="true">{showOverridesAccordion ? '−' : '+'}</span>
                </Button>

                {showOverridesAccordion && (
                  <div id="route-student-overrides" className="p-3 space-y-3 bg-white">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500">
                        Thời gian dừng riêng (giây).
                      </p>
                      {stopServiceOverrides.length > 0 && (
                        <Button
                          type="button"
                          onClick={handleResetOverrides}
                          className="text-xs text-rose-600 hover:underline font-medium cursor-pointer"
                        >
                          Đặt lại
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2  pr-1">
                      {prepData.eligibleStudents
                        .filter((s) => selectedStudentIds.has(s.id))
                        .map((s) => {
                          const override = stopServiceOverrides.find((o) => o.studentId === s.id);
                          const currentSeconds = override ? override.serviceSeconds : defaultStopServiceSeconds;

                          return (
                            <div
                              key={s.id}
                              className="flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:bg-slate-50/50 text-xs"
                            >
                              <div className="min-w-0 flex-1 mr-3">
                                <p className="font-semibold text-slate-800 truncate">{s.fullName}</p>
                                <p className="text-[11px] text-slate-400 truncate">{s.addressText}</p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <Input
                                  aria-label={`Thời gian dừng của ${s.fullName} (giây)`}
                                  type="number"
                                  min={10}
                                  max={600}
                                  step={5}
                                  value={currentSeconds}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10) || defaultStopServiceSeconds;
                                    handleSetStudentOverride(s.id, val);
                                  }}
                                  className="w-16 px-2 py-1 text-center font-mono text-xs rounded-lg border border-slate-200"
                                />
                                <span className="text-[11px] text-slate-500">giây</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </Card>) : undefined}
        map={<DraftRouteMap schoolLocation={schoolLocation} parkingLocation={parkingLocation}
          points={previewResult ? visibleMapPoints : initialMapPoints}
          polylineGeometry={previewResult ? visibleMapRoute?.polylineGeometry : undefined}
          focusPoint={focusPoint} onPointClick={handleMapPointClick} height="100%" />}
        panel={previewResult ? <>
          <div className="route-workspace-summary" aria-live="polite">
            <strong>{previewResult.summary.assignedBothWaysCount}/{previewResult.summary.totalSelectedStudents} học sinh đủ hai chiều</strong>
            <span>{previewResult.summary.unassignedCount} chưa xếp đủ</span>
            <span>{Math.round((previewResult.summary.coverageRate ?? (previewResult.summary.assignedBothWaysCount / previewResult.summary.totalSelectedStudents)) * 100)}% bao phủ</span>
          </div>
          <PlanningTabs value={activePreviewTab} tabs={[
            {value: 'OUTBOUND', label: `Chiều đi (${previewResult.outboundRoutes.length})`},
            {value: 'RETURN', label: `Chiều về (${previewResult.returnRoutes.length})`},
            {value: 'STUDENTS', label: 'Học sinh'},
          ]} onChange={tab => {
            if (tab === 'STUDENTS') {
              if (activePreviewTab !== 'STUDENTS') setStudentMapSnapshot({route: activePreviewRoute, points: previewMapPoints});
              setActivePreviewTab('STUDENTS');
            } else { setActivePreviewTab(tab); setActiveRouteIndex(0); }
          }} />
          <div className="route-workspace-content" role="tabpanel" id={`planning-panel-${activePreviewTab}`} aria-labelledby={`planning-tab-${activePreviewTab}`} tabIndex={0}>
            {activePreviewTab === 'STUDENTS' ? (<Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>Học sinh được phân tuyến thành công (Đủ cả 2 chiều): {previewResult.summary.assignedBothWaysCount} em</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {previewResult.outboundRoutes.flatMap((r) =>
                    r.students.map((s) => (
                      <div key={s.id} className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/20 text-xs">
                        <p className="font-bold text-slate-800">{s.fullName}</p>
                        <p className="text-slate-500 truncate mt-0.5">{s.addressText}</p>
                        <p className="text-[11px] text-emerald-700 font-semibold mt-1">Tuyến: {r.name}</p>
                      </div>
                    )),
                  )}
                </div>
              </div>

              {previewResult.summary.unassignedStudents.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span>Học sinh chưa thể phân tuyến: {previewResult.summary.unassignedStudents.length} em</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {previewResult.summary.unassignedStudents.map((s) => (
                      <div key={s.id} className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-800">{s.fullName}</p>
                          {s.missingDirection && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                              {s.missingDirection === 'RETURN' && 'Chỉ có tuyến đi (thiếu về)'}
                              {s.missingDirection === 'OUTBOUND' && 'Chỉ có tuyến về (thiếu đi)'}
                              {s.missingDirection === 'BOTH' && 'Không xếp được 2 chiều'}
                            </span>
                          )}
                        </div>
                        {s.addressText && <p className="text-slate-500 truncate">{s.addressText}</p>}
                        <p className="text-amber-800 font-medium">Lý do: {s.reason || 'Vượt quá ràng buộc xe/thời gian'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>) : activePreviewRoute ? (<>
                            {/* Route Selector & Info (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                {/* Routes Selector List */}
                <div className="space-y-2">
                  {(activePreviewTab === 'RETURN'
                    ? previewResult.returnRoutes
                    : previewResult.outboundRoutes
                  ).map((route, idx) => {
                    const isSelected = activeRouteIndex === idx;
                    const distanceKm = (route.totalDistanceMeters / 1000).toFixed(1);
                    const durationMins = Math.round(route.estimatedDurationSeconds / 60);

                    return (
                      <div
                        key={route.proposedVehiclePlate + idx}
                        onClick={() => setActiveRouteIndex(idx)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? activePreviewTab === 'RETURN'
                              ? 'border-amber-400 bg-amber-50/40 ring-1 ring-amber-400'
                              : 'border-blue-400 bg-blue-50/40 ring-1 ring-blue-400'
                            : 'border-slate-200 bg-white hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-800">{route.name}</p>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            {route.proposedVehiclePlate}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                          <span>
                            {route.studentCount} / {route.proposedVehicleSeatCount || route.seatCount} chỗ
                          </span>
                          <span>
                            {distanceKm} km • Tổng ~{durationMins} phút
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 mt-1">
                          Lộ trình chuẩn: {route.departureTime} → {route.arrivalTime}
                        </p>

                        {/* Derived Weekly Schedule Chip */}
                        {route.derivedWeeklySchedule && Object.keys(route.derivedWeeklySchedule).length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-100/80 flex flex-wrap gap-1">
                            {Object.entries(route.derivedWeeklySchedule).map(([day, sched]) => (
                              <span
                                key={day}
                                className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                              >
                                {day.substring(0, 3)}: {sched.departureTime} - {sched.arrivalTime}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Return Route Individual Cancellation (Section 14.3) */}
                        {activePreviewTab === 'RETURN' && (
                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end">
                            <Button
                              disabled={cancellingReturnIndex === idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelReturnRoute(idx);
                              }}
                              className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1.5 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                            >
                              {cancellingReturnIndex === idx ? (
                                <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <TrashIcon className="w-3.5 h-3.5" />
                              )}
                              <span>Hủy tuyến về này</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Stops Sequence for Active Route with Normalized Elapsed Time */}
                <Card className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Thứ tự điểm dừng ({activePreviewRoute.stops.length} điểm)
                  </h4>
                  <div className="space-y-2  pr-1">
                    {activePreviewRoute.stops.map((stop) => {
                      const isDepot =
                        stop.type === 'PARKING_START' ||
                        stop.type === 'PARKING_END' ||
                        stop.stopType === 'PARKING_START' ||
                        stop.stopType === 'PARKING_END';
                      const isSchool =
                        stop.type === 'SCHOOL_ARRIVAL' ||
                        stop.type === 'SCHOOL_DEPARTURE' ||
                        stop.stopType === 'SCHOOL_ARRIVAL' ||
                        stop.stopType === 'SCHOOL_DEPARTURE';

                      const elapsedMins = Math.round((stop.elapsedArrivalSeconds || 0) / 60);

                      return (
                        <div
                          key={stop.stopOrder}
                          onClick={() => {
                            if (stop.latitude && stop.longitude) {
                              setFocusPoint({ latitude: stop.latitude, longitude: stop.longitude, zoom: 16 });
                            }
                          }}
                          className="flex items-start gap-2.5 p-2 rounded-xl border border-slate-100 hover:bg-slate-50/70 cursor-pointer text-xs transition-colors"
                        >
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${
                              isDepot
                                ? 'bg-blue-600 text-white'
                                : isSchool
                                ? 'bg-primary text-foreground'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {isDepot ? 'P' : isSchool ? 'S' : stop.stopOrder}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-slate-800 truncate">
                                {stop.studentName || stop.addressText}
                              </p>
                              <div className="flex items-center gap-1.5 ml-2">
                                <span className="font-mono text-emerald-700 font-bold">
                                  {stop.plannedArrivalTime}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  (+{elapsedMins}p)
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
                              <p className="truncate mr-2">{stop.addressText}</p>
                              {stop.serviceDurationSeconds && !isDepot && !isSchool ? (
                                <span className="text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded shrink-0">
                                  Dừng {stop.serviceDurationSeconds}s
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>


            </>) : <p className="route-workspace-empty">Không có tuyến ở chiều này.</p>}
          </div>
        </> : <>
          <div className="route-workspace-summary" aria-live="polite">
            <strong>{selectedStudentsCount} học sinh · {selectedVehicleIds.size} xe</strong>
            <span>{totalSelectedSeats} chỗ</span>
            {selectedVehicleIds.size === 0 ? <span>Chọn xe tham gia</span> : <span className={isCapacitySufficient ? 'text-emerald-700' : 'text-amber-700'}>{isCapacitySufficient ? 'Đủ sức chứa' : `Thiếu ${Math.max(0, selectedStudentsCount - totalSelectedSeats)} chỗ`}</span>}
          </div>
          <PlanningTabs value={setupTab} tabs={[
            {value: 'STUDENTS', label: `Học sinh (${selectedStudentsCount})`},
            {value: 'VEHICLES', label: `Xe (${selectedVehicleIds.size})`},
          ]} onChange={tab => setSetupTab(tab)} />
          <div className="route-workspace-content route-workspace-selection" hidden={setupTab !== 'STUDENTS'} role="tabpanel" id="planning-panel-STUDENTS" aria-labelledby="planning-tab-STUDENTS" tabIndex={0}><Card className="route-workspace-picker space-y-4">
              <div className="flex items-center justify-between">
                {studentPickerTab === 'ELIGIBLE' && (
                  <div className="flex items-center gap-2 text-xs">
                    <Button
                      onClick={handleSelectAllStudents}
                      className="text-blue-600 hover:underline cursor-pointer font-medium"
                    >
                      Chọn tất cả
                    </Button>
                    <span className="text-slate-300">•</span>
                    <Button
                      onClick={handleDeselectAllStudents}
                      className="text-slate-500 hover:underline cursor-pointer font-medium"
                    >
                      Bỏ chọn hết
                    </Button>
                  </div>
                )}
              </div>

              {/* Segmented Control: Eligible vs Ineligible */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                <Button
                  type="button"
                  onClick={() => setStudentPickerTab('ELIGIBLE')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    studentPickerTab === 'ELIGIBLE'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Đủ điều kiện ({prepData.eligibleStudents.length})
                </Button>
                <Button
                  type="button"
                  onClick={() => setStudentPickerTab('INELIGIBLE')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    studentPickerTab === 'INELIGIBLE'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Chưa đủ điều kiện ({prepData.ineligibleStudents?.length || 0})
                </Button>
              </div>

              {/* Student Search */}
              <div className="relative">
                <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Tìm học sinh theo tên, mã..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-primary"
                />
              </div>

              {/* Student List */}
              {studentPickerTab === 'ELIGIBLE' ? (
                <div className="space-y-1.5  pr-1">
                  {filteredStudents.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">Không tìm thấy học sinh</p>
                  ) : (
                    filteredStudents.map((s) => {
                      const isChecked = selectedStudentIds.has(s.id);
                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            if (s.latitude && s.longitude) {
                              setFocusPoint({ latitude: s.latitude, longitude: s.longitude, zoom: 16 });
                            }
                          }}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isChecked
                              ? 'border-emerald-200 bg-emerald-50/30'
                              : 'border-slate-100 opacity-60 hover:opacity-100 bg-slate-50/50'
                          }`}
                        >
                          <Input
                            type="checkbox"
                            checked={isChecked}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => handleToggleStudent(s.id)}
                            className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-slate-800 truncate">{s.fullName}</p>
                              <span className="text-[10px] font-mono text-slate-400">{s.code}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">{s.addressText}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="space-y-2  pr-1">
                  {filteredIneligibleStudents.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">Không có học sinh nào</p>
                  ) : (
                    filteredIneligibleStudents.map((s) => (
                      <div
                        key={s.id}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-xs opacity-80 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-700">{s.fullName}</p>
                          <span className="text-[10px] font-mono text-slate-400">{s.code}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{s.addressText || 'Chưa cập nhật địa chỉ'}</p>
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                            {s.reasonCode === 'INACTIVE_STATUS' && 'Vô hiệu hóa'}
                            {s.reasonCode === 'MISSING_COORDINATES' && 'Thiếu tọa độ'}
                            {s.reasonCode === 'ALREADY_ASSIGNED' && 'Đã có tuyến'}
                            {!['INACTIVE_STATUS', 'MISSING_COORDINATES', 'ALREADY_ASSIGNED'].includes(s.reasonCode) && s.reasonCode}
                          </span>
                          <span className="text-[11px] text-slate-600 truncate">{s.reasonMessage}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </Card></div>
          <div className="route-workspace-content route-workspace-selection" hidden={setupTab !== 'VEHICLES'} role="tabpanel" id="planning-panel-VEHICLES" aria-labelledby="planning-tab-VEHICLES" tabIndex={0}><Card className="route-workspace-picker space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {vehiclePickerTab === 'AVAILABLE' && (
                    <div className="flex items-center gap-2 text-xs">
                      <Button
                        type="button"
                        onClick={handleSelectAllVehicles}
                        className="text-blue-600 hover:underline cursor-pointer font-medium"
                      >
                        Chọn tất cả
                      </Button>
                      <span className="text-slate-300">•</span>
                      <Button
                        type="button"
                        onClick={handleDeselectAllVehicles}
                        className="text-slate-500 hover:underline cursor-pointer font-medium"
                      >
                        Bỏ chọn
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Segmented Control: Available vs Unavailable */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                <Button
                  type="button"
                  onClick={() => setVehiclePickerTab('AVAILABLE')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    vehiclePickerTab === 'AVAILABLE'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Xe khả dụng ({prepData.availableVehicles.length})
                </Button>
                <Button
                  type="button"
                  onClick={() => setVehiclePickerTab('UNAVAILABLE')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    vehiclePickerTab === 'UNAVAILABLE'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Không khả dụng ({prepData.unavailableVehicles?.length || 0})
                </Button>
              </div>

              {/* Search Vehicles */}
              <div className="relative">
                <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder={
                    vehiclePickerTab === 'AVAILABLE'
                      ? 'Tìm theo biển số, dòng xe...'
                      : 'Tìm theo biển số, lý do...'
                  }
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-primary"
                />
              </div>

              {/* Capacity details supplement the always-visible count above. */}
              {vehiclePickerTab === 'AVAILABLE' && (
                <p className={`text-xs leading-relaxed ${isCapacitySufficient ? 'text-emerald-700' : 'text-amber-800'}`}>
                  {isCapacitySufficient
                    ? 'Đủ chỗ ngồi dự kiến.'
                    : `Thiếu ${missingSeats} chỗ. Có thể tối ưu một phần học sinh.`}
                </p>
              )}

              {/* TAB 1: Available Vehicles List */}
              {vehiclePickerTab === 'AVAILABLE' && (
                <div className="space-y-2  pr-1">
                  {filteredAvailableVehicles.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center italic">
                      {vehicleSearch ? 'Không tìm thấy xe khả dụng phù hợp' : 'Không có xe nào khả dụng trong hệ thống'}
                    </p>
                  ) : (
                    filteredAvailableVehicles.map((v) => {
                      const isChecked = selectedVehicleIds.has(v.id);
                      return (
                        <label
                          key={v.id}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                            isChecked
                              ? 'border-primary bg-background ring-1 ring-primary'
                              : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleVehicle(v.id)}
                              className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300"
                            />
                            <div>
                              <p className="text-xs font-mono font-bold text-slate-800">{v.licensePlate}</p>
                              <p className="text-[11px] text-slate-500">{v.brand} • Màu {v.color}</p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-slate-700 px-2 py-0.5 rounded-md bg-white border border-slate-200">
                            {v.seatCount} chỗ
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 2: Unavailable Vehicles List */}
              {vehiclePickerTab === 'UNAVAILABLE' && (
                <div className="space-y-2  pr-1">
                  {filteredUnavailableVehicles.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center italic">
                      {vehicleSearch
                        ? 'Không tìm thấy xe không khả dụng phù hợp'
                        : 'Không có xe nào bị giữ chỗ hoặc không khả dụng'}
                    </p>
                  ) : (
                    filteredUnavailableVehicles.map((v) => (
                      <div
                        key={v.id}
                        className="p-3 rounded-xl border border-slate-200/60 bg-slate-50/70 space-y-1.5 opacity-90"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Input
                              type="checkbox"
                              disabled
                              checked={false}
                              className="w-4 h-4 rounded text-slate-300 border-slate-300 cursor-not-allowed"
                            />
                            <span className="text-xs font-mono font-bold text-slate-600">{v.licensePlate}</span>
                            <span className="text-[11px] text-slate-400">• {v.brand}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-500 px-2 py-0.5 rounded-md bg-white border border-slate-200">
                            {v.seatCount} chỗ
                          </span>
                        </div>
                        <div className="pl-6">
                          <span className="inline-block text-[11px] font-medium text-rose-700 bg-rose-50/90 border border-rose-100 rounded-lg px-2 py-0.5">
                            ⚠️ {v.reasonMessage}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </Card></div>


        </>}
        footer={<>
          <span>{previewResult ? `${previewResult.outboundRoutes.length} tuyến đi · ${previewResult.returnRoutes.length} tuyến về` : `${selectedStudentsCount} học sinh đã chọn · ${selectedVehicleIds.size} xe`}</span>
          {previewResult ? <div className="route-workspace-actions">
            <Button variant="outline" size="sm" onClick={() => setPreviewResult(null)}>Chỉnh thiết lập</Button>
            <Button variant="outline" size="sm" onClick={handleCancelAllAndRecreate}>Hủy kết quả</Button>
            <Button variant="primary" size="sm" disabled={isConfirming} onClick={handleConfirmRoutePlan}>
              {isConfirming && <SpinnerIcon className="w-4 h-4 animate-spin" />} Lưu phương án nháp
            </Button>
          </div> : (<>
                        {/* Run VRP Button */}
            <Button variant="primary" size="default"
              disabled={selectedStudentsCount === 0 || selectedVehicleIds.size === 0 || isOptimizing}
              onClick={handleRunOptimization}
              className="w-full py-3.5 rounded-2xl bg-primary hover:bg-[#e6b74d] text-foreground font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isOptimizing ? (
                <>
                  <SpinnerIcon className="w-5 h-5 animate-spin" />
                  <span>Đang tối ưu…</span>
                </>
              ) : (
                <>
                  <CheckIcon className="w-5 h-5" />
                  <span>Tối ưu phương án</span>
                </>
              )}
            </Button>

          </>)}
        </>} />
    </div>
  );
}

function CreateRoutePlanScope() {
  const { user } = useAuth();
  const schoolId = useSearchParams().get('schoolId');
  const scope = JSON.stringify([user?.id, user?.role, user?.schoolId, schoolId]);
  return <RoutePlanDraftProvider key={scope}><CreateRoutePlanContent /></RoutePlanDraftProvider>;
}

export default function CreateRoutePlanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-20 text-slate-400">
          <SpinnerIcon className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <CreateRoutePlanScope />
    </Suspense>
  );
}
