'use client';

import React, { useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { SchoolAdminGuard } from '@/components/admin/school-admin-guard';
import { StudentTable } from '@/components/admin/students/student-table';
import { AddStudentModal } from '@/components/admin/students/add-student-modal';
import { PlusIcon, AlertIcon, CheckIcon, StudentIcon } from '@/components/icons';
import type { StudentListItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';

function StudentsPageContent() {
  const { user } = useAuth();
  const schoolId = user?.schoolId;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [createdStudentToast, setCreatedStudentToast] = useState<{
    code: string;
    fullName: string;
  } | null>(null);

  const handleStudentCreated = (newStudent: StudentListItem) => {
    setCreatedStudentToast({
      code: newStudent.code,
      fullName: newStudent.fullName,
    });
    setRefreshKey((k) => k + 1);
    setTimeout(() => {
      setCreatedStudentToast(null);
    }, 6000);
  };

  if (!schoolId) {
    return (
      <div className="p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center max-w-lg mx-auto">
          <AlertIcon className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <h2 className="text-base font-bold text-slate-800">Chưa xác định trường học</h2>
          <p className="text-xs text-slate-600 mt-1">
            Tài khoản quản trị viên của bạn chưa được gán mã trường trong hệ thống. Vui lòng liên hệ Quản trị viên hệ thống.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Toast */}
      {createdStudentToast && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <span className="font-semibold">Đã tạo thành công:</span> {createdStudentToast.fullName}
              <span className="ml-2 font-mono text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                {createdStudentToast.code}
              </span>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => setCreatedStudentToast(null)}
            className="text-xs text-emerald-700 hover:underline cursor-pointer"
          >
            Đóng
          </Button>
        </div>
      )}

      {/* Page Header */}
      <PageHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <StudentIcon className="w-7 h-7 text-amber-500" />
            Quản lý học sinh
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Danh sách học sinh thuộc trường của bạn, mã QR liên kết phụ huynh và tình trạng địa chỉ.
          </p>
        </div>

        <Button variant="primary" size="default"
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-900 bg-primary hover:bg-amber-400 rounded-xl transition-colors shadow-xs cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Thêm học sinh</span>
        </Button>
      </PageHeader>

      {/* Main Student Table */}
      <StudentTable
        key={refreshKey}
        schoolId={schoolId}
        readOnly={false}
        baseDetailUrl="/admin/students"
        onAddClick={() => setIsAddModalOpen(true)}
      />

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        schoolId={schoolId}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleStudentCreated}
      />
    </div>
  );
}

export default function AdminStudentsPage() {
  return (
    <SchoolAdminGuard>
      <StudentsPageContent />
    </SchoolAdminGuard>
  );
}
