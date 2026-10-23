'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import type { StudentListItem, StudentStatus } from '@/lib/types';
import {
  SearchIcon,
  SpinnerIcon,
  AlertIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  StudentIcon,
  PhoneIcon,
} from '@/components/icons';
import { StudentFilters } from './student-filters';
import { StatusConfirmModal } from './status-confirm-modal';

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
  const [limit] = useState(10);

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

  const handleConfirmStatusChange = async () => {
    if (!selectedStudent || !targetStatus || !schoolId) return;

    try {
      setIsUpdatingStatus(true);
      await apiClient.updateStudentStatus(schoolId, selectedStudent.id, targetStatus);
      handleStatusUpdateSuccess(selectedStudent.id, targetStatus);
      setIsStatusModalOpen(false);
      setSelectedStudent(null);
      setTargetStatus(null);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể cập nhật trạng thái học sinh.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleStatusUpdateSuccess = (studentId: string, newStatus: StudentStatus) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status: newStatus } : s))
    );
    setSuccessToast(
      newStatus === 'AVAILABLE'
        ? 'Đã kích hoạt lại học sinh thành công.'
        : 'Đã vô hiệu hóa học sinh thành công.'
    );
    setTimeout(() => setSuccessToast(null), 3000);
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
          <button
            type="button"
            onClick={fetchStudents}
            className="text-xs font-semibold text-red-700 hover:text-red-900 underline ml-2 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
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
                        <button
                          type="button"
                          onClick={onAddClick}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-[#FFCB56] hover:bg-amber-400 rounded-lg transition-colors cursor-pointer"
                        >
                          + Thêm học sinh
                        </button>
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
                      </td>

                      {/* Student Status */}
                      <td className="px-4 py-3 text-center">
                        {isAvailable ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Khả dụng
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-300">
                            Đã vô hiệu hóa
                          </span>
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

                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() => handleOpenStatusModal(student)}
                              className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                                isAvailable
                                  ? 'text-red-700 hover:bg-red-50 border border-red-200'
                                  : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                              }`}
                            >
                              {isAvailable ? 'Vô hiệu hóa' : 'Kích hoạt'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {total > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              Hiển thị <span className="font-semibold">{students.length}</span> /{' '}
              <span className="font-semibold">{total}</span> học sinh
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Trang trước"
              >
                <ChevronLeftIcon className="w-4 h-4 text-slate-600" />
              </button>

              <span className="px-2 py-1 font-semibold text-slate-800">
                {page} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Trang sau"
              >
                <ChevronRightIcon className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status Confirm Modal */}
      {selectedStudent && targetStatus && (
        <StatusConfirmModal
          isOpen={isStatusModalOpen}
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
    </div>
  );
}
