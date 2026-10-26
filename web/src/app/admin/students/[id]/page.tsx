'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
  ArrowLeftIcon,
  StudentIcon,
  PhoneIcon,
  MapPinIcon,
  SchoolIcon,
  SpinnerIcon,
  AlertIcon,
  CheckIcon,
} from '@/components/icons';
import { QRCodeDisplay } from '@/components/common/qr-code';
import { StatusConfirmModal } from '@/components/admin/students/status-confirm-modal';
import { EmptyRoutePlanActionModal } from '@/components/admin/students/empty-route-plan-action-modal';
import { CancelRoutePlanModal } from '@/components/admin/routes/cancel-route-plan-modal';
import { Tooltip } from '@/components/admin/schools/tooltip';
import { VietMapPicker } from '@/components/admin/schools/vietmap-picker';
import { vietmapService, VietmapSuggestion } from '@/lib/vietmap';
import { RequestDetailModal } from '@/app/admin/requests/request-detail-modal';
import { StudentRoutingSection } from '@/components/admin/students/student-routing-section';
import type { EmptyRoutePlanInfo } from '@/lib/types';

function StudentDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const studentId = params?.id as string;
  const { user } = useAuth();
  const schoolId = user?.schoolId;

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

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
      setIsLoadingHistory(true);
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
      console.error('Error fetching student request history:', err);
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
  const handleStartEditAddress = () => {
    if (!student) return;
    setNewAddressText(student.addressText || '');
    setNewLatitude(student.latitude ?? 10.776889);
    setNewLongitude(student.longitude ?? 106.700806);
    setAddressUpdateError(null);
    setIsEditingAddress(true);
  };

  // Handle address autocomplete search
  const handleAddressInputChange = (val: string) => {
    setNewAddressText(val);
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
    setNewAddressText(sug.address || sug.name);
    setShowAddressSuggestions(false);
    try {
      setIsSearchingAddress(true);
      const details = await vietmapService.getPlaceDetail(sug.refId);
      if (details) {
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
    if (!student || !schoolId || !newAddressText.trim() || !newLatitude || !newLongitude) {
      setAddressUpdateError('Vui lòng chọn địa chỉ và tọa độ hợp lệ.');
      return;
    }
    try {
      setIsSavingAddress(true);
      setAddressUpdateError(null);
      await apiClient.directUpdateStudentAddress(schoolId, student.id, {
        addressText: newAddressText.trim(),
        latitude: newLatitude,
        longitude: newLongitude,
      });
      setStudent({
        ...student,
        addressText: newAddressText.trim(),
        latitude: newLatitude,
        longitude: newLongitude,
        hasAddress: true,
      });
      setIsEditingAddress(false);
      setSuccessToast('Đã cập nhật địa chỉ học sinh thành công.');
      setTimeout(() => setSuccessToast(null), 3500);
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
      setStudent({ ...student, status: targetStatus });
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
      setSuccessToast(
        res.message ||
          (targetStatus === 'AVAILABLE'
            ? 'Đã kích hoạt lại học sinh thành công.'
            : 'Đã vô hiệu hóa học sinh thành công.')
      );
      setIsStatusModalOpen(false);
      setTargetStatus(null);
      setTimeout(() => setSuccessToast(null), 5000);
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
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>Quay lại danh sách học sinh</span>
        </Link>
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
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Toast message */}
      {successToast && (
        <div className="flex items-center gap-2 p-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg animate-in fade-in duration-200">
          <CheckIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

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
            <button
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
            </button>
            <Link
              href={`/admin/routes/plans/${emptyPlanNotice.planId}`}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors cursor-pointer text-xs"
            >
              Xem phương án
            </Link>
            <button
              type="button"
              onClick={() => setEmptyPlanNotice(null)}
              className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Back button */}
      <div>
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>Quay lại danh sách học sinh</span>
        </Link>
      </div>

      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-center gap-4">
          {student.avatarUrl ? (
            <img
              src={student.avatarUrl}
              alt={student.fullName}
              className="w-16 h-16 rounded-full object-cover border-2 border-amber-400"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 font-bold text-2xl flex items-center justify-center border-2 border-amber-300">
              {student.fullName.charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{student.fullName}</h1>
              {isAvailable ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Khả dụng
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                  Đã vô hiệu hóa
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Mã học sinh: <span className="font-mono font-bold text-slate-800">{student.code}</span>
            </p>
          </div>
        </div>

        {/* Action button */}
        <div>
          <button
            type="button"
            onClick={handleOpenStatusModal}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer border ${
              isAvailable
                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            {isAvailable ? 'Vô hiệu hóa học sinh' : 'Kích hoạt lại học sinh'}
          </button>
        </div>
      </div>

      {/* Main Grid: Info + QR Code */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Column (2 spans) */}
        <div className="md:col-span-2 space-y-6">
          {/* Card: Thông tin chi tiết */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <StudentIcon className="w-4 h-4 text-amber-500" />
              Thông tin học sinh
            </h2>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <dt className="text-slate-400 font-medium">Họ và tên</dt>
                <dd className="text-slate-800 font-semibold mt-0.5">{student.fullName}</dd>
              </div>

              <div>
                <dt className="text-slate-400 font-medium">Mã học sinh</dt>
                <dd className="font-mono font-semibold text-slate-900 mt-0.5">{student.code}</dd>
              </div>

              <div>
                <dt className="text-slate-400 font-medium">Số điện thoại phụ huynh</dt>
                <dd className="text-slate-800 font-semibold mt-0.5 flex items-center gap-1.5">
                  <PhoneIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>{student.guardianPhone}</span>
                </dd>
              </div>

              <div>
                <dt className="text-slate-400 font-medium">Trường học</dt>
                <dd className="text-slate-800 font-semibold mt-0.5 flex items-center gap-1.5">
                  <SchoolIcon className="w-3.5 h-3.5 text-amber-500" />
                  <span>{student.schoolName || 'Trường học'}</span>
                </dd>
              </div>

              <div>
                <dt className="text-slate-400 font-medium">Tình trạng địa chỉ</dt>
                <dd className="mt-1">
                  {student.hasAddress ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Đã có địa chỉ
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Chưa có địa chỉ
                    </span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-slate-400 font-medium">Trạng thái tài khoản</dt>
                <dd className="mt-1">
                  {isAvailable ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Khả dụng
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                      Đã vô hiệu hóa
                    </span>
                  )}
                </dd>
              </div>
            </dl>

            {/* Address Details & Direct Update */}
            <div className="border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between mb-1">
                <dt className="text-slate-400 font-medium text-xs">Địa chỉ đón trả</dt>
                {isAvailable && !isEditingAddress && (
                  <button
                    type="button"
                    onClick={handleStartEditAddress}
                    className="text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
                  >
                    Chỉnh sửa địa chỉ
                  </button>
                )}
                {!isAvailable && (
                  <span className="text-[11px] text-slate-400 italic">
                    Không thể sửa khi học sinh bị vô hiệu hóa
                  </span>
                )}
              </div>

              {!isEditingAddress ? (
                student.addressText ? (
                  <div className="flex items-start gap-2 text-xs text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <MapPinIcon className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span>{student.addressText}</span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Chưa cập nhật địa chỉ nhà cho học sinh này.</p>
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
                    <input
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
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {addressSuggestions.map((sug) => (
                          <button
                            key={sug.refId}
                            type="button"
                            onClick={() => handleSelectAddressSuggestion(sug)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 border-b border-slate-50 last:border-none"
                          >
                            <span className="font-semibold text-slate-900 block">{sug.name}</span>
                            <span className="text-slate-500 text-[11px] block">{sug.address || sug.display}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Map Picker */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <VietMapPicker
                      latitude={newLatitude}
                      longitude={newLongitude}
                      onChangeCoordinates={(lat: number, lng: number) => {
                        setNewLatitude(lat);
                        setNewLongitude(lng);
                      }}
                      onAddressSelect={(addr: string) => {
                        if (addr) setNewAddressText(addr);
                      }}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isSavingAddress}
                      onClick={() => setIsEditingAddress(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      disabled={isSavingAddress || !newAddressText.trim() || !newLatitude || !newLongitude}
                      onClick={handleSaveAddress}
                      className="px-4 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      {isSavingAddress && <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />}
                      Lưu địa chỉ
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* QR Code Column (1 span) */}
        <div className="space-y-6">
          <QRCodeDisplay
            studentCode={student.code}
            studentName={student.fullName}
          />
        </div>
      </div>

      {/* Route Management Section */}
      <StudentRoutingSection studentId={student.id} studentName={student.fullName} />

      {/* Request History Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <StudentIcon className="w-4 h-4 text-amber-500" />
              Lịch sử yêu cầu cập nhật của học sinh
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi và xử lý các yêu cầu cập nhật thông tin và địa chỉ gửi từ phụ huynh.
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <select
              value={historyTypeFilter}
              onChange={(e) => {
                setHistoryTypeFilter(e.target.value as RequestType | '');
                setHistoryPage(1);
              }}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
            >
              <option value="">Tất cả loại yêu cầu</option>
              <option value="INFORMATION_UPDATE">Cập nhật thông tin</option>
              <option value="ADDRESS_UPDATE">Cập nhật địa chỉ</option>
            </select>

            <select
              value={historyStatusFilter}
              onChange={(e) => {
                setHistoryStatusFilter(e.target.value as RequestStatus | '');
                setHistoryPage(1);
              }}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Đã từ chối</option>
            </select>
          </div>
        </div>

        {/* Request History Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
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

              {!isLoadingHistory && historyRequests.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                    Chưa có yêu cầu cập nhật nào cho học sinh này.
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
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Chờ duyệt
                        </span>
                      )}
                      {req.status === 'APPROVED' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Đã duyệt
                        </span>
                      )}
                      {req.status === 'REJECTED' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Đã từ chối
                        </span>
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
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedHistoryRequestId(req.id);
                          setIsDetailModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* History Pagination */}
        {!isLoadingHistory && historyTotalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
            <span>
              Tổng số {historyTotal} yêu cầu
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={historyPage <= 1}
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-md border border-slate-200 bg-white disabled:opacity-50"
              >
                Trước
              </button>
              <span>{historyPage} / {historyTotalPages}</span>
              <button
                type="button"
                disabled={historyPage >= historyTotalPages}
                onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                className="px-2.5 py-1 rounded-md border border-slate-200 bg-white disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

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
            setSuccessToast(
              'Đã hủy toàn bộ phương án tuyến thành công. Tài nguyên xe và tài xế đã được giải phóng.',
            );
            setTimeout(() => setSuccessToast(null), 5000);
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
