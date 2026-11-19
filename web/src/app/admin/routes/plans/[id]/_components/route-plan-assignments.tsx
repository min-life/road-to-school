'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ChevronDown, Search, X, AlertTriangle } from 'lucide-react';
import { toast } from '@/stores/toast-store';
import { ApiError, apiClient } from '@/lib/api-client';
import { effectivePlanStatus } from '@/lib/school-lifecycle';
import {
  RoutePlanItem,
  RouteItem,
  Role,
  CandidateVehicleItem,
  CandidateDriverItem,
  CandidateBusAttendantItem,
} from '@/lib/types';
import { SpinnerIcon, BusIcon, InfoIcon } from '@/components/icons';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import './route-plan-assignments.css';

export interface RoutePlanAssignmentsProps {
  plan: RoutePlanItem;
  currentUserRole: Role | null;
  onUpdated: () => void;
  compact?: boolean;
  hiddenRouteIds?: Set<string>;
  onViewOnMap?: (routes: RouteItem[]) => void;
  assignmentFocusRequest?: number;
}

export interface VehicleGroup {
  id: string;
  routeSignature: string;
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

export function getGroupStatusBadge(group: VehicleGroup, role: Role | null, editable: boolean) {
  if (!editable) {
    const hasAll = group.vehicleId && group.driverId && group.busAttendantId;
    return hasAll
      ? { label: 'Đã đủ phân công', variant: 'success' as const }
      : { label: 'Chưa đủ phân công', variant: 'warning' as const };
  }

  if (role === 'SYSTEM_ADMIN') {
    if (!group.vehicleId) {
      return { label: 'Chưa gán xe', variant: 'warning' as const };
    }
    if (!group.driverId) {
      return { label: 'Thiếu tài xế', variant: 'warning' as const };
    }
    return { label: 'Đủ xe và tài xế', variant: 'success' as const };
  }

  if (role === 'SCHOOL_ADMIN') {
    if (!group.vehicleId) {
      return { label: 'Chờ nhà xe gán xe', variant: 'neutral' as const };
    }
    if (!group.busAttendantId) {
      return { label: 'Chưa có giáo viên', variant: 'warning' as const };
    }
    return { label: 'Đã có giáo viên', variant: 'success' as const };
  }

  const allComplete = group.vehicleId && group.driverId && group.busAttendantId;
  return {
    label: allComplete ? 'Đã đủ phân công' : 'Chưa đủ phân công',
    variant: allComplete ? ('success' as const) : ('warning' as const),
  };
}

interface PersonAssignmentModalProps {
  planId: string;
  group: VehicleGroup;
  type: 'DRIVER' | 'ATTENDANT';
  currentUserRole: Role | null;
  onClose: () => void;
  onSuccess: () => void;
  onSyncPlan: () => void;
}

function PersonAssignmentModal({
  planId,
  group,
  type,
  currentUserRole,
  onClose,
  onSuccess,
  onSyncPlan,
}: PersonAssignmentModalProps) {
  const isDriver = type === 'DRIVER';
  const isSchoolAdmin = currentUserRole === 'SCHOOL_ADMIN';
  const isSystemAdmin = currentUserRole === 'SYSTEM_ADMIN';

  const title = isDriver ? 'Phân công tài xế' : 'Phân công giáo viên phụ trách';
  const label = isDriver ? 'Tài xế khả dụng' : 'Giáo viên khả dụng';
  const searchPlaceholder = 'Tìm theo tên hoặc số điện thoại';
  const loadingText = isDriver ? 'Đang tải danh sách tài xế khả dụng…' : 'Đang tải danh sách giáo viên khả dụng…';
  const loadErrorDefault = isDriver ? 'Không thể tải danh sách tài xế khả dụng' : 'Không thể tải danh sách giáo viên khả dụng';
  const emptyNoAvailableText = isDriver ? 'Không có tài xế khả dụng cho nhóm xe này' : 'Không có giáo viên khả dụng cho nhóm xe này';
  const emptyNoMatchText = isDriver ? 'Không tìm thấy tài xế phù hợp với từ khóa' : 'Không tìm thấy giáo viên phù hợp với từ khóa';
  const successToastText = isDriver ? 'Đã phân công tài xế.' : 'Đã phân công giáo viên phụ trách.';
  const noVehicleErrorText = isDriver ? 'Cần gán xe trước khi phân công tài xế cho nhóm.' : 'Cần gán xe trước khi phân công giáo viên cho nhóm.';
  const failureErrorDefault = isDriver ? 'Không thể phân công tài xế' : 'Không thể phân công giáo viên phụ trách';

  const [candidates, setCandidates] = useState<Array<CandidateDriverItem | CandidateBusAttendantItem>>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const fetchCandidatesApi = useCallback(
    async (targetVehicleId?: string) => {
      if (isDriver) {
        const res = await apiClient.getCandidateDrivers(planId, targetVehicleId);
        return res.candidates || [];
      } else {
        const res = await apiClient.getCandidateBusAttendants(planId, targetVehicleId);
        return res.candidates || [];
      }
    },
    [isDriver, planId]
  );

  useEffect(() => {
    let active = true;
    fetchCandidatesApi(group.vehicleId || undefined)
      .then((items) => {
        if (!active) return;
        setCandidates(items);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : loadErrorDefault);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchCandidatesApi, group.vehicleId, reloadTrigger, loadErrorDefault]);

  const handleRetryLoad = () => {
    setLoadError(null);
    setLoading(true);
    setReloadTrigger((v) => v + 1);
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, submitting]);

  // Only consider candidates with isEligible === true
  const eligiblePersons = useMemo(() => {
    return candidates.filter((c) => c.isEligible);
  }, [candidates]);

  // Filter eligible candidates by keyword (name or phone)
  const filteredPersons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return eligiblePersons;
    return eligiblePersons.filter((c) => {
      const nameMatch = c.fullName.toLowerCase().includes(q);
      const phoneMatch = c.phone ? c.phone.toLowerCase().includes(q) : false;
      return nameMatch || phoneMatch;
    });
  }, [eligiblePersons, searchQuery]);

  // Only enable submit if selected candidate is eligible and not currently submitting
  const isSubmitEnabled = Boolean(
    selectedPersonId &&
    eligiblePersons.some((c) => c.id === selectedPersonId) &&
    !submitting
  );

  const handleSubmit = async () => {
    if (!isSubmitEnabled) return;
    if (isDriver && !isSystemAdmin) {
      setActionError('Chỉ Quản trị viên nhà xe mới có quyền phân công tài xế.');
      return;
    }
    if (!isDriver && !isSchoolAdmin) {
      setActionError('Chỉ Quản trị viên trường học mới có quyền phân công giáo viên.');
      return;
    }
    if (!group.vehicleId) {
      setActionError(noVehicleErrorText);
      return;
    }

    setSubmitting(true);
    setActionError(null);

    try {
      if (isDriver) {
        await apiClient.assignDriverGroup(planId, {
          vehicleId: group.vehicleId,
          driverId: selectedPersonId,
        });
      } else {
        await apiClient.assignBusAttendantGroup(planId, {
          vehicleId: group.vehicleId,
          busAttendantId: selectedPersonId,
        });
      }
      toast.success(successToastText);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : failureErrorDefault;
      setActionError(msg);
      // Trigger background sync
      onSyncPlan();
      // Reload candidates and verify selection
      try {
        setLoading(true);
        const newCandidates = await fetchCandidatesApi(group.vehicleId || undefined);
        setCandidates(newCandidates);
        const stillEligible = newCandidates.some(
          (c) => c.id === selectedPersonId && c.isEligible
        );
        if (!stillEligible) {
          setSelectedPersonId('');
        }
      } catch {
        setCandidates([]);
        setSelectedPersonId('');
      } finally {
        setLoading(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const vehiclePlateLabel = group.vehiclePlate ? `Xe ${group.vehiclePlate}` : 'Chưa gán xe';
  const routesCountLabel = `${group.routes.length} tuyến dùng chung xe`;

  return (
    <div
      className="driver-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div
        className="driver-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="person-modal-title"
      >
        {/* Header */}
        <div className="driver-modal-header">
          <div className="driver-modal-header-titles">
            <h2 id="person-modal-title" className="driver-modal-title">
              {title}
            </h2>
            <p className="driver-modal-subtitle">
              {vehiclePlateLabel} · {routesCountLabel}
            </p>
          </div>
          <button
            type="button"
            className="driver-modal-close-btn"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <hr className="driver-modal-divider" />

        {/* Body */}
        <div className="driver-modal-body">
          <div className="driver-modal-label">{label}</div>

          {/* Search Box */}
          <div className="driver-modal-search">
            <Search className="driver-modal-search-icon" aria-hidden="true" />
            <input
              type="text"
              className="driver-modal-search-input"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={searchPlaceholder}
            />
            {searchQuery && (
              <button
                type="button"
                className="driver-modal-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Conflict / Action Error (Adjacent to candidate list) */}
          {actionError && (
            <div className="driver-modal-conflict-alert" role="alert">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-normal">{actionError}</div>
            </div>
          )}

          {/* Candidate List / State Handling */}
          {loading ? (
            <div className="driver-modal-status-box">
              <SpinnerIcon className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
              <span className="text-xs text-slate-500">{loadingText}</span>
            </div>
          ) : loadError ? (
            <div className="driver-modal-status-box" role="alert">
              <AlertTriangle className="w-6 h-6 text-rose-500 mx-auto mb-2" />
              <p className="text-xs text-rose-700 font-semibold mb-2">{loadError}</p>
              <Button variant="outline" size="sm" onClick={handleRetryLoad}>
                Thử lại
              </Button>
            </div>
          ) : eligiblePersons.length === 0 ? (
            <div className="driver-modal-empty-box" role="status">
              <p className="text-sm font-semibold text-slate-600">
                {emptyNoAvailableText}
              </p>
            </div>
          ) : filteredPersons.length === 0 ? (
            <div className="driver-modal-empty-box" role="status">
              <p className="text-sm font-semibold text-slate-600">
                {emptyNoMatchText}
              </p>
              <button
                type="button"
                className="text-xs text-blue-600 hover:text-blue-800 underline mt-1"
                onClick={() => setSearchQuery('')}
              >
                Xóa từ khóa tìm kiếm
              </button>
            </div>
          ) : (
            <div
              className="driver-modal-list"
              role="radiogroup"
              aria-label={label}
            >
              {filteredPersons.map((p) => {
                const isSelected = selectedPersonId === p.id;
                return (
                  <div
                    key={p.id}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    className="driver-modal-item"
                    data-selected={isSelected}
                    onClick={() => setSelectedPersonId(p.id)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        setSelectedPersonId(p.id);
                      }
                    }}
                  >
                    <span className="driver-modal-radio" aria-hidden="true">
                      {isSelected ? (
                        <svg width="18" height="18" viewBox="0 0 18 18">
                          <circle cx="9" cy="9" r="8" fill="#FFFFFF" stroke="#996711" strokeWidth="1.5" />
                          <circle cx="9" cy="9" r="4" fill="#996711" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 18 18">
                          <circle cx="9" cy="9" r="8" fill="#FFFFFF" stroke="#7490AA" strokeWidth="1.5" />
                        </svg>
                      )}
                    </span>
                    <div className="driver-modal-info">
                      <div className="driver-modal-driver-name">{p.fullName}</div>
                      {p.phone && <div className="driver-modal-driver-phone">{p.phone}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <hr className="driver-modal-divider" />

        {/* Footer */}
        <div className="driver-modal-footer">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="driver-modal-btn-cancel"
          >
            Hủy
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isSubmitEnabled}
            className="driver-modal-btn-submit"
          >
            {submitting && <SpinnerIcon className="w-4 h-4 animate-spin text-[#193652]" />}
            <span>Phân công</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function RoutePlanAssignments({
  plan,
  currentUserRole,
  onUpdated,
  compact = false,
  hiddenRouteIds,
  onViewOnMap,
  assignmentFocusRequest,
}: RoutePlanAssignmentsProps) {
  const planStatus = effectivePlanStatus(plan);
  const editable = planStatus === 'DRAFT' || planStatus === 'ACTIVE';
  const isSystemAdmin = editable && currentUserRole === 'SYSTEM_ADMIN';
  const isSchoolAdmin = editable && currentUserRole === 'SCHOOL_ADMIN';
  const isActive = planStatus === 'ACTIVE';

  const routes = useMemo(() => plan.routes || [], [plan.routes]);

  // Group routes by vehicleId with stable ID and routeSignature
  const groups: VehicleGroup[] = useMemo(() => {
    const list: VehicleGroup[] = [];
    for (const r of routes) {
      const vId = r.proposedVehicleId || null;
      let group = list.find((g) => g.vehicleId === vId);
      if (!group) {
        group = {
          id: '',
          routeSignature: '',
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
        list.push(group);
      }
      group.routes.push(r);
    }

    list.forEach((g) => {
      const sig = g.routes.map((r) => r.id).sort().join(',');
      g.routeSignature = sig;
      g.id = g.vehicleId ? `vehicle:${g.vehicleId}` : `unassigned:${sig}`;
    });

    return list;
  }, [routes]);

  const isActionable = useCallback(
    (group: VehicleGroup): boolean => {
      if (!editable) return false;
      if (isSystemAdmin) {
        return !group.vehicleId || !group.driverId;
      }
      if (isSchoolAdmin) {
        return Boolean(group.vehicleId && !group.busAttendantId);
      }
      return false;
    },
    [editable, isSystemAdmin, isSchoolAdmin]
  );

  // Actionable groups come first
  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => {
      const aAct = isActionable(a);
      const bAct = isActionable(b);
      if (aAct && !bAct) return -1;
      if (!aAct && bAct) return 1;
      return 0;
    });
  }, [groups, isActionable]);

  const actionableCount = useMemo(() => {
    return groups.filter(isActionable).length;
  }, [groups, isActionable]);

  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING'>('ALL');

  const displayedGroups = useMemo(() => {
    if (groups.length <= 1) return sortedGroups;
    if (filterTab === 'PENDING') {
      return sortedGroups.filter(isActionable);
    }
    return sortedGroups;
  }, [sortedGroups, filterTab, groups.length, isActionable]);

  // User-driven expansion state:
  // undefined: user hasn't explicitly interacted -> use default behavior
  // null: user explicitly collapsed everything
  // string: routeSignature of group user clicked to expand
  const [userExpandedSignature, setUserExpandedSignature] = useState<string | null | undefined>(undefined);

  // Handle external focus request (from Tuyến tab "Phân công →")
  const [prevFocusReq, setPrevFocusReq] = useState(0);
  if (assignmentFocusRequest && assignmentFocusRequest !== prevFocusReq) {
    setPrevFocusReq(assignmentFocusRequest);
    setFilterTab('ALL');
    const firstAct = sortedGroups.find(isActionable);
    if (firstAct) {
      setUserExpandedSignature(firstAct.routeSignature);
    }
  }

  // Derive which group is currently expanded purely during render
  const expandedGroupId = useMemo(() => {
    if (groups.length === 0) return null;

    if (userExpandedSignature !== undefined) {
      if (userExpandedSignature === null) return null;
      const matched = groups.find((g) => g.routeSignature === userExpandedSignature);
      if (matched && displayedGroups.some((g) => g.id === matched.id)) {
        return matched.id;
      }
      return displayedGroups[0]?.id ?? null;
    }

    if (groups.length === 1) return groups[0].id;

    if (actionableCount > 0) {
      const firstActionable = sortedGroups.find(isActionable);
      if (firstActionable && displayedGroups.some((g) => g.id === firstActionable.id)) {
        return firstActionable.id;
      }
      return displayedGroups[0]?.id ?? null;
    }

    return null;
  }, [groups, sortedGroups, displayedGroups, actionableCount, isActionable, userExpandedSignature]);

  const groupHeaderRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const filterAllBtnRef = useRef<HTMLButtonElement>(null);
  const filterPendingBtnRef = useRef<HTMLButtonElement>(null);

  // DOM focus effect for external shortcut
  useEffect(() => {
    if (!assignmentFocusRequest) return;
    const firstActionable = sortedGroups.find(isActionable);
    if (firstActionable) {
      requestAnimationFrame(() => {
        const btn = groupHeaderRefs.current.get(firstActionable.id);
        btn?.focus();
        btn?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    }
  }, [assignmentFocusRequest, sortedGroups, isActionable]);

  // DOM focus effect when a group leaves displayed list
  const prevDisplayedIdsRef = useRef<string[]>([]);
  useEffect(() => {
    const prevIds = prevDisplayedIdsRef.current;
    const currentIds = displayedGroups.map((g) => g.id);
    prevDisplayedIdsRef.current = currentIds;

    if (userExpandedSignature && prevIds.length > 0) {
      const stillPresent = groups.some(
        (g) => g.routeSignature === userExpandedSignature && currentIds.includes(g.id)
      );
      if (!stillPresent) {
        if (displayedGroups.length > 0) {
          const nextId = displayedGroups[0].id;
          requestAnimationFrame(() => {
            groupHeaderRefs.current.get(nextId)?.focus();
          });
        } else {
          requestAnimationFrame(() => {
            filterAllBtnRef.current?.focus();
          });
        }
      }
    }
  }, [displayedGroups, groups, userExpandedSignature]);

  const handleToggleGroup = (group: VehicleGroup) => {
    if (expandedGroupId === group.id) {
      setUserExpandedSignature(null);
    } else {
      setUserExpandedSignature(group.routeSignature);
    }
  };

  // Modals state
  const [modalType, setModalType] = useState<'VEHICLE' | 'DRIVER' | 'ATTENDANT' | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<VehicleGroup | null>(null);
  const [candidateVehicles, setCandidateVehicles] = useState<CandidateVehicleItem[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const openModal = async (type: 'VEHICLE' | 'DRIVER' | 'ATTENDANT', group: VehicleGroup) => {
    if (type === 'ATTENDANT' ? !isSchoolAdmin : !isSystemAdmin) return;
    setSelectedGroup(group);
    setModalType(type);
    setSelectedResourceId('');
    setActionError(null);

    if (type === 'DRIVER' || type === 'ATTENDANT') {
      return;
    }

    setLoadingOptions(true);

    try {
      if (type === 'VEHICLE') {
        const res = await apiClient.getCandidateVehicles(plan.id, group.vehicleId || undefined);
        setCandidateVehicles(res.candidates || []);
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Không thể tải danh sách tài nguyên ứng viên');
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
    if (!selectedGroup || !selectedResourceId || submitting) return;
    if (!isSystemAdmin) return;
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
        toast.success('Đã cập nhật xe của nhóm tuyến.');
      }
      closeModal();
      onUpdated();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Không thể cập nhật phân công tài nguyên');
      setSelectedResourceId('');
      if (err instanceof ApiError && [400, 409].includes(err.statusCode)) {
        onUpdated();
        setLoadingOptions(true);
        try {
          setCandidateVehicles((await apiClient.getCandidateVehicles(plan.id, selectedGroup.vehicleId || undefined)).candidates);
        } catch {
          setCandidateVehicles([]);
        } finally {
          setLoadingOptions(false);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`assignment-workspace-panel${compact ? ' compact' : ''}`}>
      {/* Notice for ACTIVE plans */}
      {isActive && (
        <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200/80 flex items-start gap-3">
          <InfoIcon className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 leading-relaxed">
            <strong className="font-semibold text-blue-950">Lưu ý phân công mặc định:</strong>{' '}
            Phương án đang hoạt động. Thay đổi phân công mặc định chỉ áp dụng cho những chuyến xe chưa được tạo trong tương lai. Các chuyến xe đã lập lịch giữ nguyên phân công hiện tại.
          </div>
        </div>
      )}

      {/* Header with Title and Filter Segmented Control */}
      <div className="assignment-panel-header">
        <h2 className="assignment-panel-title">Nhóm xe ({groups.length})</h2>
        {groups.length > 1 && (
          <div className="assignment-filter-group" role="group" aria-label="Bộ lọc nhóm xe">
            <button
              ref={filterAllBtnRef}
              type="button"
              className="assignment-filter-btn"
              aria-pressed={filterTab === 'ALL'}
              onClick={() => setFilterTab('ALL')}
            >
              Tất cả
            </button>
            <button
              ref={filterPendingBtnRef}
              type="button"
              className="assignment-filter-btn"
              aria-pressed={filterTab === 'PENDING'}
              onClick={() => setFilterTab('PENDING')}
            >
              Cần xử lý ({actionableCount})
            </button>
          </div>
        )}
      </div>

      {/* Vehicle Groups Accordion Cards */}
      {groups.length === 0 ? (
        <div className="assignment-empty-state">
          <BusIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-slate-600">Phương án chưa có tuyến xe nào</p>
        </div>
      ) : displayedGroups.length === 0 && filterTab === 'PENDING' ? (
        <div className="assignment-empty-state">
          <p className="font-semibold text-slate-600">Không có nhóm xe nào cần xử lý</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => setFilterTab('ALL')}>
            Xem tất cả nhóm xe
          </Button>
        </div>
      ) : (
        displayedGroups.map((group) => {
          const isExpanded = expandedGroupId === group.id;
          const badge = getGroupStatusBadge(group, currentUserRole, editable);
          const hasHiddenRoutes = hiddenRouteIds && group.routes.some((r) => hiddenRouteIds.has(r.id));

          return (
            <div
              key={group.id}
              className="assignment-card"
              data-expanded={isExpanded}
              data-actionable={isActionable(group)}
            >
              {/* Card Header (Accordion toggle) */}
              <button
                ref={(el) => {
                  if (el) groupHeaderRefs.current.set(group.id, el);
                  else groupHeaderRefs.current.delete(group.id);
                }}
                id={`group-header-${group.id}`}
                type="button"
                className="assignment-card-header"
                aria-expanded={isExpanded}
                aria-controls={`group-body-${group.id}`}
                onClick={() => handleToggleGroup(group)}
              >
                <div className="assignment-card-header-left">
                  <ChevronDown className="assignment-chevron" aria-hidden="true" />
                  <div className="assignment-card-title-group">
                    <span className={`assignment-card-plate${!group.vehiclePlate ? ' unassigned' : ''}`}>
                      {group.vehiclePlate || 'Chưa gán xe'}
                    </span>
                    <span className="assignment-card-subtitle">
                      {group.vehiclePlate
                        ? `${group.vehicleBrand || 'Xe'} · ${group.vehicleSeats ? `${group.vehicleSeats} chỗ · ` : ''}${group.routes.length} tuyến`
                        : `${group.routes.length} tuyến`}
                    </span>
                  </div>
                </div>
                <span className={`assignment-badge ${badge.variant}`}>{badge.label}</span>
              </button>

              {/* Card Body (Expanded content) */}
              {isExpanded && (
                <div
                  id={`group-body-${group.id}`}
                  role="region"
                  aria-labelledby={`group-header-${group.id}`}
                  className="assignment-card-body"
                >
                  {/* Row 1: Vehicle */}
                  <div className="assignment-row">
                    <span className="assignment-row-label">Xe</span>
                    <span className={`assignment-row-value${!group.vehiclePlate ? ' pending' : ''}`}>
                      {group.vehiclePlate
                        ? `${group.vehicleBrand ? `${group.vehicleBrand} · ` : ''}${group.vehiclePlate}`
                        : 'Chưa gán xe'}
                    </span>
                    {isSystemAdmin && (
                      <button
                        type="button"
                        className="assignment-btn-action outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal('VEHICLE', group);
                        }}
                      >
                        {group.vehicleId ? 'Đổi xe' : 'Chọn xe'}
                      </button>
                    )}
                  </div>

                  {/* Row 2: Driver */}
                  <div className="assignment-row">
                    <span className="assignment-row-label">Tài xế</span>
                    <span className={`assignment-row-value${!group.driverName ? ' pending' : ''}`}>
                      {group.driverName
                        ? `${group.driverName}${group.driverPhone ? ` · ${group.driverPhone}` : ''}`
                        : isSchoolAdmin
                        ? 'Nhà xe chưa phân công tài xế'
                        : 'Chưa phân công'}
                    </span>
                    {isSystemAdmin && group.vehicleId && (
                      <button
                        type="button"
                        className={`assignment-btn-action ${group.driverId ? 'outline' : 'primary'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal('DRIVER', group);
                        }}
                      >
                        {group.driverId ? 'Đổi tài xế' : 'Phân công tài xế'}
                      </button>
                    )}
                  </div>

                  {/* Row 3: Bus Attendant */}
                  <div className="assignment-row">
                    <span className="assignment-row-label">Giáo viên</span>
                    <span
                      className={`assignment-row-value${
                        !group.busAttendantName ? (isSystemAdmin ? 'muted' : 'pending') : ''
                      }`}
                    >
                      {group.busAttendantName
                        ? `${group.busAttendantName}${group.busAttendantPhone ? ` · ${group.busAttendantPhone}` : ''}`
                        : isSystemAdmin
                        ? 'Chờ nhà trường phân công'
                        : 'Chưa phân công'}
                    </span>
                    {isSchoolAdmin && group.vehicleId && (
                      <button
                        type="button"
                        className={`assignment-btn-action ${group.busAttendantId ? 'outline' : 'primary'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal('ATTENDANT', group);
                        }}
                      >
                        {group.busAttendantId ? 'Đổi giáo viên' : 'Phân công giáo viên'}
                      </button>
                    )}
                  </div>

                  {/* Row 4: Routes inside group */}
                  <div className="assignment-routes-section">
                    <div className="assignment-routes-list">
                      {group.routes.map((r) => {
                        const isToSchool = r.direction === 'TO_SCHOOL';
                        const dotColor = isToSchool ? '#255ddb' : '#8450c4';
                        return (
                          <div key={r.id} className="assignment-route-item">
                            <span
                              className="assignment-route-dot"
                              style={{ backgroundColor: dotColor }}
                              aria-hidden="true"
                            />
                            <span className="assignment-route-name">{r.name}</span>
                            <span className="assignment-route-time">
                              {r.departureTime && r.arrivalTime
                                ? `· ${r.departureTime.slice(0, 5)} – ${r.arrivalTime.slice(0, 5)}`
                                : `· ${r.studentCount} HS`}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="assignment-routes-footer">
                      {hasHiddenRoutes && (
                        <span className="assignment-map-hint" role="status">
                          Tuyến đang bị ẩn trên bản đồ — Bật lại ở mục &ldquo;Hiển thị tuyến&rdquo;
                        </span>
                      )}
                      <button
                        type="button"
                        className="assignment-view-map-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewOnMap?.(group.routes);
                        }}
                      >
                        Xem trên bản đồ ↗
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Person Assignment Modal (Driver / Bus Attendant - Redesigned per SVG) */}
      {editable && (modalType === 'DRIVER' || modalType === 'ATTENDANT') && selectedGroup && (
        <PersonAssignmentModal
          planId={plan.id}
          group={selectedGroup}
          type={modalType}
          currentUserRole={currentUserRole}
          onClose={closeModal}
          onSuccess={() => {
            closeModal();
            onUpdated();
          }}
          onSyncPlan={onUpdated}
        />
      )}

      {/* Vehicle Assignment Modal */}
      {editable && modalType === 'VEHICLE' && selectedGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in"
          onKeyDown={(e) => {
            if (e.key === 'Escape') closeModal();
          }}
        >
          <Card className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-800">
              {selectedGroup.vehicleId ? 'Thay đổi xe cho nhóm tuyến' : 'Chọn xe cho nhóm tuyến'}
            </h3>

            <p className="text-xs text-slate-500">
              Nhóm xe: <strong>{selectedGroup.vehiclePlate || 'Chưa có xe'}</strong> (gồm {selectedGroup.routes.length} tuyến)
            </p>

            {loadingOptions ? (
              <div className="py-8 text-center">
                <SpinnerIcon className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                <span className="text-xs text-slate-500">Đang tải danh sách lựa chọn...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Chọn phương tiện thay thế:
                </label>

                <Select
                  value={selectedResourceId}
                  onChange={(e) => setSelectedResourceId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Chọn xe --</option>
                  {candidateVehicles.map((v) => (
                    <option key={v.id} value={v.id} disabled={!v.isEligible}>
                      {v.licensePlate} ({v.seatCount} chỗ - {v.brand})
                      {!v.isEligible ? ` [✕ ${v.reason}]` : ` [✓ ${v.reason}]`}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {actionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Hủy bỏ
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !selectedResourceId}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                  submitting || !selectedResourceId
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-primary hover:bg-[#e6b74d] text-foreground cursor-pointer shadow-2xs'
                }`}
              >
                {submitting && <SpinnerIcon className="w-4 h-4 animate-spin text-slate-800" />}
                <span>Lưu thay đổi</span>
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
