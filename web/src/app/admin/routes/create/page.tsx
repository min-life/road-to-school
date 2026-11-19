'use client';
import './_components/route-student-filters.css';
import { selectVisibleStudents } from '@/lib/web-api-integration';
import { GeographyFilter } from '@/components/admin/common/geography-filter';
import type { GeographyQuery } from '@/lib/types';
import { BackLink } from '@/components/admin/common/context-navigation';

import { toast } from '@/stores/toast-store';

import React, { useState, useEffect, useMemo, useRef, Suspense, useCallback, memo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiError, apiClient } from '@/lib/api-client';
import {
  RoutePreparationData,
  RoutePreviewResponse,
  PreviewStop,
} from '@/lib/types';
import {
  SpinnerIcon,
  CheckIcon,
  AlertIcon,
  SearchIcon,
  SchoolIcon,
} from '@/components/icons';
import { RouteMap, MapPoint } from '@/components/admin/routes/route-map';
import { RoutePlanningWorkspace, PlanningTabs } from '@/components/admin/routes/route-planning-workspace';
import { SaveRoutePlanDialog } from './_components/save-route-plan-dialog';
import { PreviewRouteSelector, previewRouteLabel, PREVIEW_ROUTE_COLORS, type PreviewRouteEntry } from '@/components/admin/routes/preview-route-selector';
import { PreviewRouteStops, previewStopKind, previewStopTitle } from './_components/preview-route-stops';
import { PreviewStudentsPanel } from './_components/preview-students-panel';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/auth/auth-provider';
import { useShallow } from 'zustand/react/shallow';
import { RoutePlanDraftProvider, useRoutePlanDraft } from './_components/route-plan-draft-provider';

import { selectRouteVehicles } from './_components/select-route-vehicles';

const DraftRouteMap = memo(RouteMap);
const PREVIEW_DIRECTIONS = [
  { value: 'OUTBOUND', label: 'Chiều đi', color: PREVIEW_ROUTE_COLORS[0] },
  { value: 'RETURN', label: 'Chiều về', color: PREVIEW_ROUTE_COLORS[1] },
] as const;

function BulkSelectionCheckbox({ label, total, selected, onChange }: {
  label: string;
  total: number;
  selected: number;
  onChange: () => void;
}) {
  if (total === 0) return null;
  const checked = selected === total;
  const mixed = selected > 0 && !checked;
  return (
    <label className="route-create-bulk">
      <Input
        type="checkbox"
        className="h-4 w-4 accent-primary"
        checked={checked}
        aria-checked={mixed ? 'mixed' : checked}
        ref={input => { if (input) input.indeterminate = mixed; }}
        onChange={onChange}
      />
      {label}
    </label>
  );
}

function CreateRoutePlanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const schoolId = searchParams.get('schoolId');

  const [vehiclesSelectedAutomatically, setVehiclesSelectedAutomatically] = useState(true);
  const [setupTab, setSetupTab] = useState<'STUDENTS' | 'VEHICLES'>('STUDENTS');
  const [previewDirection, setPreviewDirection] = useState<'OUTBOUND' | 'RETURN'>('OUTBOUND');
  const [compareDirections, setCompareDirections] = useState(false);
  const [mapFitCount, setMapFitCount] = useState(0);
  const [selectedPreviewPoint, setSelectedPreviewPoint] = useState<string | null>(null);
  const [workspaceView, setWorkspaceView] = useState<'panel' | 'map'>('panel');
  const [missingStudentsView, setMissingStudentsView] = useState(0);

  // Preparation Data
  const [prepData, setPrepData] = useState<RoutePreparationData | null>(null);
  const [loadingPrep, setLoadingPrep] = useState(true);
  const [prepError, setPrepError] = useState<string | null>(null);

  // Form selections
  const { selectedStudentIds, setSelectedStudentIds } = useRoutePlanDraft(useShallow(state => ({ selectedStudentIds: state.selectedStudentIds, setSelectedStudentIds: state.setSelectedStudentIds })));
  const { selectedVehicleIds, setSelectedVehicleIds } = useRoutePlanDraft(useShallow(state => ({ selectedVehicleIds: state.selectedVehicleIds, setSelectedVehicleIds: state.setSelectedVehicleIds })));
  const { studentSearch, setStudentSearch } = useRoutePlanDraft(useShallow(state => ({ studentSearch: state.studentSearch, setStudentSearch: state.setStudentSearch })));
  const { vehicleSearch, setVehicleSearch } = useRoutePlanDraft(useShallow(state => ({ vehicleSearch: state.vehicleSearch, setVehicleSearch: state.setVehicleSearch })));

  // Editable Time Constraints (PO decisions: max duration & stop service duration)
  const { maxRouteDurationMinutes, setMaxRouteDurationMinutes } = useRoutePlanDraft(useShallow(state => ({ maxRouteDurationMinutes: state.maxRouteDurationMinutes, setMaxRouteDurationMinutes: state.setMaxRouteDurationMinutes })));
  const { defaultStopServiceSeconds, setDefaultStopServiceSeconds } = useRoutePlanDraft(useShallow(state => ({ defaultStopServiceSeconds: state.defaultStopServiceSeconds, setDefaultStopServiceSeconds: state.setDefaultStopServiceSeconds })));
  const [stopServiceInput, setStopServiceInput] = useState<string | null>(null);
  const [validateStopService, setValidateStopService] = useState(false);
  const routeSettingsRef = useRef<HTMLDetailsElement>(null);
  const stopServiceRef = useRef<HTMLInputElement>(null);
  const stopServiceSeconds = Number(stopServiceInput ?? defaultStopServiceSeconds);
  const validStopService = Number.isInteger(stopServiceSeconds) && stopServiceSeconds >= 10 && stopServiceSeconds <= 300;
  const stopServiceInvalid = validateStopService && !validStopService;
  const stopServiceOverrides = useRoutePlanDraft(state => state.stopServiceOverrides);

  // Map camera focus
  const { focusPoint, setFocusPoint } = useRoutePlanDraft(useShallow(state => ({ focusPoint: state.focusPoint, setFocusPoint: state.setFocusPoint })));

  // Preview State
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<RoutePreviewResponse | null>(null);
  const { activePreviewTab, setActivePreviewTab } = useRoutePlanDraft(useShallow(state => ({ activePreviewTab: state.activePreviewTab, setActivePreviewTab: state.setActivePreviewTab })));
  const { activeRouteIndex, setActiveRouteIndex } = useRoutePlanDraft(useShallow(state => ({ activeRouteIndex: state.activeRouteIndex, setActiveRouteIndex: state.setActiveRouteIndex })));
  const [isConfirming, setIsConfirming] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [cancellingReturnIndex, setCancellingReturnIndex] = useState<number | null>(null);

  const handleMapPointClick = useCallback((pt: MapPoint) => {
    if (previewResult) {
      setSelectedPreviewPoint(pt.id);
      setActivePreviewTab('OUTBOUND');
    }
    setFocusPoint({ latitude: pt.latitude, longitude: pt.longitude, zoom: 16 });
  }, [previewResult, setActivePreviewTab, setFocusPoint, setSelectedPreviewPoint]);

  const [geography, setGeography] = useState<GeographyQuery>({});
  const [filteredPrep, setFilteredPrep] = useState<{ data: RoutePreparationData; key: string } | null>(null);
  const [geographyError, setGeographyError] = useState('');
  const filterKey = JSON.stringify([schoolId, geography.provinceId, geography.wardId]);
  const hasGeography = !!(geography.provinceId || geography.wardId);
  const studentView = hasGeography ? (filteredPrep?.key === filterKey ? filteredPrep.data : null) : prepData;
  useEffect(() => {
    if (!schoolId || !hasGeography) return;
    let current = true;
    apiClient.getRoutePreparationData(schoolId, { ...geography, availableOnly: true }).then(data => {
      if (current) {
        setFilteredPrep({ data, key: filterKey }); setGeographyError('');
        setPrepData(previous => previous ? { ...previous, eligibleStudents: [...new Map([...previous.eligibleStudents, ...data.eligibleStudents].map(student => [student.id, student])).values()] } : previous);
      }
    }).catch(error => { if (current) setGeographyError(error instanceof Error ? error.message : 'Không thể lọc học sinh.'); });
    return () => { current = false; };
  }, [schoolId, geography, hasGeography, filterKey]);
  // 1. Fetch Preparation Data
  const loadData = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoadingPrep(true);
      setPrepError(null);
      const data = await apiClient.getRoutePreparationData(schoolId, { availableOnly: true });
      setPrepData(data);

      // Default: select ALL eligible students (Section 7.1)
      const allIds = new Set(data.eligibleStudents.map((s) => s.id));
      setSelectedStudentIds(allIds);

      setSelectedVehicleIds(selectRouteVehicles(data.availableVehicles, allIds.size));
      setVehiclesSelectedAutomatically(true);
    } catch (err: any) {
      setPrepError(err?.message || 'Không thể tải dữ liệu chuẩn bị lập tuyến.');
    } finally {
      setLoadingPrep(false);
    }
  }, [schoolId, setSelectedStudentIds, setSelectedVehicleIds, setPrepData, setPrepError, setLoadingPrep]);

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
  const nextAction = isOptimizing
    ? 'Đang tối ưu phương án…'
    : selectedStudentsCount === 0
    ? 'Chọn học sinh để hệ thống tự chọn xe.'
    : !prepData?.availableVehicles.length
      ? 'Chưa có xe khả dụng. Quay lại khi có xe.'
      : selectedVehicleIds.size === 0
        ? 'Mở tab Xe và chọn ít nhất 1 xe.'
        : isCapacitySufficient
          ? vehiclesSelectedAutomatically
            ? 'Đã tự chọn xe đủ chỗ. Bấm Tối ưu phương án.'
            : 'Đủ chỗ. Bấm Tối ưu phương án.'
          : 'Thiếu ' + missingSeats + ' chỗ. Giảm số học sinh hoặc tối ưu một phần.';

  // Filtered Students for Picker
  const filteredStudents = useMemo(() => {
    if (!studentView) return [];
    if (!studentSearch.trim()) return studentView.eligibleStudents;
    const q = studentSearch.toLowerCase();
    return studentView.eligibleStudents.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.addressText.toLowerCase().includes(q),
    );
  }, [studentView, studentSearch]);

  const updateStudentGroup = (next: Set<string>) => {
    if (next.size === selectedStudentIds.size && [...next].every(id => selectedStudentIds.has(id))) return;
    setSelectedStudentIds(next);
    setSelectedVehicleIds(selectRouteVehicles(prepData?.availableVehicles ?? [], next.size));
    setVehiclesSelectedAutomatically(true);
  };

  const handleToggleStudent = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    updateStudentGroup(next);
  };

  const visibleStudentsSelectedCount = filteredStudents.filter(student => selectedStudentIds.has(student.id)).length;
  const handleToggleVisibleStudents = () => {
    updateStudentGroup(selectVisibleStudents(
      selectedStudentIds,
      filteredStudents.map(student => student.id),
      visibleStudentsSelectedCount !== filteredStudents.length,
    ));
  };

  // Toggle vehicle selection
  const handleToggleVehicle = (id: string) => {
    setVehiclesSelectedAutomatically(false);
    setSelectedVehicleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const availableVehicles = prepData?.availableVehicles ?? [];
  const availableVehiclesSelectedCount = availableVehicles.filter(vehicle => selectedVehicleIds.has(vehicle.id)).length;

  const handleToggleAllVehicles = () => {
    setVehiclesSelectedAutomatically(false);
    setSelectedVehicleIds(new Set(
      availableVehiclesSelectedCount === availableVehicles.length
        ? []
        : availableVehicles.map(vehicle => vehicle.id),
    ));
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
    if (!validStopService) {
      setValidateStopService(true);
      if (routeSettingsRef.current) routeSettingsRef.current.open = true;
      stopServiceRef.current?.focus();
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
          defaultStopServiceSeconds: stopServiceSeconds,
          stopServiceOverrides: cleanOverrides.length > 0 ? cleanOverrides : undefined,
        },
      });

      setPreviewResult(res);
      setCompareDirections(false);
      setWorkspaceView('panel');
      setSelectedPreviewPoint(null);
      setFocusPoint(null);
      setPreviewDirection(res.outboundRoutes.length || !res.returnRoutes.length ? 'OUTBOUND' : 'RETURN');
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
      if (!updated.outboundRoutes.length || !updated.returnRoutes.length) setCompareDirections(false);
      setSelectedPreviewPoint(null);
      setFocusPoint(null);
      setMapFitCount(count => count + 1);
      setActiveRouteIndex(0);
    } catch (err: any) {
      if (err instanceof ApiError && [404, 409].includes(err.statusCode)) setPreviewResult(null);
      setOptimizeError(err?.message || 'Không thể hủy tuyến về này');
    } finally {
      setCancellingReturnIndex(null);
    }
  };

  const handleEditSetup = () => {
    setPreviewResult(null);
    setWorkspaceView('panel');
    setFocusPoint(null);
    setOptimizeError(null);
  };

  // Confirm RoutePlan (Section 16)
  const handleConfirmRoutePlan = async () => {
    if (!previewResult?.summary.assignedBothWaysCount || isConfirming || cancellingReturnIndex !== null) return;

    try {
      setIsConfirming(true);
      setOptimizeError(null);
      const confirmedPlan = await apiClient.confirmRoutePlan({
        previewToken: previewResult.previewToken,
      });
      toast.success('Đã tạo phương án tuyến.');
      setShowSaveConfirmation(false);
      if (confirmedPlan?.id) {
        const savedParams = new URLSearchParams(searchParams.toString());
        savedParams.delete('schoolId');
        savedParams.delete('savedPlanId');
        savedParams.set('tab', 'assignments');
        router.replace(`/admin/routes/plans/${confirmedPlan.id}?${savedParams.toString()}`);
      } else {
        router.push('/admin/routes');
      }
    } catch (err: any) {
      if (err instanceof ApiError && [404, 409].includes(err.statusCode)) {
        setPreviewResult(null);
        setShowSaveConfirmation(false);
      }
      setOptimizeError((err?.message || 'Lỗi khi xác nhận lưu phương án tuyến') + ' Vui lòng tối ưu lại trước khi lưu.');
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

  const previewEntries = useMemo<PreviewRouteEntry[]>(() => [
    ...(previewResult?.outboundRoutes ?? []).map((route, index) => ({ id: `OUTBOUND-${index}`, direction: 'OUTBOUND' as const, index, route })),
    ...(previewResult?.returnRoutes ?? []).map((route, index) => ({ id: `RETURN-${index}`, direction: 'RETURN' as const, index, route })),
  ].map(entry => ({ ...entry, color: PREVIEW_DIRECTIONS[entry.direction === 'OUTBOUND' ? 0 : 1].color })), [previewResult]);
  const directionPreviewEntries = previewEntries.filter(entry => entry.direction === previewDirection);
  const activePreviewEntry = useMemo(() => previewEntries.find(entry => entry.direction === previewDirection && entry.index === activeRouteIndex) ?? previewEntries.find(entry => entry.direction === previewDirection), [previewEntries, previewDirection, activeRouteIndex]);
  const activePreviewRoute = activePreviewEntry?.route;
  const previewTab = activePreviewTab === 'STUDENTS' ? 'STUDENTS' : 'ROUTES';
  const resetPreviewFocus = () => {
    setSelectedPreviewPoint(null);
    setFocusPoint(null);
  };
  const selectPreviewRoute = (direction: PreviewRouteEntry['direction'], index: number) => {
    if (direction === previewDirection && index === activeRouteIndex) return;
    setPreviewDirection(direction);
    setActiveRouteIndex(index);
    resetPreviewFocus();
    setMapFitCount(count => count + 1);
  };
  const selectPreviewStop = (stop: PreviewStop) => {
    if (!activePreviewEntry) return;
    setSelectedPreviewPoint(`${activePreviewEntry.id}:${stop.stopOrder}`);
    setFocusPoint({ latitude: stop.latitude, longitude: stop.longitude, zoom: 16 });
    setWorkspaceView('map');
  };
  const previewMapRoutes = useMemo(() => {
    const visibleRoutes = compareDirections ? previewEntries : activePreviewEntry ? [activePreviewEntry] : [];
    return visibleRoutes.map(entry => ({
      id: compareDirections ? `compare-${entry.id}` : entry.id,
      polylineGeometry: entry.route.polylineGeometry, color: entry.color,
      active: entry.id === activePreviewEntry?.id,
    }));
  }, [activePreviewEntry, compareDirections, previewEntries]);
  const routeLegend = compareDirections
    ? PREVIEW_DIRECTIONS.filter(direction => previewEntries.some(entry => entry.direction === direction.value))
    : activePreviewEntry ? [{
      label: previewRouteLabel(activePreviewEntry.direction, activePreviewEntry.index),
      color: activePreviewEntry.color,
    }] : [];

  // The numbered points always match the route in the right panel.
  const previewMapPoints: MapPoint[] = useMemo(() => {
    if (!activePreviewEntry) return [];
    return activePreviewEntry.route.stops.map(stop => ({
      id: `${activePreviewEntry.id}:${stop.stopOrder}`,
      title: previewStopTitle(stop, previewResult?.schoolName || 'Trường học'),
      subtitle: stop.addressText,
      latitude: stop.latitude,
      longitude: stop.longitude,
      type: previewStopKind(stop),
      order: stop.stopOrder,
      eta: stop.plannedArrivalTime,
    }));
  }, [activePreviewEntry, previewResult?.schoolName]);

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

  return (
    <div className={`route-planning-page${previewResult ? ' route-planning-result' : ''}`}>
      <PageHeader className="flex flex-col items-start gap-2">
        <BackLink fallback="/admin/routes" className="text-sm text-slate-500" />
        <div className="route-create-heading">
          <div>
            <h1 className="text-2xl font-bold">{previewResult ? 'Xem trước phương án tuyến' : 'Lập phương án tuyến'}</h1>
            {previewResult && <p className="route-preview-school">{previewResult.schoolName}</p>}
          </div>
          {!previewResult && (
            <details ref={routeSettingsRef} className="route-create-settings">
              <summary>Thiết lập tuyến</summary>
              <div className="route-create-settings-panel">
              <div className="route-workspace-config-fields">
                {/* Max Route Duration */}
                <div>
                  <label htmlFor="route-max-duration" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Thời gian tối đa mỗi tuyến
                  </label>
                  <div className="route-workspace-number-field">
                  <Input
                    id="route-max-duration"
                    aria-describedby="route-max-duration-unit"
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
                  <span id="route-max-duration-unit">phút</span>
                  </div>
                </div>

                {/* Default Stop Service Seconds */}
                <div>
                  <label htmlFor="route-default-stop" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Thời gian dừng mỗi điểm
                  </label>
                  <div className="route-workspace-number-field">
                  <Input
                    ref={stopServiceRef}
                    id="route-default-stop"
                    aria-describedby={stopServiceInvalid ? 'route-default-stop-unit route-default-stop-error' : 'route-default-stop-unit'}
                    aria-invalid={stopServiceInvalid}
                    type="number"
                    min={10}
                    max={300}
                    step={1}
                    value={stopServiceInput ?? defaultStopServiceSeconds}
                    onChange={(e) => setStopServiceInput(e.target.value)}
                    onBlur={() => {
                      setValidateStopService(true);
                      if (validStopService) {
                        setDefaultStopServiceSeconds(stopServiceSeconds);
                        setStopServiceInput(null);
                      }
                    }}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-primary"
                  />
                  <span id="route-default-stop-unit">giây</span>
                  </div>
                  {stopServiceInvalid && <p id="route-default-stop-error" className="mt-1 text-xs text-rose-700" role="alert">
                    Nhập số nguyên từ 10 đến 300 giây.
                  </p>}
                </div>
              </div>
              </div>
            </details>
          )}
        </div>
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


      {previewResult && <div className="route-preview-summary">
        <div className="route-preview-coverage" aria-live="polite">
          {previewResult.summary.unassignedCount
            ? <AlertIcon className="route-preview-status-icon is-warning" aria-hidden="true" />
            : <CheckIcon className="route-preview-status-icon" aria-hidden="true" />}
          <strong>{previewResult.summary.assignedBothWaysCount}/{previewResult.summary.totalSelectedStudents} học sinh đã xếp đủ hai chiều</strong>
          <span>{previewResult.outboundRoutes.length} tuyến đi · {previewResult.returnRoutes.length} tuyến về</span>
        </div>
        {previewResult.summary.unassignedCount > 0 && <Button type="button" variant="outline" size="sm" onClick={() => {
          setActivePreviewTab('STUDENTS');
          setMissingStudentsView(value => value + 1);
          setWorkspaceView('panel');
        }}>
          Xem {previewResult.summary.unassignedCount} học sinh chưa xếp đủ
        </Button>}
      </div>}
      <RoutePlanningWorkspace preview={Boolean(previewResult)} mobileView={workspaceView} onMobileViewChange={setWorkspaceView}
        map={previewResult ? <div className="route-preview-map">
          <div className="route-preview-map-header">
            <h2>Bản đồ tuyến</h2>
            <Button type="button" variant="outline" size="sm" onClick={() => {
              resetPreviewFocus();
              setMapFitCount(count => count + 1);
            }}>Xem toàn cảnh</Button>
            <div className="route-preview-map-mode" role="group" aria-label="Tuyến hiển thị trên bản đồ">
              <button type="button" aria-pressed={!compareDirections} onClick={() => {
                if (!compareDirections) return;
                resetPreviewFocus();
                setCompareDirections(false);
              }}>Tuyến đang xem</button>
              <button type="button" aria-pressed={compareDirections}
                disabled={!previewResult.outboundRoutes.length || !previewResult.returnRoutes.length}
                onClick={() => {
                  if (compareDirections) return;
                  resetPreviewFocus();
                  setCompareDirections(true);
                }}>Cả hai chiều</button>
            </div>
          </div>
          <DraftRouteMap className="route-preview-map-canvas" schoolLocation={activePreviewEntry ? undefined : schoolLocation}
            parkingLocation={activePreviewEntry ? undefined : parkingLocation}
            points={previewMapPoints} routes={previewMapRoutes} routeLegend={routeLegend}
            selectedPointId={selectedPreviewPoint} viewportKey={`${compareDirections}:${mapFitCount}`} hideOverviewButton
            focusPoint={focusPoint} onPointClick={handleMapPointClick} height="auto" />
        </div> : <DraftRouteMap schoolLocation={schoolLocation} parkingLocation={parkingLocation}
          points={initialMapPoints} focusPoint={focusPoint} onPointClick={handleMapPointClick} height="100%" />}
        panel={previewResult ? <>
          <PlanningTabs value={previewTab} tabs={[
            { value: 'ROUTES', label: `Tuyến (${previewEntries.length})` },
            { value: 'STUDENTS', label: `Học sinh (${previewResult.summary.totalSelectedStudents})` },
          ]} onChange={tab => setActivePreviewTab(tab === 'STUDENTS' ? 'STUDENTS' : 'OUTBOUND')} />
          <div className={`route-workspace-content ${previewTab === 'ROUTES' ? 'preview-routes-content' : 'preview-students-content'}`}
            role="tabpanel" id={`planning-panel-${previewTab}`} aria-labelledby={`planning-tab-${previewTab}`} tabIndex={0}>
            {previewTab === 'STUDENTS' ? <PreviewStudentsPanel key={`${previewResult.summary.unassignedCount}:${missingStudentsView}`} preview={previewResult} /> : <>
              <div className="preview-direction-tabs">
                <PlanningTabs label="Chiều tuyến" value={previewDirection} tabs={[
                  { value: 'OUTBOUND', label: `Chiều đi (${previewResult.outboundRoutes.length})` },
                  { value: 'RETURN', label: `Chiều về (${previewResult.returnRoutes.length})` },
                ]} onChange={direction => {
                  if (direction !== previewDirection) selectPreviewRoute(direction, 0);
                }} />
              </div>
              <div className="preview-direction-panel" role="tabpanel" id={`planning-panel-${previewDirection}`}
                aria-labelledby={`planning-tab-${previewDirection}`} tabIndex={0}>
                {activePreviewEntry ? <>
                  <PreviewRouteSelector routes={directionPreviewEntries} active={activePreviewEntry}
                    onInspect={entry => selectPreviewRoute(entry.direction, entry.index)}
                    onRemove={activePreviewEntry.direction === 'RETURN' ? () => handleCancelReturnRoute(activePreviewEntry.index) : undefined}
                    pending={cancellingReturnIndex !== null} />
                  <PreviewRouteStops routeId={activePreviewEntry.id} stops={activePreviewEntry.route.stops} schoolName={previewResult.schoolName}
                    defaultServiceSeconds={defaultStopServiceSeconds} selectedId={selectedPreviewPoint} onSelect={selectPreviewStop} />
                </> : <p className="route-workspace-empty">Không có tuyến ở chiều này.</p>}
              </div>
            </>}
          </div>
        </> : <>
          <PlanningTabs value={setupTab} tabs={[
            {value: 'STUDENTS', label: `Học sinh · ${selectedStudentsCount} đã chọn`},
            {value: 'VEHICLES', label: `Xe · ${selectedVehicleIds.size} đã chọn`},
          ]} onChange={tab => setSetupTab(tab)} />
          <div className="route-workspace-content route-workspace-selection" hidden={setupTab !== 'STUDENTS'} role="tabpanel" id="planning-panel-STUDENTS" aria-labelledby="planning-tab-STUDENTS" tabIndex={0}><Card className="route-workspace-picker space-y-4">
              <div className="route-student-filter-toolbar">
              {/* Student Search */}
              <div className="relative">
                <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Tìm học sinh theo tên, mã..."
                  aria-label="Tìm học sinh theo tên hoặc mã"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-primary"
                />
              </div>

                <GeographyFilter compact schoolId={schoolId || undefined} value={geography} onChange={value => { setGeography(value); setGeographyError(''); }} />
              </div>
              {hasGeography && !studentView && !geographyError && <p role="status">Đang lọc học sinh…</p>}
              {hasGeography && geographyError && <p role="alert" className="text-xs text-rose-700">{geographyError}</p>}
              <BulkSelectionCheckbox
                label="Tất cả học sinh đang hiển thị"
                total={filteredStudents.length}
                selected={visibleStudentsSelectedCount}
                onChange={handleToggleVisibleStudents}
              />
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
                          className="flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer odd:bg-slate-50 hover:bg-slate-100"
                        >
                          <Input
                            type="checkbox"
                            checked={isChecked}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => handleToggleStudent(s.id)}
                            aria-label={`Chọn ${s.fullName} (${s.code})`}
                            className="w-4 h-4 accent-primary mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-slate-800 truncate">{s.fullName}</p>
                              <span className="text-[11px] font-mono text-slate-600">{s.code}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">{s.addressText}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
            </Card></div>
          <div className="route-workspace-content route-workspace-selection" hidden={setupTab !== 'VEHICLES'} role="tabpanel" id="planning-panel-VEHICLES" aria-labelledby="planning-tab-VEHICLES" tabIndex={0}><Card className="route-workspace-picker space-y-4">
              {/* Search Vehicles */}
              <div className="relative">
                <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Tìm theo biển số hoặc dòng xe"
                  aria-label="Tìm xe theo biển số hoặc dòng xe"
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-primary"
                />
              </div>

              <BulkSelectionCheckbox
                label="Tất cả xe khả dụng"
                total={availableVehicles.length}
                selected={availableVehiclesSelectedCount}
                onChange={handleToggleAllVehicles}
              />
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
            </Card></div>


        </>}
        footer={<>
          {previewResult ? (
            <span className="route-preview-next">{previewResult.summary.assignedBothWaysCount
              ? 'Sau khi lưu, chuyển sang phân công nguồn lực.' : 'Sửa thiết lập để xếp học sinh đủ hai chiều.'}</span>
          ) : (
            <div className="route-create-next" role="status" aria-atomic="true">
              <strong>{selectedStudentsCount} học sinh · {selectedVehicleIds.size} xe</strong>
              <p className={selectedStudentsCount > 0 && !isCapacitySufficient ? 'text-amber-800' : 'text-slate-700'}>
                {nextAction}
              </p>
            </div>
          )}
          {previewResult ? <div className="route-workspace-actions">
            <Button variant="outline" size="sm" disabled={cancellingReturnIndex !== null} onClick={handleEditSetup}>Sửa thiết lập</Button>
            <Button variant="primary" size="sm" disabled={isConfirming || cancellingReturnIndex !== null || !previewResult.summary.assignedBothWaysCount}
              onClick={() => { setOptimizeError(null); setShowSaveConfirmation(true); }}>
              {isConfirming && <SpinnerIcon className="w-4 h-4 animate-spin" />} Lưu phương án
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
      {previewResult && <SaveRoutePlanDialog
        isOpen={showSaveConfirmation}
        outboundCount={previewResult.outboundRoutes.length}
        returnCount={previewResult.returnRoutes.length}
        assignedCount={previewResult.summary.assignedBothWaysCount}
        unassignedCount={previewResult.summary.unassignedCount}
        isSaving={isConfirming}
        error={optimizeError}
        onClose={() => setShowSaveConfirmation(false)}
        onConfirm={handleConfirmRoutePlan}
      />}
    </div>
  );
}

function CreateRoutePlanScope() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const schoolId = searchParams.get('schoolId');
  const savedPlanId = searchParams.get('savedPlanId');
  const scope = JSON.stringify([user?.id, user?.role, user?.schoolId, schoolId]);
  if (!user) return <p role="status">Đang xác thực…</p>;
  if (user.role !== 'SYSTEM_ADMIN') return <p role="alert">Bạn không có quyền lập phương án tuyến.</p>;
  if (savedPlanId) return <SavedPlanRedirect planId={savedPlanId} />;
  return <RoutePlanDraftProvider key={scope}><CreateRoutePlanContent /></RoutePlanDraftProvider>;
}

function SavedPlanRedirect({ planId }: { planId: string }) {
  const router = useRouter();
  const query = useSearchParams().toString();
  useEffect(() => {
    const params = new URLSearchParams(query);
    params.delete('schoolId');
    params.delete('savedPlanId');
    params.set('tab', 'assignments');
    router.replace(`/admin/routes/plans/${encodeURIComponent(planId)}?${params.toString()}`);
  }, [planId, query, router]);
  return <p role="status">Đang mở phương án đã lưu…</p>;
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
