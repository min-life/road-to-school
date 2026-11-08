'use client';
import type { UpdateSchoolStatusResponse } from '@/lib/types';
import { displayDate } from '@/lib/school-lifecycle';
import { BackLink } from '@/components/admin/common/context-navigation';

import { toast } from '@/stores/toast-store';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, usePathname, useSearchParams } from 'next/navigation';
import { schoolTabFromQuery } from '@/lib/back-navigation';
import { apiClient } from '@/lib/api-client';
import type { SchoolDetail } from '@/lib/types';
import {
  SchoolIcon,
  MapPinIcon,
  CalendarIcon,
  UsersIcon,
  SpinnerIcon,
  AlertIcon,
  StudentIcon,
  RouteIcon,
  BusIcon,
} from '@/components/icons';
import { useAuth } from '@/components/auth/auth-provider';
import { SchoolStatusDialog } from '@/components/admin/schools/school-status-dialog';
import { VietMapPicker } from '@/components/admin/schools/vietmap-picker';
import { EditSchoolModal } from './_components/edit-school-modal';
import { SchoolEmployeesTab } from './_components/school-employees-tab';
import { StudentTable } from '@/components/admin/students/student-table';
import { SchoolRoutesTab } from './_components/school-routes-tab';
import { SchoolTripsTab } from './_components/school-trips-tab';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { SchoolSchedule } from '@/components/admin/schools/school-schedule';
import { SchoolOperatingCalendar, type CalendarTab } from '@/components/admin/schools/school-operating-calendar';
import './_components/school-detail.css';

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export default function AdminSchoolDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const schoolId = params?.id as string;

  const [school, setSchool] = useState<SchoolDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);


  // Edit & Status modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [showSchoolMap, setShowSchoolMap] = useState(false);
  const [operatingCalendarTab, setOperatingCalendarTab] = useState<CalendarTab>('calendar');

  // Horizontal Tabs (employees, students, routes, trips)
  const pathname = usePathname();
  const query = useSearchParams();
  const activeTab = schoolTabFromQuery(query.get('tab'));
  const setActiveTab = (tab: typeof activeTab) => {
    const nextQuery = new URLSearchParams(query.toString());
    nextQuery.set('tab', tab);
    router.replace(`${pathname}?${nextQuery}`, { scroll: false });
  };

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

  const handleStatusChangeSuccess = (result: UpdateSchoolStatusResponse) => {
    toast.success(
      result.changeStatus === 'PENDING' && result.effectiveDate
        ? `Đã hẹn ngừng hoạt động từ ${displayDate(result.effectiveDate)}.`
        : result.message || 'Đã cập nhật trạng thái trường học.',
    );
    fetchSchoolDetail();

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
        <BackLink fallback="/admin/schools" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors" />

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
          <BackLink fallback="/admin/schools" className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast thông báo */}


      {/* Navigation quay lại */}
      <div>
        <BackLink fallback="/admin/schools" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-foreground transition-colors" />
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
              <Button type="button" variant="outline" size="sm" className="school-detail-map-toggle"
                aria-expanded={showSchoolMap} aria-controls="school-detail-location" onClick={() => setShowSchoolMap((open) => !open)}>
                <MapPinIcon className="w-4 h-4" aria-hidden="true" />
                {showSchoolMap ? 'Thu gọn bản đồ' : 'Xem bản đồ'}
              </Button>

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

        <div className="school-detail-summary">
          <section className="school-detail-info-card school-detail-contract-card" aria-label="Thời hạn hợp đồng">
            <div className="school-detail-section-heading">
              <h3><CalendarIcon className="w-4 h-4" aria-hidden="true" />Thời hạn hợp đồng</h3>
            </div>
            <p className="school-detail-contract">
              <time dateTime={school.contractStartDate}>{formatDate(school.contractStartDate)}</time>
              <span>–</span>
              <time dateTime={school.contractEndDate}>{formatDate(school.contractEndDate)}</time>
            </p>
          </section>
          <SchoolSchedule schedule={school.weeklySchedule ?? {}} schoolName={school.name} schoolId={school.id} contractStartDate={school.contractStartDate} contractEndDate={school.contractEndDate} isActive={school.isActive} />
        </div>
        {showSchoolMap && (
          <section id="school-detail-location" className="school-detail-location" aria-label="Vị trí trường">
            <VietMapPicker
              latitude={school.latitude}
              longitude={school.longitude}
              onChangeCoordinates={() => undefined}
              disabled
            />
          </section>
        )}
      </Card>

      {/* 14. Horizontal Tabs (Section 14 & Wireframe W6) */}
      <div className="space-y-2">
        <div className="flex flex-wrap border-b border-slate-200 gap-6">
          <Button
            type="button"
            onClick={() => setActiveTab('calendar')}
            variant={activeTab === 'calendar' ? 'primary' : 'ghost'}
            size="sm"
          >
            <CalendarIcon className="w-4 h-4" />
            Lịch vận hành
          </Button>
          <Button
            type="button"
            onClick={() => setActiveTab('employees')}
            variant={activeTab === 'employees' ? 'primary' : 'ghost'}
            size="sm"
          >
            <UsersIcon className="w-4 h-4" />
            <span>Nhân viên trường</span>
          </Button>

          <Button
            type="button"
            onClick={() => setActiveTab('students')}
            variant={activeTab === 'students' ? 'primary' : 'ghost'}
            size="sm"
          >
            <StudentIcon className="w-4 h-4" />
            <span>Học sinh</span>
          </Button>

          <Button
            type="button"
            onClick={() => setActiveTab('routes')}
            variant={activeTab === 'routes' ? 'primary' : 'ghost'}
            size="sm"
          >
            <RouteIcon className="w-4 h-4" />
            <span>Phương án tuyến</span>
          </Button>

          <Button
            type="button"
            onClick={() => setActiveTab('trips')}
            variant={activeTab === 'trips' ? 'primary' : 'ghost'}
            size="sm"
          >
            <BusIcon className="w-4 h-4" />
            <span>Chuyến xe</span>
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === 'calendar' && <SchoolOperatingCalendar schoolId={school.id} role={user?.role ?? null} onUpdated={fetchSchoolDetail} activeTab={operatingCalendarTab} onTabChange={setOperatingCalendarTab} />}
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
        onSuccess={(msg?: string, partial?: boolean) => {
          setIsEditModalOpen(false);
          if (partial) toast.warning(msg || 'Chỉ lưu được một phần thay đổi.');
          else toast.success(msg || 'Cập nhật thông tin trường học thành công.');
          fetchSchoolDetail();
        }}
      />

      {/* Status Confirmation Dialog */}
      <SchoolStatusDialog
        isOpen={isStatusDialogOpen}
        schoolId={school.id}
        schoolName={school.name}
        currentIsActive={school.isActive}
        contractEndDate={school.contractEndDate}
        onClose={() => setIsStatusDialogOpen(false)}
        onSuccess={handleStatusChangeSuccess}
      />
    </div>
  );
}
