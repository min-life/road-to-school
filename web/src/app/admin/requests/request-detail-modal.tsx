'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import type { StudentUpdateRequestDetail, UserRole } from '@/lib/types';
import {
  SpinnerIcon,
  AlertIcon,
  CheckIcon,
  MapPinIcon,
  StudentIcon,
  PhoneIcon,
  CloseIcon,
} from '@/components/icons';

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

  // Load detail
  useEffect(() => {
    if (!isOpen || !requestId) {
      setDetail(null);
      setError(null);
      setIsConfirmingApprove(false);
      setIsConfirmingReject(false);
      setRejectReason('');
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

  const handleApprove = async () => {
    if (!detail) return;
    try {
      setIsSubmittingApprove(true);
      setError(null);
      if (role === 'SYSTEM_ADMIN') {
        await apiClient.approveSystemAdminRequest(detail.id);
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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Chờ duyệt
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Đã duyệt
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Đã từ chối
          </span>
        );
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    if (type === 'ADDRESS_UPDATE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <MapPinIcon className="w-3 h-3" />
          Cập nhật địa chỉ
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
        <StudentIcon className="w-3 h-3" />
        Cập nhật thông tin
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-900">Chi tiết yêu cầu cập nhật</h2>
            {detail && getStatusBadge(detail.status)}
            {detail && getTypeBadge(detail.type)}
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-600 flex-1">
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
                      <table className="w-full text-left border-collapse">
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
                      </table>
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
                      <table className="w-full text-left border-collapse">
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
                      </table>
                    ) : (
                      <table className="w-full text-left border-collapse">
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
                      </table>
                    )}
                  </div>
                )}
              </div>

              {/* Rejection Form Input */}
              {isConfirmingReject && (
                <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-800 text-xs">Xác nhận từ chối yêu cầu</span>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingReject(false)}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      Hủy bỏ
                    </button>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Lý do từ chối (Tùy chọn)
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={2}
                      placeholder="Nhập lý do gửi đến phụ huynh..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-400 bg-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsConfirmingReject(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Đóng
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingReject}
                      onClick={handleReject}
                      className="px-4 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      {isSubmittingReject && <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />}
                      Xác nhận từ chối
                    </button>
                  </div>
                </div>
              )}

              {/* Approve Confirmation Dialog */}
              {isConfirmingApprove && (
                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 text-xs">Xác nhận phê duyệt</span>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingApprove(false)}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      Hủy bỏ
                    </button>
                  </div>
                  <p className="text-xs text-emerald-800">
                    Bạn có chắc chắn muốn phê duyệt yêu cầu này? Dữ liệu của học sinh{' '}
                    <strong>{detail.studentName}</strong> sẽ được cập nhật trực tiếp trên hệ thống.
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsConfirmingApprove(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingApprove}
                      onClick={handleApprove}
                      className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      {isSubmittingApprove && <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />}
                      Xác nhận phê duyệt
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>

          {detail && detail.status === 'PENDING' && !isConfirmingApprove && !isConfirmingReject && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsConfirmingReject(true)}
                className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
              >
                Từ chối
              </button>

              <button
                type="button"
                disabled={detail.isStale}
                onClick={() => setIsConfirmingApprove(true)}
                className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
                  detail.isStale
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                }`}
                title={
                  detail.isStale
                    ? 'Không thể duyệt yêu cầu lỗi thời do dữ liệu học sinh đã thay đổi'
                    : 'Phê duyệt yêu cầu'
                }
              >
                <CheckIcon className="w-4 h-4" />
                Phê duyệt
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
