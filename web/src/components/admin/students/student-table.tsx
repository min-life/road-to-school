'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import type { StudentListItem, StudentStatus, EmptyRoutePlanInfo } from '@/lib/types';
import {
  SearchIcon,
  SpinnerIcon,
  AlertIcon,
  CheckIcon,
  StudentIcon,
  PhoneIcon,
} from '@/components/icons';
import { PaginationControl } from '@/components/admin/common/pagination-control';
import { StudentFilters } from './student-filters';
import { StatusConfirmModal } from './status-confirm-modal';
import { InsertStudentModal } from './insert-student-modal';
import { EmptyRoutePlanActionModal } from './empty-route-plan-action-modal';
import { CancelRoutePlanModal } from '@/components/admin/routes/cancel-route-plan-modal';
import { authStorage } from '@/lib/auth-storage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface StudentTableProps {
  schoolId: string;
  readOnly?: boolean;
  baseDetailUrl?: string; // e.g. "/admin/students" or "/admin/schools/:schoolId/students"
  onAddClick?: () => void;
}

export function StudentTable({
  schoolId,
  readOnly = false,
  baseDetailUrl = '/admin/students',
  onAddClick,
}: StudentTableProps) {
  // Query state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'DISABLED'>('ALL');
  const [addressFilter, setAddressFilter] = useState<'ALL' | 'HAS_ADDRESS' | 'NO_ADDRESS'>('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Data state
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Status toggle modal state
  const [selectedStudent, setSelectedStudent] = useState<StudentListItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<StudentStatus | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Student insertion state (System Admin)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [insertingStudent, setInsertingStudent] = useState<StudentListItem | null>(null);
  const [isInsertModalOpen, setIsInsertModalOpen] = useState(false);

  useEffect(() => {
    const user = authStorage.getUser();
    if (user) {
      setCurrentUserRole(user.role);
    }
  }, []);

  // Ref to track latest request to prevent stale overwrite
  const latestRequestRef = useRef(0);

  const fetchStudents = useCallback(async () => {
    if (!schoolId) return;

    const requestId = ++latestRequestRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const params: Parameters<typeof apiClient.getStudents>[1] = {
        page,
        limit,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      if (addressFilter === 'HAS_ADDRESS') {
        params.hasAddress = true;
      } else if (addressFilter === 'NO_ADDRESS') {
        params.hasAddress = false;
      }

      const res = await apiClient.getStudents(schoolId, params);

      // Only apply if it's the latest request
      if (requestId === latestRequestRef.current) {
        setStudents(res.items);
        setTotal(res.meta.totalItems);
        setTotalPages(res.meta.totalPages);
      }
    } catch (err: any) {
      if (requestId === latestRequestRef.current) {
        setErrorMessage(err?.message || 'Không thể tải danh sách học sinh.');
      }
    } finally {
      if (requestId === latestRequestRef.current) {
        setIsLoading(false);
      }
    }
  }, [schoolId, page, limit, search, statusFilter, addressFilter]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleOpenStatusModal = (student: StudentListItem) => {
    if (readOnly) return;
    setSelectedStudent(student);
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
    if (!selectedStudent || !targetStatus || !schoolId) return;

    try {
      setIsUpdatingStatus(true);
      const res = await apiClient.updateStudentStatus(schoolId, selectedStudent.id, targetStatus);
      handleStatusUpdateSuccess(selectedStudent.id, targetStatus, res);
      if (res.emptyRoutePlans && res.emptyRoutePlans.length > 0) {
        setEmptyPlanNotice(res.emptyRoutePlans[0]);
        setEmptyRouteActionData({
          studentName: selectedStudent.fullName,
          emptyRoutePlans: res.emptyRoutePlans,
        });
      } else {
        setEmptyPlanNotice(null);
        setEmptyRouteActionData(null);
      }
      setIsStatusModalOpen(false);
      setSelectedStudent(null);
      setTargetStatus(null);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể cập nhật trạng thái học sinh.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleStatusUpdateSuccess = (
    studentId: string,
    newStatus: StudentStatus,
    res?: { message?: string; emptyRoutePlans?: any[] },
  ) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status: newStatus } : s))
    );
    if (res?.message) {
      setSuccessToast(res.message);
    } else {
      setSuccessToast(
        newStatus === 'AVAILABLE'
          ? 'Đã kích hoạt lại học sinh thành công.'
          : 'Đã vô hiệu hóa học sinh thành công.'
      );
    }
    setTimeout(() => setSuccessToast(null), 5000);
  };

  return (
    <div className="space-y-4">
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
            <Link data-variant="outline" data-size="sm"
              href={`/admin/routes/plans/${emptyPlanNotice.planId}`}
              className="ui-button px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors cursor-pointer text-xs"
            >
              Xem phương án
            </Link>
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

      {/* Filter bar */}
      <StudentFilters
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        status={statusFilter === 'ALL' ? '' : statusFilter}
        onStatusChange={(val) => {
          setStatusFilter(val === '' ? 'ALL' : val);
          setPage(1);
        }}
        hasAddress={
          addressFilter === 'HAS_ADDRESS'
            ? 'true'
            : addressFilter === 'NO_ADDRESS'
              ? 'false'
              : ''
        }
        onHasAddressChange={(val) => {
          setAddressFilter(
            val === 'true' ? 'HAS_ADDRESS' : val === 'false' ? 'NO_ADDRESS' : 'ALL'
          );
          setPage(1);
        }}
        onReset={() => {
          setSearch('');
          setStatusFilter('ALL');
          setAddressFilter('ALL');
          setPage(1);
        }}
        hasActiveFilters={Boolean(search || statusFilter !== 'ALL' || addressFilter !== 'ALL')}
      />

      {/* Error state */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl">
          <AlertIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">{errorMessage}</div>
          <Button
            type="button"
            onClick={fetchStudents}
            className="text-xs font-semibold text-red-700 hover:text-red-900 underline ml-2 cursor-pointer"
          >
            Thử lại
          </Button>
        </div>
      )}

      {/* Table Container */}
      <Card className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Học sinh</th>
                <th className="px-4 py-3">Mã học sinh</th>
                <th className="px-4 py-3">SĐT Phụ huynh</th>
                <th className="px-4 py-3 text-center">Tình trạng địa chỉ</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <SpinnerIcon className="w-5 h-5 animate-spin text-amber-500" />
                      <span>Đang tải danh sách học sinh...</span>
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <StudentIcon className="w-6 h-6" />
                      </div>
                      <p className="font-medium text-slate-800 text-sm">Chưa có học sinh nào</p>
                      <p className="text-xs text-slate-500">
                        {search || statusFilter !== 'ALL' || addressFilter !== 'ALL'
                          ? 'Không tìm thấy học sinh phù hợp với bộ lọc hiện tại.'
                          : 'Bắt đầu thêm học sinh vào trường của bạn.'}
                      </p>
                      {!readOnly && onAddClick && !search && statusFilter === 'ALL' && addressFilter === 'ALL' && (
                        <Button variant="primary" size="sm"
                          type="button"
                          onClick={onAddClick}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-primary hover:bg-amber-400 rounded-lg transition-colors cursor-pointer"
                        >
                          + Thêm học sinh
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const detailHref = `${baseDetailUrl}/${student.id}`;
                  const isAvailable = student.status === 'AVAILABLE';

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-amber-50/30 transition-colors group"
                    >
                      {/* Avatar + Full Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {student.avatarUrl ? (
                            <img
                              src={student.avatarUrl}
                              alt={student.fullName}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center border border-amber-200 flex-shrink-0">
                              {student.fullName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <Link
                              href={detailHref}
                              className="font-semibold text-slate-900 hover:text-amber-700 transition-colors line-clamp-1"
                            >
                              {student.fullName}
                            </Link>
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                          {student.code}
                        </span>
                      </td>

                      {/* Guardian Phone */}
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        <div className="inline-flex items-center gap-1.5">
                          <PhoneIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span>{student.guardianPhone}</span>
                        </div>
                      </td>

                      {/* Address Availability */}
                      <td className="px-4 py-3 text-center">
                        {student.hasAddress ? (
                          <Badge className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Đã có địa chỉ
                          </Badge>
                        ) : (
                          <Badge className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Chưa có địa chỉ
                          </Badge>
                        )}
                      </td>

                      {/* Student Status */}
                      <td className="px-4 py-3 text-center">
                        {isAvailable ? (
                          <Badge className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Khả dụng
                          </Badge>
                        ) : (
                          <Badge className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-300">
                            Đã vô hiệu hóa
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={detailHref}
                            className="text-xs font-medium text-slate-600 hover:text-amber-700 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            Xem chi tiết
                          </Link>

                          {currentUserRole === 'SYSTEM_ADMIN' && isAvailable && student.hasAddress && (
                            <Button
                              type="button"
                              onClick={() => {
                                setInsertingStudent(student);
                                setIsInsertModalOpen(true);
                              }}
                              className="text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                            >
                              Thêm vào tuyến
                            </Button>
                          )}

                          {!readOnly && (
                            <Button
                              type="button"
                              onClick={() => handleOpenStatusModal(student)}
                              className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                                isAvailable
                                  ? 'text-red-700 hover:bg-red-50 border border-red-200'
                                  : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                              }`}
                            >
                              {isAvailable ? 'Vô hiệu hóa' : 'Kích hoạt'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>

        {/* Pagination bar */}
        <PaginationControl
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          loading={isLoading}
          onPageChange={(newPage) => setPage(newPage)}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
        />
      </Card>

      {/* Status Confirm Modal */}
      {selectedStudent && targetStatus && (
        <StatusConfirmModal
          isOpen={isStatusModalOpen}
          schoolId={schoolId}
          student={selectedStudent}
          targetStatus={targetStatus}
          isLoading={isUpdatingStatus}
          onClose={() => {
            setIsStatusModalOpen(false);
            setSelectedStudent(null);
            setTargetStatus(null);
          }}
          onConfirm={handleConfirmStatusChange}
        />
      )}

      {/* Insert Student into Existing Route Pair Modal (System Admin) */}
      <InsertStudentModal
        isOpen={isInsertModalOpen}
        studentId={insertingStudent?.id || null}
        studentName={insertingStudent?.fullName}
        onClose={() => {
          setIsInsertModalOpen(false);
          setInsertingStudent(null);
        }}
        onSuccess={() => {
          setIsInsertModalOpen(false);
          setInsertingStudent(null);
          setSuccessToast('Đã thêm học sinh vào cặp tuyến thành công.');
          fetchStudents();
        }}
      />

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
            fetchStudents();
          }}
        />
      )}
    </div>
  );
}
