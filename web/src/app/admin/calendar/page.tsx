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
    <section className="lifecycle-panel" aria-label="Thông tin trường">
      <div className="lifecycle-panel-heading"><h2>{school.name}</h2><span className="lifecycle-status">{school.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}</span></div>
      <p className="text-sm text-slate-500">Hợp đồng: {displayDate(school.contractStartDate)} – {displayDate(school.contractEndDate)}</p>
    </section>
    <SchoolSchedule schoolId={school.id} schoolName={school.name} schedule={school.weeklySchedule ?? {}} contractStartDate={school.contractStartDate} contractEndDate={school.contractEndDate} isActive={school.isActive} refreshKey={revision} />
    <SchoolOperatingCalendar schoolId={school.id} role={role} onUpdated={refresh} activeTab={tab} onTabChange={setTab} />
  </>;
}
