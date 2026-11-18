'use client';
import { canDirectlyUpdateAddress, validCoordinates } from '@/lib/school-admin';
import { ParentLinkHistory } from '@/components/admin/students/parent-link-history';
import { BackLink, ContextLink } from '@/components/admin/common/context-navigation';
import { FilterToolbar, FilterField } from '@/components/ui/filter-toolbar';

import { toast } from '@/stores/toast-store';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { SchoolAdminGuard } from '@/components/admin/school-admin-guard';
import { apiClient } from '@/lib/api-client';
import type {
  StudentDetail,
  StudentStatus,
  StudentUpdateRequest,
  RequestStatus,
  RequestType,
} from '@/lib/types';
import {
  StudentIcon,
  PhoneIcon,
  MapPinIcon,
  SchoolIcon,
  SpinnerIcon,
  AlertIcon,
  QrCodeIcon,
  RequestIcon,
} from '@/components/icons';
import { StudentRfidCard } from '@/components/admin/students/student-rfid-card';
import { QRCodeDisplay } from '@/components/common/qr-code';
import { StatusConfirmModal } from '@/components/admin/students/status-confirm-modal';
import { EmptyRoutePlanActionModal } from '@/components/admin/students/empty-route-plan-action-modal';
import { CancelRoutePlanModal } from '@/components/admin/routes/cancel-route-plan-modal';
import { Tooltip } from '@/components/admin/schools/tooltip';
import { VietMapPicker } from '@/components/admin/schools/vietmap-picker';
import { vietmapService, VietmapSuggestion } from '@/lib/vietmap';
import { RequestDetailModal } from '@/components/admin/requests/request-detail-modal';
import { StudentRoutingSection } from '@/components/admin/students/student-routing-section';
import type { EmptyRoutePlanInfo } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table } from '@/components/ui/table';
import { PageNavigation } from '@/components/admin/common/pagination-control';

function StudentDetailPageContent() {
  const params = useParams();
  const studentId = params?.id as string;
  const { user } = useAuth();
  const schoolId = user?.schoolId;

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);


  // Status modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<StudentStatus | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // 1. Direct Address Update State
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [newAddressText, setNewAddressText] = useState('');
  const [newLatitude, setNewLatitude] = useState<number | null>(null);
  const [newLongitude, setNewLongitude] = useState<number | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<VietmapSuggestion[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressUpdateError, setAddressUpdateError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 2. Request History State
  const [historyError, setHistoryError] = useState('');
  const addressVersion = useRef(0);
  const [addressChecking, setAddressChecking] = useState(false);
  const [historyRequests, setHistoryRequests] = useState<StudentUpdateRequest[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTypeFilter, setHistoryTypeFilter] = useState<RequestType | ''>('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<RequestStatus | ''>('');
  const [selectedHistoryRequestId, setSelectedHistoryRequestId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchStudent = useCallback(async () => {
    if (!schoolId || !studentId) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await apiClient.getStudent(schoolId, studentId);
      setStudent(data);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Không thể tải thông tin học sinh hoặc học sinh không tồn tại.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [schoolId, studentId]);

  const fetchHistoryRequests = useCallback(async () => {
    if (!schoolId || !studentId) return;
    try {
      setIsLoadingHistory(true); setHistoryError('');
      const res = await apiClient.listStudentRequestHistory(schoolId, studentId, {
        page: historyPage,
        limit: 5,
        type: historyTypeFilter || undefined,
        status: historyStatusFilter || undefined,
      });
      setHistoryRequests(res.items);
      setHistoryTotal(res.total);
      setHistoryTotalPages(res.totalPages);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'Không thể tải lịch sử yêu cầu.');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [schoolId, studentId, historyPage, historyTypeFilter, historyStatusFilter]);

  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

  useEffect(() => {
    fetchHistoryRequests();
  }, [fetchHistoryRequests]);

  // Handle start editing address
  const handleStartEditAddress = async () => {
    if (!student || !schoolId || addressChecking) return;
    setAddressChecking(true); setAddressUpdateError(null);
    try {
      const impact = await apiClient.getStudentDisableImpact(schoolId, student.id);
      if (!canDirectlyUpdateAddress(impact)) throw new Error('Học sinh đang có tuyến. Cần nhà xe kiểm tra lộ trình trước khi đổi địa chỉ.');
      setNewAddressText(student.addressText || '');
      setNewLatitude(student.latitude ?? null); setNewLongitude(student.longitude ?? null);
      setIsEditingAddress(true);
    } catch (error) { setAddressUpdateError(error instanceof Error ? error.message : 'Không thể kiểm tra tuyến.'); }
    finally { setAddressChecking(false); }
  };

  // Handle address autocomplete search
  const handleAddressInputChange = (val: string) => {
    const version = ++addressVersion.current;
    setNewAddressText(val); setNewLatitude(null); setNewLongitude(null);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!val.trim() || val.length < 2) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSearchingAddress(true);
        const results = await vietmapService.autocomplete(val.trim());
        if (version !== addressVersion.current) return;
        setAddressSuggestions(results);
        setShowAddressSuggestions(true);
      } catch (err) {
        console.error('Error searching address:', err);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 300);
  };

  const handleSelectAddressSuggestion = async (sug: VietmapSuggestion) => {
    const version = ++addressVersion.current;
    setNewAddressText(sug.address || sug.name);
    setNewLatitude(null); setNewLongitude(null);
    setShowAddressSuggestions(false);
    try {
      setIsSearchingAddress(true);
      const details = await vietmapService.getPlaceDetail(sug.refId);
      if (details && version === addressVersion.current) {
        setNewLatitude(details.latitude);
        setNewLongitude(details.longitude);
        if (details.addressText) setNewAddressText(details.addressText);
      }
    } catch (err) {
      console.error('Error getting place details:', err);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!student || !schoolId || !newAddressText.trim() || newLatitude === null || newLongitude === null || !validCoordinates(newLatitude, newLongitude)) {
      setAddressUpdateError('Vui lòng chọn địa chỉ và tọa độ hợp lệ.');
      return;
    }
    try {
      setIsSavingAddress(true);
      setAddressUpdateError(null);
      const impact = await apiClient.getStudentDisableImpact(schoolId, student.id);
      if (!canDirectlyUpdateAddress(impact)) throw new Error('Học sinh đã có tuyến. Cần nhà xe xử lý thay đổi địa chỉ.');
      await apiClient.directUpdateStudentAddress(schoolId, student.id, {
        addressText: newAddressText.trim(),
        latitude: newLatitude,
        longitude: newLongitude,
      });
      await fetchStudent();
      setIsEditingAddress(false);
      toast.success('Đã cập nhật địa chỉ học sinh thành công.');

      fetchHistoryRequests();
    } catch (err: any) {
      setAddressUpdateError(err?.message || 'Không thể cập nhật địa chỉ học sinh.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleOpenStatusModal = () => {
    if (!student) return;
    setTargetStatus(student.status === 'AVAILABLE' ? 'DISABLED' : 'AVAILABLE');
    setIsStatusModalOpen(true);
  };

  const [emptyPlanNotice, setEmptyPlanNotice] = useState<{
    planId: string;
    planName: string;
    routeName: string;
  } | null>(null);

  const [emptyRouteActionData, setEmptyRouteActionData] = useState<{
    studentName: string;
    emptyRoutePlans: EmptyRoutePlanInfo[];
  } | null>(null);

  const [cancellingPlan, setCancellingPlan] = useState<{
    planId: string;
    planName: string;
    defaultReason: string;
  } | null>(null);

  const handleConfirmStatusChange = async () => {
    if (!student || !targetStatus || !schoolId) return;
    try {
      setIsUpdatingStatus(true);
      const res = await apiClient.updateStudentStatus(schoolId, student.id, targetStatus);
      setStudent({ ...student, status: targetStatus, ...(targetStatus === "DISABLED" ? { rfidCardUid: null } : {}) });
      if (res.emptyRoutePlans && res.emptyRoutePlans.length > 0) {
        setEmptyPlanNotice(res.emptyRoutePlans[0]);
        setEmptyRouteActionData({
          studentName: student.fullName,
          emptyRoutePlans: res.emptyRoutePlans,
        });
      } else {
        setEmptyPlanNotice(null);
        setEmptyRouteActionData(null);
      }
      toast.success(
        res.message ||
          (targetStatus === 'AVAILABLE'
            ? 'Đã kích hoạt lại học sinh thành công.'
            : 'Đã vô hiệu hóa học sinh thành công.')
      );
      setIsStatusModalOpen(false);
      setTargetStatus(null);

    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể cập nhật trạng thái học sinh.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-slate-500">
        <SpinnerIcon className="w-6 h-6 animate-spin text-amber-500 mb-2" />
        <span className="text-sm">Đang tải thông tin chi tiết học sinh...</span>
      </div>
    );
  }

  if (errorMessage || !student) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <BackLink fallback="/admin/students" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors" />
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-800 text-center">
          <AlertIcon className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <h2 className="text-base font-bold">Không thể tải thông tin học sinh</h2>
          <p className="text-xs text-red-600 mt-1">{errorMessage}</p>
        </div>
      </div>
    );
  }

  const isAvailable = student.status === 'AVAILABLE';

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Toast message */}


      {/* Cảnh báo tuyến rỗng cần hủy phương án để tối ưu lại */}
      {emptyPlanNotice && (
        <div className="flex items-start justify-between gap-3 p-3.5 text-xs text-rose-900 bg-rose-50 border border-rose-200 rounded-xl animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <AlertIcon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-900">
                Tuyến {emptyPlanNotice.routeName} không còn học sinh (Vi phạm quy tắc vận hành)!
              </p>
              <p className="text-rose-800/90 mt-0.5">
                Học sinh vừa vô hiệu hóa là học sinh cuối cùng của tuyến. Hệ thống yêu cầu hủy phương án{' '}
                <strong>{emptyPlanNotice.planName}</strong> để tối ưu lại phương án tuyến cho nhà trường.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              onClick={() => {
                setCancellingPlan({
                  planId: emptyPlanNotice.planId,
                  planName: emptyPlanNotice.planName,
                  defaultReason: `Tuyến ${emptyPlanNotice.routeName} không còn học sinh sau khi vô hiệu hóa học sinh`,
                });
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors cursor-pointer text-xs"
            >
              Hủy toàn bộ phương án
            </Button>
            <ContextLink data-variant="outline" data-size="sm"
              href={`/admin/routes/plans/${emptyPlanNotice.planId}`}
              className="ui-button px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors cursor-pointer text-xs"
            >
              Xem phương án
            </ContextLink>
            <Button
              type="button"
              onClick={() => setEmptyPlanNotice(null)}
              className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </Button>
          </div>
        </div>
      )}

      {/* Back button */}
      <div>
        <BackLink fallback="/admin/students" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors" />
      </div>

      {/* Top Header Card */}
      <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-center gap-4 min-w-0">
          {student.avatarUrl ? (
            <img
              src={student.avatarUrl}
              alt={student.fullName}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400 shadow-xs shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-900 font-bold text-2xl flex items-center justify-center shadow-xs shrink-0">
              {student.fullName.charAt(0).toUpperCase()}
            </div>
          )}

          <PageHeader className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 leading-snug">{student.fullName}</h1>
              {isAvailable ? (
                <Badge className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  Khả dụng
                </Badge>
              ) : (
                <Badge className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300 whitespace-nowrap shrink-0">
                  Đã vô hiệu hóa
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <span>Mã học sinh:</span>
              <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded text-[11px] border border-slate-200">
                {student.code}
              </span>
            </p>
          </PageHeader>
        </div>

        {/* Action button */}
        <div className="shrink-0">
          <Button
            type="button"
            onClick={handleOpenStatusModal}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer border shadow-xs whitespace-nowrap shrink-0 ${
              isAvailable
                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:border-rose-300'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
            }`}
          >
            {isAvailable ? 'Vô hiệu hóa học sinh' : 'Kích hoạt lại học sinh'}
          </Button>
        </div>
      </Card>

      {/* Main Grid: Info + QR Code */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Column (2 spans) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Thông tin chi tiết */}
          <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <StudentIcon className="w-4 h-4 text-amber-500" />
              Thông tin học sinh
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-slate-400 font-medium block text-[11px]">Họ và tên</span>
                <span className="text-slate-800 font-semibold mt-0.5 block">{student.fullName}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-slate-400 font-medium block text-[11px]">Mã học sinh</span>
                <span className="font-mono font-bold text-slate-900 mt-0.5 block">{student.code}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-slate-400 font-medium block text-[11px]">Số điện thoại phụ huynh</span>
                <span className="text-slate-800 font-semibold mt-0.5 flex items-center gap-1.5">
                  <PhoneIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>{student.guardianPhone}</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-slate-400 font-medium block text-[11px]">Trường học</span>
                <span className="text-slate-800 font-semibold mt-0.5 flex items-center gap-1.5">
                  <SchoolIcon className="w-3.5 h-3.5 text-amber-500" />
                  <span>{student.schoolName || 'Trường học'}</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-slate-400 font-medium block text-[11px]">Tình trạng địa chỉ</span>
                <div className="mt-1">
                  {student.hasAddress ? (
                    <Badge className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Đã có địa chỉ
                    </Badge>
                  ) : (
                    <Badge className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Chưa có địa chỉ
                    </Badge>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-slate-400 font-medium block text-[11px]">Trạng thái tài khoản</span>
                <div className="mt-1">
                  {isAvailable ? (
                    <Badge className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Khả dụng
                    </Badge>
                  ) : (
                    <Badge className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                      Đã vô hiệu hóa
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {addressUpdateError && !isEditingAddress && <p role="alert" className="text-sm text-rose-700">{addressUpdateError}</p>}
            {/* Address Details & Direct Update */}
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-700 font-bold text-xs flex items-center gap-1.5">
                  <MapPinIcon className="w-3.5 h-3.5 text-amber-500" />
                  Địa chỉ đón trả
                </span>
                {isAvailable && !isEditingAddress && (
                  <Button
                    type="button"
                    onClick={() => void handleStartEditAddress()} disabled={addressChecking}
                    className="text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
                  >
                    Chỉnh sửa địa chỉ
                  </Button>
                )}
                {!isAvailable && (
                  <span className="text-[11px] text-slate-400 italic">
                    Không thể sửa khi học sinh bị vô hiệu hóa
                  </span>
                )}
              </div>

              {!isEditingAddress ? (
                student.addressText ? (
                  <div className="flex items-start gap-3 text-xs text-slate-800 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
                    <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-600 shrink-0 mt-0.5">
                      <MapPinIcon className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-medium text-slate-800 block leading-relaxed">{student.addressText}</span>
                      {student.latitude && student.longitude && (
                        <span className="text-[11px] font-mono text-slate-400 block">
                          Tọa độ: {student.latitude.toFixed(6)}, {student.longitude.toFixed(6)}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 italic text-center">
                    Chưa cập nhật địa chỉ nhà cho học sinh này.
                  </div>
                )
              ) : (
                <div className="space-y-3 bg-amber-50/30 p-4 rounded-xl border border-amber-200 mt-2">
                  <span className="text-xs font-bold text-slate-900 block">Cập nhật địa chỉ đón trả trực tiếp</span>

                  {addressUpdateError && (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-1.5">
                      <AlertIcon className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{addressUpdateError}</span>
                    </div>
                  )}

                  {/* Autocomplete Input */}
                  <div className="relative">
                    <Input
                      type="text"
                      value={newAddressText}
                      onChange={(e) => handleAddressInputChange(e.target.value)}
                      placeholder="Tìm kiếm địa chỉ bằng VietMap..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-400 bg-white"
                    />
                    {isSearchingAddress && (
                      <SpinnerIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-amber-500" />
                    )}

                    {showAddressSuggestions && addressSuggestions.length > 0 && (
                      <Card className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {addressSuggestions.map((sug) => (
                          <Button
                            key={sug.refId}
                            type="button"
                            onClick={() => handleSelectAddressSuggestion(sug)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 border-b border-slate-50 last:border-none"
                          >
                            <span className="font-semibold text-slate-900 block">{sug.name}</span>
                            <span className="text-slate-500 text-[11px] block">{sug.address || sug.display}</span>
                          </Button>
                        ))}
                      </Card>
                    )}
                  </div>

                  {/* Map Picker */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <VietMapPicker
                      latitude={newLatitude}
                      longitude={newLongitude}
                      onChangeCoordinates={(lat: number, lng: number) => {
                        addressVersion.current += 1;
                        setNewLatitude(lat);
                        setNewLongitude(lng);
                      }}
                      onAddressSelect={(addr: string) => {
                        if (addr) setNewAddressText(addr);
                      }}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      disabled={isSavingAddress}
                      onClick={() => setIsEditingAddress(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Hủy bỏ
                    </Button>
                    <Button
                      type="button"
                      disabled={isSavingAddress || !newAddressText.trim() || newLatitude === null || newLongitude === null || !validCoordinates(newLatitude, newLongitude)}
                      onClick={handleSaveAddress}
                      className="px-4 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      {isSavingAddress && <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />}
                      Lưu địa chỉ
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* QR Code Column (1 span) */}
        <div className="space-y-6">
          <StudentRfidCard student={student} onUpdated={() => undefined} />
          <Card className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col items-center space-y-3">
            <div className="w-full flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <QrCodeIcon className="w-4 h-4 text-amber-500" />
                Mã QR điểm danh
              </h2>
              <span className="text-[11px] text-slate-400 font-medium">Cá nhân</span>
            </div>
            <QRCodeDisplay
              studentCode={student.code}
              studentName={student.fullName}
            />
            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              Dùng để quét điểm danh khi lên và xuống xe buýt.
            </p>
          </Card>
        </div>
      </div>

      <ParentLinkHistory audit={student.parentLinkAudit} />
      {/* Route Management Section */}
      <StudentRoutingSection studentId={student.id} studentName={student.fullName} />

      {/* Request History Section */}
      <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <RequestIcon className="w-4 h-4 text-amber-500" />
              Lịch sử yêu cầu cập nhật của học sinh
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi và xử lý các yêu cầu cập nhật thông tin và địa chỉ gửi từ phụ huynh.
            </p>
          </div>
          {historyError && (
            <div role="alert" className="text-xs text-rose-700 flex items-center gap-2">
              <span>{historyError}</span>
              <Button variant="outline" size="sm" onClick={() => void fetchHistoryRequests()}>
                Thử lại
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div>
          <FilterToolbar
            hasActiveFilters={Boolean(historyTypeFilter || historyStatusFilter)}
            onReset={() => {
              setHistoryTypeFilter('');
              setHistoryStatusFilter('');
              setHistoryPage(1);
            }}
          >
            <FilterField label="Loại yêu cầu">
              <Select
                value={historyTypeFilter}
                onChange={(e) => {
                  setHistoryTypeFilter(e.target.value as RequestType | '');
                  setHistoryPage(1);
                }}
                className="w-full sm:w-48 text-xs"
              >
                <option value="">Tất cả loại yêu cầu</option>
                <option value="INFORMATION_UPDATE">Cập nhật thông tin</option>
                <option value="ADDRESS_UPDATE">Cập nhật địa chỉ</option>
              </Select>
            </FilterField>

            <FilterField label="Trạng thái">
              <Select
                value={historyStatusFilter}
                onChange={(e) => {
                  setHistoryStatusFilter(e.target.value as RequestStatus | '');
                  setHistoryPage(1);
                }}
                className="w-full sm:w-48 text-xs"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="PENDING">Chờ duyệt</option>
                <option value="APPROVED">Đã duyệt</option>
                <option value="REJECTED">Đã từ chối</option>
              </Select>
            </FilterField>
          </FilterToolbar>
        </div>

        {/* Request History Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <Table className="w-full text-left border-collapse text-xs" minWidth={900}>
            <colgroup><col /><col style={{ width: 150 }} /><col style={{ width: 180 }} /><col style={{ width: 180 }} /><col style={{ width: 150 }} /></colgroup>
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <th className="p-3 pl-4">Loại yêu cầu</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Ngày gửi</th>
                <th className="p-3">Ngày xử lý</th>
                <th className="p-3 pr-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingHistory && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">
                    <SpinnerIcon className="w-4 h-4 animate-spin mx-auto text-amber-500 mb-1" />
                    <span>Đang tải lịch sử yêu cầu...</span>
                  </td>
                </tr>
              )}

              {!isLoadingHistory && !historyError && historyRequests.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 px-4 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400 space-y-1.5">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                        <RequestIcon className="w-5 h-5 text-slate-400" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700">Chưa có yêu cầu cập nhật</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Chưa có yêu cầu thay đổi thông tin hay địa chỉ nào được ghi nhận cho học sinh này.
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoadingHistory &&
                historyRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 pl-4">
                      {req.type === 'ADDRESS_UPDATE' ? (
                        <span className="inline-flex items-center gap-1 text-blue-700 font-medium">
                          <MapPinIcon className="w-3 h-3" />
                          Cập nhật địa chỉ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-purple-700 font-medium">
                          <StudentIcon className="w-3 h-3" />
                          Cập nhật thông tin
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {req.status === 'PENDING' && (
                        <Badge className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Chờ duyệt
                        </Badge>
                      )}
                      {req.status === 'APPROVED' && (
                        <Badge className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Đã duyệt
                        </Badge>
                      )}
                      {req.status === 'REJECTED' && (
                        <Badge className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Đã từ chối
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-slate-600">
                      {new Date(req.createdAt).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-3 text-slate-500">
                      {req.reviewedAt
                        ? new Date(req.reviewedAt).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <Button
                        type="button"
                        onClick={() => {
                          setSelectedHistoryRequestId(req.id);
                          setIsDetailModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        Xem chi tiết
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </Table>
        </div>

        {/* History Pagination */}
        {!isLoadingHistory && historyTotalPages > 1 && (
          <div className="ui-pagination-history">
            <span>Tổng số {historyTotal} yêu cầu</span>
            <PageNavigation
              page={historyPage}
              totalPages={historyTotalPages}
              onPageChange={(nextPage) => setHistoryPage(Math.max(1, Math.min(historyTotalPages, nextPage)))}
            />
          </div>
        )}
      </Card>

      {/* Shared Request Detail Modal */}
      {schoolId && (
        <RequestDetailModal
          isOpen={isDetailModalOpen}
          requestId={selectedHistoryRequestId}
          role="SCHOOL_ADMIN"
          schoolId={schoolId}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedHistoryRequestId(null);
          }}
          onActionSuccess={() => {
            fetchStudent();
            fetchHistoryRequests();
          }}
        />
      )}

      {/* Status Confirm Modal */}
      {student && targetStatus && (
        <StatusConfirmModal
          isOpen={isStatusModalOpen}
          student={{
            id: student.id,
            code: student.code,
            fullName: student.fullName,
            guardianPhone: student.guardianPhone,
            avatarUrl: student.avatarUrl,
            status: student.status,
            hasAddress: student.hasAddress,
            createdAt: student.createdAt,
          }}
          targetStatus={targetStatus}
          isLoading={isUpdatingStatus}
          onClose={() => {
            setIsStatusModalOpen(false);
            setTargetStatus(null);
          }}
          onConfirm={handleConfirmStatusChange}
        />
      )}

      {/* Empty Route Plan Action Modal (Triggered when disabling the last student of a route) */}
      {emptyRouteActionData && (
        <EmptyRoutePlanActionModal
          isOpen={Boolean(emptyRouteActionData)}
          studentName={emptyRouteActionData.studentName}
          emptyRoutePlans={emptyRouteActionData.emptyRoutePlans}
          onCancelPlanNow={(targetPlan) => {
            const planToCancel = {
              planId: targetPlan.planId,
              planName: targetPlan.planName,
              defaultReason: `Tuyến ${targetPlan.routeName} không còn học sinh sau khi vô hiệu hóa học sinh ${emptyRouteActionData.studentName}`,
            };
            setEmptyRouteActionData(null);
            setCancellingPlan(planToCancel);
          }}
          onClose={() => setEmptyRouteActionData(null)}
        />
      )}

      {/* Cancel Route Plan Modal (Can be triggered directly without leaving page) */}
      {cancellingPlan && (
        <CancelRoutePlanModal
          isOpen={Boolean(cancellingPlan)}
          routePlanId={cancellingPlan.planId}
          routePlanName={cancellingPlan.planName}
          defaultReason={cancellingPlan.defaultReason}
          onClose={() => setCancellingPlan(null)}
          onSuccess={() => {
            setCancellingPlan(null);
            setEmptyPlanNotice(null);


            fetchStudent();
          }}
        />
      )}
    </div>
  );
}

export default function AdminStudentDetailPage() {
  return (
    <SchoolAdminGuard>
      <StudentDetailPageContent />
    </SchoolAdminGuard>
  );
}
