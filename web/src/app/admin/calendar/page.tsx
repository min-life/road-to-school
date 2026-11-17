'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { apiClient } from '@/lib/api-client';
import { displayDate, lifecycleError, type SchoolOperatingSettings } from '@/lib/school-lifecycle';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { SchoolSchedule } from '@/components/admin/schools/school-schedule';
import { SchoolOperatingCalendar, type CalendarTab } from '@/components/admin/schools/school-operating-calendar';
import type { Role } from '@/lib/types';

export default function OperatingCalendarPage() {
  const { user } = useAuth();
  const query = useSearchParams();
  const router = useRouter();
  const requestedSchoolId = query.get('schoolId');
  useEffect(() => {
    if (user?.role === 'SYSTEM_ADMIN') {
      router.replace(requestedSchoolId ? `/admin/schools/${encodeURIComponent(requestedSchoolId)}?tab=calendar` : '/admin/settings?tab=holidays');
    }
  }, [user?.role, requestedSchoolId, router]);
  if (!user || user.role !== 'SCHOOL_ADMIN') return null;
  const schoolId = user.schoolId || undefined;
  return <div className="ui-list-page">
    <PageHeader title="Lịch vận hành" />
    {schoolId ? <SchoolCalendarContent key={`${user.id}:${schoolId}`} schoolId={schoolId} role={user.role} />
      : <p role="alert" className="lifecycle-error">Tài khoản chưa có trường liên kết. Vui lòng liên hệ nhà xe.</p>}
  </div>;
}

function SchoolCalendarContent({ schoolId, role }: { schoolId: string; role: Role }) {
  const [school, setSchool] = useState<SchoolOperatingSettings | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState<CalendarTab>('calendar');
  useEffect(() => {
    let current = true;
    apiClient.getSchoolOperatingSettings(schoolId).then(value => { if (current) { setSchool(value); setError(''); } })
      .catch(reason => { if (current) { setSchool(null); setError(lifecycleError(reason)); } });
    return () => { current = false; };
  }, [schoolId, revision]);
  const refresh = () => setRevision(value => value + 1);
  if (error) return <div className="lifecycle-error" role="alert">{error}<Button type="button" variant="outline" size="sm" onClick={refresh}>Thử lại</Button></div>;
  if (!school) return <p role="status">Đang tải lịch của trường…</p>;
  return <>
    <section className="school-calendar-header-card" aria-label="Thông tin trường">
      <div className="school-calendar-header-main">
        <div className="school-calendar-title-group">
          <h2 className="school-calendar-school-name">{school.name}</h2>
          <span
            className={`school-calendar-status-badge ${
              school.isActive ? 'school-calendar-status-active' : 'school-calendar-status-inactive'
            }`}
          >
            <span className="school-calendar-status-dot" aria-hidden="true" />
            {school.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
          </span>
        </div>
      </div>
      <div className="school-calendar-contract-box">
        <span className="school-calendar-contract-title">Thời hạn hợp đồng</span>
        <div className="school-calendar-contract-dates">
          <div className="school-calendar-contract-item">
            <span className="school-calendar-contract-label">Bắt đầu</span>
            <time dateTime={school.contractStartDate} className="school-calendar-contract-value">
              {displayDate(school.contractStartDate)}
            </time>
          </div>
          <span className="school-calendar-contract-divider" aria-hidden="true">–</span>
          <div className="school-calendar-contract-item">
            <span className="school-calendar-contract-label">Kết thúc</span>
            <time dateTime={school.contractEndDate} className="school-calendar-contract-value">
              {displayDate(school.contractEndDate)}
            </time>
          </div>
        </div>
      </div>
    </section>
    <SchoolSchedule schoolId={school.id} schoolName={school.name} schedule={school.weeklySchedule ?? {}} contractStartDate={school.contractStartDate} contractEndDate={school.contractEndDate} isActive={school.isActive} refreshKey={revision} />
    <SchoolOperatingCalendar
      schoolId={school.id}
      role={role}
      onUpdated={refresh}
      activeTab={tab}
      onTabChange={setTab}
      contractStartDate={school.contractStartDate}
      contractEndDate={school.contractEndDate}
      isActive={school.isActive}
    />
  </>;
}
