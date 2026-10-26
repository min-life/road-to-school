'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AdminSchoolsGuard } from '@/components/admin/schools/admin-schools-guard';
import { apiClient } from '@/lib/api-client';
import type { StudentDetail } from '@/lib/types';
import {
  ArrowLeftIcon,
  StudentIcon,
  PhoneIcon,
  MapPinIcon,
  SchoolIcon,
  SpinnerIcon,
  AlertIcon,
} from '@/components/icons';
import { QRCodeDisplay } from '@/components/common/qr-code';
import { StudentRoutingSection } from '@/components/admin/students/student-routing-section';

function SystemAdminStudentDetailPageContent() {
  const params = useParams();
  const schoolId = params?.id as string;
  const studentId = params?.studentId as string;

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

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
          href={`/admin/schools/${schoolId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>Quay lại chi tiết trường học</span>
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
      {/* Back button */}
      <div>
        <Link
          href={`/admin/schools/${schoolId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>Quay lại chi tiết trường học</span>
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

        {/* Read-only notice */}
        <div className="text-right">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            Chế độ chỉ xem (System Admin)
          </span>
        </div>
      </div>

      {/* Main Grid: Info + QR Code */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
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

            <div className="border-t border-slate-100 pt-3">
              <dt className="text-slate-400 font-medium text-xs mb-1">Địa chỉ chi tiết</dt>
              {student.addressText ? (
                <div className="flex items-start gap-2 text-xs text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <MapPinIcon className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span>{student.addressText}</span>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Chưa cập nhật địa chỉ nhà cho học sinh này.</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <QRCodeDisplay
            studentCode={student.code}
            studentName={student.fullName}
          />
        </div>
      </div>

      {/* Route Management Section */}
      <StudentRoutingSection studentId={student.id} studentName={student.fullName} />
    </div>
  );
}

export default function SystemAdminStudentDetailPage() {
  return (
    <AdminSchoolsGuard>
      <SystemAdminStudentDetailPageContent />
    </AdminSchoolsGuard>
  );
}
