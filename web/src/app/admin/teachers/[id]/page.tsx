'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { SchoolAdminGuard } from '@/components/admin/school-admin-guard';
import { apiClient } from '@/lib/api-client';
import type { SchoolEmployeeDetail } from '@/lib/types';
import { SpinnerIcon, AlertIcon } from '@/components/icons';
import { Card } from '@/components/ui/card';
import { BackLink } from '@/components/admin/common/context-navigation';
import { TableActions } from '@/components/admin/common/table-actions';
import { ResendCredentialsDialog } from '@/components/admin/common/resend-credentials-dialog';
import { ResourceStatusDialog } from '@/components/admin/common/resource-status-dialog';

function TeacherDetailPageContent() {
  const params = useParams();
  const teacherId = params?.id as string;
  const { user } = useAuth();
  const schoolId = user?.schoolId;

  const [resendOpen, setResendOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
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
        err?.message || 'Không thể tải thông tin chi tiết giáo viên. Vui lòng thử lại.',
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
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <div>
          <BackLink
            fallback="/admin/teachers"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          />
        </div>
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-800 text-center">
          <AlertIcon className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <h2 className="text-base font-bold">Không thể tải thông tin giáo viên</h2>
          <p className="text-xs text-red-600 mt-1">{errorMessage || 'Vui lòng thử lại sau.'}</p>
        </div>
      </div>
    );
  }

  const isActive = teacher.isActive;

  // Build menu actions
  const accountActions: { label: string; onClick: () => void; danger?: boolean }[] = [];

  if (schoolId && teacher.role === 'BUS_ATTENDANT' && teacher.isActive && teacher.email) {
    accountActions.push({
      label: 'Cấp lại mật khẩu',
      onClick: () => setResendOpen(true),
    });
  }

  if (schoolId && teacher.role === 'BUS_ATTENDANT') {
    accountActions.push({
      label: teacher.isActive ? 'Ngừng hoạt động' : 'Kích hoạt',
      danger: teacher.isActive,
      onClick: () => setStatusOpen(true),
    });
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <BackLink
          fallback="/admin/teachers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        />
      </div>

      {/* Header Profile Card */}
      <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-900 font-bold text-xl flex items-center justify-center border-2 border-amber-200 shrink-0">
            {teacher.fullName.trim().charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-xl font-bold text-slate-900 truncate">{teacher.fullName}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                Giáo viên
              </span>
              {isActive ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                  <span>Đang hoạt động</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" aria-hidden="true" />
                  <span>Ngừng hoạt động</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Account Management Menu */}
        {accountActions.length > 0 && (
          <div className="shrink-0 self-start sm:self-center">
            <TableActions
              actions={[]}
              forceMenu={true}
              label="Quản lý tài khoản"
              triggerLabel={
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <span>Quản lý tài khoản</span>
                  <ChevronDown className="w-4 h-4 text-slate-500" aria-hidden="true" />
                </span>
              }
              more={accountActions}
            />
          </div>
        )}
      </Card>

      {/* Information Card: Thông tin liên hệ */}
      <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          Thông tin liên hệ
        </h2>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
          <div>
            <dt className="text-slate-500 font-medium">Email</dt>
            <dd className="text-slate-800 font-semibold text-sm mt-1 break-words">
              {teacher.email || 'Chưa cập nhật'}
            </dd>
          </div>

          <div>
            <dt className="text-slate-500 font-medium">Số điện thoại</dt>
            <dd className="text-slate-800 font-semibold text-sm mt-1">
              {teacher.phone || 'Chưa cập nhật'}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Dialogs */}
      {resendOpen && schoolId && (
        <ResendCredentialsDialog
          schoolId={schoolId}
          employee={teacher}
          onClose={() => setResendOpen(false)}
        />
      )}
      {statusOpen && schoolId && (
        <ResourceStatusDialog
          target={{
            kind: 'employee',
            id: teacher.id,
            name: teacher.fullName,
            isActive: teacher.isActive,
            schoolId,
            role: 'BUS_ATTENDANT',
          }}
          onClose={() => setStatusOpen(false)}
          onSuccess={() => void fetchTeacher()}
        />
      )}
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
