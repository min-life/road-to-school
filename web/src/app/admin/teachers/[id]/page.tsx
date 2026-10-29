'use client';
import { BackLink } from '@/components/admin/common/context-navigation';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { SchoolAdminGuard } from '@/components/admin/school-admin-guard';
import { apiClient } from '@/lib/api-client';
import type { SchoolEmployeeDetail } from '@/lib/types';
import {
  TeacherIcon,
  SchoolIcon,
  PhoneIcon,
  SpinnerIcon,
  AlertIcon,
} from '@/components/icons';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';

function TeacherDetailPageContent() {
  const params = useParams();
  const teacherId = params?.id as string;
  const { user } = useAuth();
  const schoolId = user?.schoolId;

  const [teacher, setTeacher] = useState<SchoolEmployeeDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchTeacher = useCallback(async () => {
    if (!schoolId || !teacherId) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await apiClient.getSchoolEmployeeDetail(schoolId, teacherId);
      setTeacher(data);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Không thể tải thông tin chi tiết giáo viên.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [schoolId, teacherId]);

  useEffect(() => {
    fetchTeacher();
  }, [fetchTeacher]);

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-slate-500">
        <SpinnerIcon className="w-6 h-6 animate-spin text-amber-500 mb-2" />
        <span className="text-sm">Đang tải thông tin chi tiết giáo viên...</span>
      </div>
    );
  }

  if (errorMessage || !teacher) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <BackLink fallback="/admin/teachers" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors" />
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-800 text-center">
          <AlertIcon className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <h2 className="text-base font-bold">Không thể tải thông tin giáo viên</h2>
          <p className="text-xs text-red-600 mt-1">{errorMessage}</p>
        </div>
      </div>
    );
  }

  const isActive = teacher.isActive;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <BackLink fallback="/admin/teachers" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors" />
      </div>

      {/* Header Card */}
      <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-800 font-bold text-xl flex items-center justify-center border-2 border-blue-200">
            {teacher.fullName.charAt(0).toUpperCase()}
          </div>
          <PageHeader>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{teacher.fullName}</h1>
              <Badge className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Giáo viên
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Vai trò kỹ thuật: <span className="font-mono text-slate-600">BUS_ATTENDANT</span>
            </p>
          </PageHeader>
        </div>

        <div>
          {isActive ? (
            <Badge className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Đang hoạt động
            </Badge>
          ) : (
            <Badge className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
              Ngừng hoạt động
            </Badge>
          )}
        </div>
      </Card>

      {/* Information Card */}
      <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <TeacherIcon className="w-4 h-4 text-amber-500" />
          Thông tin chi tiết giáo viên
        </h2>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <dt className="text-slate-400 font-medium">Họ và tên</dt>
            <dd className="text-slate-800 font-semibold mt-0.5">{teacher.fullName}</dd>
          </div>

          <div>
            <dt className="text-slate-400 font-medium">Vai trò hiển thị</dt>
            <dd className="text-blue-700 font-semibold mt-0.5">Giáo viên</dd>
          </div>

          <div>
            <dt className="text-slate-400 font-medium">Địa chỉ Email</dt>
            <dd className="text-slate-800 font-semibold mt-0.5">
              {teacher.email || '—'}
            </dd>
          </div>

          <div>
            <dt className="text-slate-400 font-medium">Số điện thoại liên hệ</dt>
            <dd className="text-slate-800 font-semibold mt-0.5 flex items-center gap-1.5">
              {teacher.phone ? (
                <>
                  <PhoneIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>{teacher.phone}</span>
                </>
              ) : (
                '—'
              )}
            </dd>
          </div>

          <div>
            <dt className="text-slate-400 font-medium">Trường học trực thuộc</dt>
            <dd className="text-slate-800 font-semibold mt-0.5 flex items-center gap-1.5">
              <SchoolIcon className="w-3.5 h-3.5 text-amber-500" />
              <span>Trường học của bạn</span>
            </dd>
          </div>

          <div>
            <dt className="text-slate-400 font-medium">Trạng thái tài khoản</dt>
            <dd className="mt-1">
              {isActive ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
                  Đang hoạt động
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                  Ngừng hoạt động
                </span>
              )}
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}

export default function AdminTeacherDetailPage() {
  return (
    <SchoolAdminGuard>
      <TeacherDetailPageContent />
    </SchoolAdminGuard>
  );
}
