'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import type { SchoolDetail } from '@/lib/types';
import {
  ArrowLeftIcon,
  SchoolIcon,
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  UsersIcon,
  SpinnerIcon,
  AlertIcon,
  CheckIcon,
  StudentIcon,
  RouteIcon,
  BusIcon,
} from '@/components/icons';
import { useAuth } from '@/components/auth/auth-provider';
import { SchoolStatusDialog } from '@/components/admin/schools/school-status-dialog';
import { EditSchoolModal } from '@/components/admin/schools/edit-school-modal';
import { SchoolEmployeesTab } from '@/components/admin/schools/school-employees-tab';
import { StudentTable } from '@/components/admin/students/student-table';
import { SchoolRoutesTab } from '@/components/admin/schools/school-routes-tab';
import { SchoolTripsTab } from '@/components/admin/schools/school-trips-tab';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Thứ 2',
  tuesday: 'Thứ 3',
  wednesday: 'Thứ 4',
  thursday: 'Thứ 5',
  friday: 'Thứ 6',
  saturday: 'Thứ 7',
  sunday: 'Chủ nhật',
};

const DAY_ORDER = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export default function AdminSchoolDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const schoolId = params?.id as string;

  const [school, setSchool] = useState<SchoolDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Edit & Status modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);

  // Horizontal Tabs (employees, students, routes, trips)
  const [activeTab, setActiveTab] = useState<'employees' | 'students' | 'routes' | 'trips'>('employees');

  const fetchSchoolDetail = useCallback(async () => {
    if (!schoolId) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await apiClient.getSchool(schoolId);
      setSchool(data);
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          'Không thể tải thông tin trường học hoặc trường không tồn tại.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchSchoolDetail();
  }, [fetchSchoolDetail]);

  const handleStatusChangeSuccess = (newStatus: boolean) => {
    setSuccessToast(
      newStatus
        ? 'Đã kích hoạt lại trường học thành công.'
        : 'Đã chuyển trường học sang trạng thái ngừng hoạt động.',
    );
    fetchSchoolDetail();
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-500">
        <SpinnerIcon className="w-6 h-6 animate-spin text-amber-500 mb-2" />
        <span className="text-xs">Đang tải thông tin trường học...</span>
      </div>
    );
  }

  if (errorMessage || !school) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/schools"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>Quay lại danh sách trường</span>
        </Link>

        <Card className="bg-white rounded-2xl border border-red-200 p-8 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 mx-auto flex items-center justify-center mb-4">
            <AlertIcon className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-800 mb-2">
            Không tìm thấy trường học
          </h2>
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            {errorMessage || 'Trường học không tồn tại hoặc đã bị xóa.'}
          </p>
          <Button
            type="button"
            onClick={() => router.push('/admin/schools')}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Quay lại danh sách trường
          </Button>
        </Card>
      </div>
    );
  }

  // Phân tích lịch học tuần
  const activeScheduleDays = DAY_ORDER.filter(
    (dayKey) => school.weeklySchedule && school.weeklySchedule[dayKey],
  );

  return (
    <div className="space-y-6">
      {/* Toast thông báo */}
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
          <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Navigation quay lại */}
      <div>
        <Link
          href="/admin/schools"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>Danh sách trường học</span>
        </Link>
      </div>

      {/* Header Trường học (Wireframe W5) */}
      <Card className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            {/* Ảnh trường học hoặc Placeholder */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-amber-50 border border-slate-200 shrink-0 flex items-center justify-center shadow-2xs">
              {school.imageUrl ? (
                <img
                  src={school.imageUrl}
                  alt={school.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <SchoolIcon className="w-10 h-10 text-amber-600" />
              )}
            </div>

            {/* Tên & Trạng thái */}
            <PageHeader className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                  {school.name}
                </h1>
                <Badge
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    school.isActive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      school.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                  {school.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                </Badge>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 flex items-center gap-1.5 pt-0.5">
                <MapPinIcon className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{school.addressText}</span>
              </p>

              <p className="text-xs text-slate-500">
                Tọa độ: {school.latitude.toFixed(6)}, {school.longitude.toFixed(6)}
              </p>
            </PageHeader>
          </div>

          {/* Action Buttons */}
          <div className="shrink-0 flex items-center gap-2">
            {user?.role === 'SYSTEM_ADMIN' && (
              <Button variant="outline" size="sm"
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 shadow-2xs"
              >
                Chỉnh sửa trường & vị trí
              </Button>
            )}
            <Button
              type="button"
              onClick={() => setIsStatusDialogOpen(true)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border shadow-2xs ${
                school.isActive
                  ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              {school.isActive ? 'Ngừng hoạt động' : 'Kích hoạt lại'}
            </Button>
          </div>
        </div>

        {/* Thông tin Hợp đồng & Lịch học */}
        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700">
          {/* Thời hạn hợp đồng */}
          <div className="space-y-2 bg-slate-50/60 p-4 rounded-xl border border-slate-200/60">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5 uppercase text-[11px] tracking-wider text-slate-500">
              <CalendarIcon className="w-4 h-4 text-amber-500" />
              <span>Thời hạn hợp đồng</span>
            </h3>
            <p className="text-sm font-semibold text-slate-800">
              {formatDate(school.contractStartDate)} – {formatDate(school.contractEndDate)}
            </p>
            <p className="text-[11px] text-slate-500">
              Hệ thống tự động kiểm tra thời hạn hợp đồng khi kích hoạt lại trường học.
            </p>
          </div>

          {/* Lịch học trong tuần */}
          <div className="space-y-2 bg-slate-50/60 p-4 rounded-xl border border-slate-200/60">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5 uppercase text-[11px] tracking-wider text-slate-500">
              <ClockIcon className="w-4 h-4 text-amber-500" />
              <span>Lịch học theo tuần</span>
            </h3>
            {activeScheduleDays.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Chưa có cấu hình lịch học</p>
            ) : (
              <div className="space-y-1">
                {activeScheduleDays.map((dayKey) => {
                  const schedule = school.weeklySchedule[dayKey];
                  if (!schedule) return null;
                  return (
                    <div
                      key={dayKey}
                      className="flex items-center justify-between text-xs py-0.5 border-b border-slate-200/40 last:border-0"
                    >
                      <span className="font-semibold text-slate-800">
                        {DAY_LABELS[dayKey] || dayKey}:
                      </span>
                      <span className="text-slate-600">
                        {schedule.start} – {schedule.end}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 14. Horizontal Tabs (Section 14 & Wireframe W6) */}
      <div className="space-y-4">
        <div className="flex border-b border-slate-200 gap-6">
          <Button
            type="button"
            onClick={() => setActiveTab('employees')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'employees'
                ? 'border-primary text-foreground'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <UsersIcon className="w-4 h-4" />
            <span>Nhân viên trường</span>
          </Button>

          <Button
            type="button"
            onClick={() => setActiveTab('students')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'students'
                ? 'border-primary text-foreground'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <StudentIcon className="w-4 h-4" />
            <span>Học sinh</span>
          </Button>

          <Button
            type="button"
            onClick={() => setActiveTab('routes')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'routes'
                ? 'border-primary text-foreground'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <RouteIcon className="w-4 h-4" />
            <span>Phương án tuyến</span>
          </Button>

          <Button
            type="button"
            onClick={() => setActiveTab('trips')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'trips'
                ? 'border-primary text-foreground'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <BusIcon className="w-4 h-4" />
            <span>Chuyến xe</span>
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === 'employees' && (
          <SchoolEmployeesTab
            schoolId={school.id}
            schoolName={school.name}
            isSchoolActive={school.isActive}
          />
        )}

        {activeTab === 'students' && (
          <div className="pt-2">
            <StudentTable
              schoolId={school.id}
              readOnly={true}
              baseDetailUrl={`/admin/schools/${school.id}/students`}
            />
          </div>
        )}

        {activeTab === 'routes' && (
          <SchoolRoutesTab
            schoolId={school.id}
            schoolName={school.name}
            isSchoolActive={school.isActive}
          />
        )}

        {activeTab === 'trips' && (
          <SchoolTripsTab
            schoolId={school.id}
            schoolName={school.name}
          />
        )}
      </div>

      {/* Edit School & Location Modal */}
      <EditSchoolModal
        isOpen={isEditModalOpen}
        school={school}
        userRole={user?.role}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={(msg?: string) => {
          setIsEditModalOpen(false);
          setSuccessToast(msg || 'Cập nhật thông tin trường học thành công.');
          fetchSchoolDetail();
        }}
      />

      {/* Status Confirmation Dialog */}
      <SchoolStatusDialog
        isOpen={isStatusDialogOpen}
        schoolId={school.id}
        schoolName={school.name}
        currentIsActive={school.isActive}
        onClose={() => setIsStatusDialogOpen(false)}
        onSuccess={handleStatusChangeSuccess}
      />
    </div>
  );
}
