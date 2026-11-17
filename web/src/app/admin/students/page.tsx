'use client';

import { toast } from '@/stores/toast-store';

import React, { useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { SchoolAdminGuard } from '@/components/admin/school-admin-guard';
import { StudentTable } from '@/components/admin/students/student-table';
import { AddStudentModal } from './_components/add-student-modal';
import { ImportStudentModal } from './_components/import-student-modal';
import { ExportStudentModal } from './_components/export-student-modal';
import { PlusIcon, AlertIcon } from '@/components/icons';
import type { StudentListItem, StudentStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';

function StudentsPageContent() {
  const { user } = useAuth();
  const schoolId = user?.schoolId;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [currentFilters, setCurrentFilters] = useState<{
    search?: string;
    status?: StudentStatus;
    hasAddress?: boolean;
    routingStatus?: string;
    provinceId?: string;
    wardId?: string;
    total?: number;
  }>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const handleStudentCreated = (newStudent: StudentListItem) => {
    toast.success(`Đã tạo học sinh ${newStudent.fullName}.\nMã: ${newStudent.code}`, { duration: 6000 });
    setRefreshKey((k) => k + 1);
  };

  const handleImportSuccess = (importedCount: number) => {
    setRefreshKey((k) => k + 1);
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
    <div className="ui-list-page">
      {/* Page Header */}
      <PageHeader
        title="Học sinh"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="default"
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <span>Xuất Excel</span>
            </Button>
            <Button
              variant="outline"
              size="default"
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <span>Nhập Excel</span>
            </Button>
            <Button
              variant="primary"
              size="default"
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-900 bg-primary hover:bg-amber-400 rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Thêm học sinh</span>
            </Button>
          </div>
        }
      />

      {/* Main Student Table */}
      <StudentTable
        key={`${user?.id}:${schoolId}:${refreshKey}`}
        schoolId={schoolId}
        allowCardPrinting
        readOnly={false}
        baseDetailUrl="/admin/students"
        onSelectionChange={setSelectedStudentIds}
        onFiltersChange={setCurrentFilters}
      />

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        schoolId={schoolId}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleStudentCreated}
      />

      {/* Import Student Excel Modal */}
      <ImportStudentModal
        isOpen={isImportModalOpen}
        schoolId={schoolId}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={handleImportSuccess}
      />

      {/* Export Student Excel Modal */}
      <ExportStudentModal
        isOpen={isExportModalOpen}
        schoolId={schoolId}
        selectedIds={selectedStudentIds}
        filters={currentFilters}
        onClose={() => setIsExportModalOpen(false)}
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
