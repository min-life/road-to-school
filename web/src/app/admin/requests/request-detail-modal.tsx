'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import type { StudentUpdateRequestDetail, UserRole, SystemRequestRoutingPreviewResponse } from '@/lib/types';
import {
  SpinnerIcon,
  AlertIcon,
  CheckIcon,
  MapPinIcon,
  StudentIcon,
  PhoneIcon,
  CloseIcon,
  RouteIcon,
} from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface RequestDetailModalProps {
  isOpen: boolean;
  requestId: string | null;
  role: UserRole;
  schoolId?: string;
  onClose: () => void;
  onActionSuccess: () => void;
}

export function RequestDetailModal({
  isOpen,
  requestId,
  role,
  schoolId,
  onClose,
  onActionSuccess,
}: RequestDetailModalProps) {
  const [detail, setDetail] = useState<StudentUpdateRequestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Approve dialog
  const [isConfirmingApprove, setIsConfirmingApprove] = useState(false);
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);

  // Reject dialog
  const [isConfirmingReject, setIsConfirmingReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Routing Preview state (for SYSTEM_ADMIN on ADDRESS_UPDATE)
  const [routingPreview, setRoutingPreview] = useState<SystemRequestRoutingPreviewResponse | null>(null);
  const [isLoadingRoutingPreview, setIsLoadingRoutingPreview] = useState(false);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [maxRouteDurationMinutes, setMaxRouteDurationMinutes] = useState(90);
  const [defaultStopServiceSeconds, setDefaultStopServiceSeconds] = useState(60);
  const [selectedOutcome, setSelectedOutcome] = useState<'DIRECT_UPDATE' | 'REOPTIMIZED' | 'REMOVED_FROM_ROUTES'>('DIRECT_UPDATE');

  // Load detail
  useEffect(() => {
    if (!isOpen || !requestId) {
      setDetail(null);
      setError(null);
      setIsConfirmingApprove(false);
      setIsConfirmingReject(false);
      setRejectReason('');
      setRoutingPreview(null);
      setRoutingError(null);
      return;
    }

    let isMounted = true;
    async function fetchDetail() {
      try {
        setIsLoading(true);
        setError(null);
        let data: StudentUpdateRequestDetail;
        if (role === 'SYSTEM_ADMIN') {
          data = await apiClient.getSystemAdminRequestDetail(requestId!);
        } else if (schoolId) {
          data = await apiClient.getSchoolRequestDetail(schoolId, requestId!);
        } else {
          throw new Error('Thiếu thông tin trường học để xem chi tiết.');
        }

        if (isMounted) {
          setDetail(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Không thể tải chi tiết yêu cầu cập nhật.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [isOpen, requestId, role, schoolId]);

  if (!isOpen) return null;

  const handleCheckRouting = async () => {
    if (!detail) return;
    setIsLoadingRoutingPreview(true);
    setRoutingError(null);
    try {
      const res = await apiClient.getSystemRequestRoutingPreview(detail.id, {
        maxRouteDurationMinutes,
        defaultStopServiceSeconds,
      });
      setRoutingPreview(res);
      if (res.overallFeasibility === 'FEASIBLE') {
        setSelectedOutcome('REOPTIMIZED');
      } else if (res.overallFeasibility === 'INFEASIBLE') {
        setSelectedOutcome('REMOVED_FROM_ROUTES');
      } else if (res.routes.length === 0) {
        setSelectedOutcome('DIRECT_UPDATE');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể kiểm tra định tuyến';
      setRoutingError(msg);
    } finally {
      setIsLoadingRoutingPreview(false);
    }
  };

  const handleApprove = async (outcomeOverride?: 'DIRECT_UPDATE' | 'REOPTIMIZED' | 'REMOVED_FROM_ROUTES') => {
    if (!detail) return;
    try {
      setIsSubmittingApprove(true);
      setError(null);
      const outcome = outcomeOverride || selectedOutcome;
      if (role === 'SYSTEM_ADMIN') {
        await apiClient.approveSystemAdminRequest(detail.id, {
          decision: outcome,
          resolutionOutcome: outcome,
          previewToken: routingPreview?.previewToken || undefined,
          expectedFingerprint: routingPreview?.expectedFingerprint || undefined,
        });
      } else if (schoolId) {
        await apiClient.approveSchoolRequest(schoolId, detail.id);
      }
      setIsConfirmingApprove(false);
      onActionSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Không thể phê duyệt yêu cầu. Vui lòng thử lại.');
      setIsConfirmingApprove(false);
      // Refresh to get updated status/isStale
      if (role === 'SYSTEM_ADMIN') {
        apiClient.getSystemAdminRequestDetail(detail.id).then(setDetail).catch(() => {});
      } else if (schoolId) {
        apiClient.getSchoolRequestDetail(schoolId, detail.id).then(setDetail).catch(() => {});
      }
    } finally {
      setIsSubmittingApprove(false);
    }
  };

  const handleReject = async () => {
    if (!detail) return;
    try {
      setIsSubmittingReject(true);
      setError(null);
      const reasonTrimmed = rejectReason.trim() ? rejectReason.trim() : undefined;
      if (role === 'SYSTEM_ADMIN') {
        await apiClient.rejectSystemAdminRequest(detail.id, {
          rejectionReason: reasonTrimmed,
        });
      } else if (schoolId) {
        await apiClient.rejectSchoolRequest(schoolId, detail.id, {
          rejectionReason: reasonTrimmed,
        });
      }
      setIsConfirmingReject(false);
      onActionSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Không thể từ chối yêu cầu. Vui lòng thử lại.');
      setIsConfirmingReject(false);
      if (role === 'SYSTEM_ADMIN') {
        apiClient.getSystemAdminRequestDetail(detail.id).then(setDetail).catch(() => {});
      } else if (schoolId) {
        apiClient.getSchoolRequestDetail(schoolId, detail.id).then(setDetail).catch(() => {});
      }
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Chờ duyệt
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Đã duyệt
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Đã từ chối
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            Phụ huynh đã hủy
          </Badge>
        );
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    if (type === 'ADDRESS_UPDATE') {
      return (
        <Badge className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <MapPinIcon className="w-3 h-3" />
          Cập nhật địa chỉ
        </Badge>
      );
    }
    return (
      <Badge className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
        <StudentIcon className="w-3 h-3" />
        Cập nhật thông tin
      </Badge>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <Card className="ui-dialog-panel ui-dialog-panel-body bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-900">Chi tiết yêu cầu cập nhật</h2>
            {detail && getStatusBadge(detail.status)}
            {detail && getTypeBadge(detail.type)}
          </div>
          <Button
            onClick={onClose}
            type="button"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </Button>
        </div>

        {/* Content Body */}
        <div className="ui-dialog-body p-6 overflow-y-auto space-y-5 text-xs text-slate-600 flex-1">
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <SpinnerIcon className="w-6 h-6 animate-spin text-amber-500 mb-2" />
              <span>Đang tải thông tin chi tiết...</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2">
              <AlertIcon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {detail && !isLoading && (
            <>
              {/* Meta information card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block font-medium">Học sinh</span>
                  <span className="font-semibold text-slate-800">{detail.studentName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Mã học sinh</span>
                  <span className="font-mono font-semibold text-slate-800">{detail.studentCode || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Thời gian gửi</span>
                  <span className="font-medium text-slate-700">
                    {new Date(detail.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Thời gian xử lý</span>
                  <span className="font-medium text-slate-700">
                    {detail.reviewedAt ? new Date(detail.reviewedAt).toLocaleString('vi-VN') : '—'}
                  </span>
                </div>
              </div>

              {/* Stale warning banner */}
              {detail.isStale && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-start gap-2">
                  <AlertIcon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Dữ liệu học sinh đã thay đổi</span>
                    <span className="text-[11px] text-amber-700">
                      Dữ liệu học sinh đã được cập nhật sau khi yêu cầu này được gửi đi. Quản trị viên không thể
                      phê duyệt yêu cầu lỗi thời này. Vui lòng từ chối yêu cầu để phụ huynh gửi lại nếu cần.
                    </span>
                  </div>
                </div>
              )}

              {/* Rejection reason (if REJECTED) */}
              {detail.status === 'REJECTED' && detail.rejectionReason && (
                <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl text-rose-900">
                  <span className="font-semibold block text-[11px] text-rose-600 mb-0.5">Lý do từ chối:</span>
                  <span className="text-xs">{detail.rejectionReason}</span>
                </div>
              )}

              {/* Comparison Section */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">So sánh dữ liệu thay đổi</h3>

                {/* Case 1: ADDRESS_UPDATE */}
                {detail.type === 'ADDRESS_UPDATE' && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    {detail.isStale ? (
                      <Table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <th className="p-3 w-1/3">Lúc gửi yêu cầu</th>
                            <th className="p-3 w-1/3 bg-amber-50/40 text-amber-900">Hiện tại trên hệ thống</th>
                            <th className="p-3 w-1/3 bg-emerald-50/40 text-emerald-900">Đề xuất cập nhật</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          <tr>
                            <td className="p-3 align-top text-slate-600">
                              {detail.beforeData?.addressText || 'Chưa có địa chỉ'}
                            </td>
                            <td className="p-3 align-top bg-amber-50/20 text-amber-900 font-medium">
                              {detail.currentStudentData?.addressText || 'Chưa có địa chỉ'}
                            </td>
                            <td className="p-3 align-top bg-emerald-50/20 text-emerald-900 font-bold">
                              {detail.proposedData?.addressText || '—'}
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                        <div className="p-4 space-y-1 bg-slate-50/50">
                          <span className="text-[11px] font-semibold text-slate-400 block uppercase">Địa chỉ ban đầu</span>
                          <p className="text-xs text-slate-700 font-medium">
                            {detail.beforeData?.addressText || 'Chưa có địa chỉ'}
                          </p>
                        </div>
                        <div className="p-4 space-y-1 bg-emerald-50/20">
                          <span className="text-[11px] font-semibold text-emerald-700 block uppercase">Địa chỉ đề xuất mới</span>
                          <p className="text-xs text-emerald-900 font-bold">
                            {detail.proposedData?.addressText || '—'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Case 2: INFORMATION_UPDATE (School Admin Only) */}
                {detail.type === 'INFORMATION_UPDATE' && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    {detail.isStale ? (
                      <Table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <th className="p-2.5">Trường thông tin</th>
                            <th className="p-2.5">Lúc gửi</th>
                            <th className="p-2.5 bg-amber-50/40 text-amber-900">Hiện tại</th>
                            <th className="p-2.5 bg-emerald-50/40 text-emerald-900">Đề xuất</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detail.proposedData?.fullName && (
                            <tr>
                              <td className="p-2.5 font-medium text-slate-500">Họ và tên học sinh</td>
                              <td className="p-2.5 text-slate-600">{detail.beforeData?.fullName || '—'}</td>
                              <td className="p-2.5 bg-amber-50/20 text-amber-900 font-medium">
                                {detail.currentStudentData?.fullName || '—'}
                              </td>
                              <td className="p-2.5 bg-emerald-50/20 text-emerald-900 font-bold">
                                {detail.proposedData.fullName}
                              </td>
                            </tr>
                          )}
                          {detail.proposedData?.guardianPhone && (
                            <tr>
                              <td className="p-2.5 font-medium text-slate-500">Số điện thoại phụ huynh</td>
                              <td className="p-2.5 text-slate-600">{detail.beforeData?.guardianPhone || '—'}</td>
                              <td className="p-2.5 bg-amber-50/20 text-amber-900 font-medium">
                                {detail.currentStudentData?.guardianPhone || '—'}
                              </td>
                              <td className="p-2.5 bg-emerald-50/20 text-emerald-900 font-bold">
                                {detail.proposedData.guardianPhone}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </Table>
                    ) : (
                      <Table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <th className="p-3 w-1/3">Trường thông tin</th>
                            <th className="p-3 w-1/3">Dữ liệu ban đầu</th>
                            <th className="p-3 w-1/3 bg-emerald-50/40 text-emerald-900">Dữ liệu đề xuất mới</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detail.proposedData?.fullName && (
                            <tr>
                              <td className="p-3 font-medium text-slate-600">Họ và tên học sinh</td>
                              <td className="p-3 text-slate-600">{detail.beforeData?.fullName || '—'}</td>
                              <td className="p-3 bg-emerald-50/20 text-emerald-900 font-bold">
                                {detail.proposedData.fullName}
                              </td>
                            </tr>
                          )}
                          {detail.proposedData?.guardianPhone && (
                            <tr>
                              <td className="p-3 font-medium text-slate-600">Số điện thoại phụ huynh</td>
                              <td className="p-3 text-slate-600">{detail.beforeData?.guardianPhone || '—'}</td>
                              <td className="p-3 bg-emerald-50/20 text-emerald-900 font-bold">
                                {detail.proposedData.guardianPhone}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </Table>
                    )}
                  </div>
                )}

                {/* Display existing resolution if already resolved */}
                {detail.resolution && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <span className="font-semibold text-slate-700">Kết quả xử lý phân tuyến: </span>
                    <span className="font-bold text-slate-900">
                      {detail.resolution.outcome === 'DIRECT_UPDATE'
                        ? 'Cập nhật trực tiếp địa chỉ học sinh (chưa phân tuyến)'
                        : detail.resolution.outcome === 'REOPTIMIZED'
                        ? 'Đã tối ưu và cập nhật vào tuyến xe mới'
                        : detail.resolution.outcome === 'REMOVED_FROM_ROUTES'
                        ? 'Đã cập nhật địa chỉ và loại học sinh khỏi các tuyến'
                        : detail.resolution.outcome}
                    </span>
                  </div>
                )}

                {/* Routing Feasibility Check (System Admin on ADDRESS_UPDATE) */}
                {role === 'SYSTEM_ADMIN' && detail.type === 'ADDRESS_UPDATE' && detail.status === 'PENDING' && (
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RouteIcon className="w-4 h-4 text-amber-600" />
                        <span className="font-bold text-xs text-slate-800">
                          Kiểm tra tác động phân tuyến
                        </span>
                      </div>
                      <Button
                        type="button"
                        disabled={isLoadingRoutingPreview}
                        onClick={handleCheckRouting}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        {isLoadingRoutingPreview && <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />}
                        <span>{routingPreview ? 'Kiểm tra lại' : 'Kiểm tra tuyến'}</span>
                      </Button>
                    </div>

                    {/* Hai tiêu chí tối ưu đúng nghiệp vụ */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] text-slate-700 font-semibold mb-1">
                          Thời gian tối đa tuyến (phút)
                        </label>
                        <Input
                          type="number"
                          min={10}
                          max={180}
                          value={maxRouteDurationMinutes}
                          onChange={(e) => {
                            setMaxRouteDurationMinutes(Number(e.target.value) || 10);
                            setRoutingPreview(null);
                            setRoutingError(null);
                          }}
                          className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                        />
                        <span className="text-[10px] text-slate-500">Giới hạn tổng di chuyển & dừng</span>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-700 font-semibold mb-1">
                          Thời gian dừng tại điểm (giây)
                        </label>
                        <Input
                          type="number"
                          min={10}
                          max={300}
                          value={defaultStopServiceSeconds}
                          onChange={(e) => {
                            setDefaultStopServiceSeconds(Number(e.target.value) || 60);
                            setRoutingPreview(null);
                            setRoutingError(null);
                          }}
                          className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                        />
                        <span className="text-[10px] text-slate-500">Thời gian phục vụ đón/trả</span>
                      </div>
                    </div>

                    {routingError && (
                      <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                        {routingError}
                      </div>
                    )}

                    {/* Routing Check Result */}
                    {routingPreview && (
                      <Card className="p-3 bg-white rounded-xl border border-slate-200 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="font-semibold text-slate-700">Tình trạng kiểm tra:</span>
                          {routingPreview.overallFeasibility === 'FEASIBLE' ? (
                            <Badge className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckIcon className="w-3 h-3" /> Khả thi trên mọi tuyến
                            </Badge>
                          ) : routingPreview.overallFeasibility === 'INFEASIBLE' ? (
                            <Badge className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertIcon className="w-3 h-3" /> Không khả thi trên ít nhất 1 tuyến
                            </Badge>
                          ) : (
                            <Badge className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertIcon className="w-3 h-3" /> Dịch vụ định tuyến tạm gián đoạn
                            </Badge>
                          )}
                        </div>

                        {routingPreview.routes.length === 0 ? (
                          <p className="text-slate-500 italic">
                            Học sinh chưa tham gia tuyến DRAFT/ACTIVE nào. Có thể duyệt cập nhật hồ sơ trực tiếp.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            <p className="font-medium text-slate-700">Các tuyến liên quan:</p>
                            {routingPreview.routes.map((rt) => (
                              <div
                                key={rt.routeId}
                                className={`p-2 rounded-lg border flex items-center justify-between text-xs ${
                                  rt.feasibility === 'FEASIBLE'
                                    ? 'bg-emerald-50/40 border-emerald-200 text-emerald-900'
                                    : 'bg-rose-50/40 border-rose-200 text-rose-900'
                                }`}
                              >
                                <div>
                                  <span className="font-bold">{rt.routeName}</span> ({rt.direction === 'TO_SCHOOL' ? 'Đến trường' : 'Về nhà'})
                                  {rt.newPlannedArrivalTime && (
                                    <span className="block text-[11px] text-slate-600">
                                      Giờ dự kiến mới: {rt.newPlannedArrivalTime}
                                    </span>
                                  )}
                                  {rt.infeasibilityReason && (
                                    <span className="block text-[11px] text-rose-700 font-medium">
                                      Lý do: {rt.infeasibilityReason}
                                    </span>
                                  )}
                                </div>
                                <span className="font-semibold">{rt.feasibility}</span>
                              </div>
                            ))}

                            <div className="text-[11px] text-slate-500 pt-1">
                              {routingPreview.affectedScheduledTripsCount} chuyến SCHEDULED sẽ cập nhật • {routingPreview.preservedTripsCount} chuyến đang chạy giữ nguyên dữ liệu cũ.
                            </div>
                          </div>
                        )}
                      </Card>
                    )}
                  </div>
                )}
              </div>

              {/* Rejection Form Input */}
              {isConfirmingReject && (
                <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-800 text-xs">Xác nhận từ chối yêu cầu</span>
                    <Button
                      type="button"
                      onClick={() => setIsConfirmingReject(false)}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      Hủy bỏ
                    </Button>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Lý do từ chối (Tùy chọn)
                    </label>
                    <Textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={2}
                      placeholder="Nhập lý do gửi đến phụ huynh..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-400 bg-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      onClick={() => setIsConfirmingReject(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Đóng
                    </Button>
                    <Button
                      type="button"
                      disabled={isSubmittingReject}
                      onClick={handleReject}
                      className="px-4 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      {isSubmittingReject && <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />}
                      Xác nhận từ chối
                    </Button>
                  </div>
                </div>
              )}

              {/* Approve Confirmation Dialog */}
              {isConfirmingApprove && (
                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 text-xs">
                      Xác nhận phê duyệt ({selectedOutcome === 'REOPTIMIZED' ? 'Cập nhật tuyến mới' : selectedOutcome === 'REMOVED_FROM_ROUTES' ? 'Loại khỏi tuyến' : 'Cập nhật trực tiếp'})
                    </span>
                    <Button
                      type="button"
                      onClick={() => setIsConfirmingApprove(false)}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      Hủy bỏ
                    </Button>
                  </div>
                  <p className="text-xs text-emerald-800">
                    {selectedOutcome === 'REOPTIMIZED'
                      ? `Phê duyệt và áp dụng tuyến mới cho học sinh ${detail.studentName}. Các chuyến xe SCHEDULED chưa điểm danh sẽ được cập nhật.`
                      : selectedOutcome === 'REMOVED_FROM_ROUTES'
                      ? `Phê duyệt cập nhật địa chỉ và loại học sinh ${detail.studentName} khỏi mọi tuyến DRAFT/ACTIVE hiện tại.`
                      : `Dữ liệu của học sinh ${detail.studentName} sẽ được cập nhật trực tiếp trên hệ thống.`}
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      onClick={() => setIsConfirmingApprove(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Hủy
                    </Button>
                    <Button
                      type="button"
                      disabled={isSubmittingApprove}
                      onClick={() => handleApprove()}
                      className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      {isSubmittingApprove && <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />}
                      Xác nhận
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50">
          <Button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </Button>

          {detail && detail.status === 'PENDING' && !isConfirmingApprove && !isConfirmingReject && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm"
                type="button"
                onClick={() => setIsConfirmingReject(true)}
                className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
              >
                Từ chối
              </Button>

              {/* Phê duyệt theo ngữ cảnh: System Admin có tuyến vs không có tuyến */}
              {role === 'SYSTEM_ADMIN' && detail.type === 'ADDRESS_UPDATE' ? (
                !routingPreview ? (
                  <Button
                    type="button"
                    disabled={isLoadingRoutingPreview}
                    onClick={handleCheckRouting}
                    className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {isLoadingRoutingPreview && <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />}
                    <span>Kiểm tra tuyến</span>
                  </Button>
                ) : routingPreview.overallFeasibility === 'FEASIBLE' ? (
                  <Button
                    type="button"
                    disabled={detail.isStale}
                    onClick={() => {
                      setSelectedOutcome('REOPTIMIZED');
                      setIsConfirmingApprove(true);
                    }}
                    className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckIcon className="w-4 h-4" />
                    <span>Xác nhận tuyến mới</span>
                  </Button>
                ) : routingPreview.overallFeasibility === 'INFEASIBLE' ? (
                  <Button
                    type="button"
                    disabled={detail.isStale}
                    onClick={() => {
                      setSelectedOutcome('REMOVED_FROM_ROUTES');
                      setIsConfirmingApprove(true);
                    }}
                    className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <AlertIcon className="w-4 h-4" />
                    <span>Duyệt & Loại khỏi tuyến</span>
                  </Button>
                ) : routingPreview.routes.length === 0 ? (
                  <Button
                    type="button"
                    disabled={detail.isStale}
                    onClick={() => {
                      setSelectedOutcome('DIRECT_UPDATE');
                      setIsConfirmingApprove(true);
                    }}
                    className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckIcon className="w-4 h-4" />
                    <span>Duyệt trực tiếp</span>
                  </Button>
                ) : null
              ) : (
                <Button
                  type="button"
                  disabled={detail.isStale}
                  onClick={() => {
                    setSelectedOutcome('DIRECT_UPDATE');
                    setIsConfirmingApprove(true);
                  }}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
                    detail.isStale
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                  }`}
                >
                  <CheckIcon className="w-4 h-4" />
                  Phê duyệt
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
