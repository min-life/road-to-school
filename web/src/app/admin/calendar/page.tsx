'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { apiClient } from '@/lib/api-client';
import { displayDate, lifecycleError, type SchoolOperatingSettings } from '@/lib/school-lifecycle';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { FilterToolbar, FilterField } from '@/components/ui/filter-toolbar';
import { SchoolSelectFilter } from '@/components/admin/common/school-select-filter';
import { SchoolSchedule } from '@/components/admin/schools/school-schedule';
import { SchoolOperatingCalendar, type CalendarTab } from '@/components/admin/schools/school-operating-calendar';
import { ServiceCalendarPanel } from '@/components/admin/schools/service-calendar-panel';
import type { Role } from '@/lib/types';

export default function OperatingCalendarPage() {
  const { user } = useAuth();
  const query = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  if (!user || !['SYSTEM_ADMIN', 'SCHOOL_ADMIN'].includes(user.role)) return null;
  const isSystem = user.role === 'SYSTEM_ADMIN';
  const schoolId = isSystem ? query.get('schoolId') || undefined : user.schoolId || undefined;
  return <div className="ui-list-page">
    <PageHeader title="Lịch vận hành" />
    {isSystem && <FilterToolbar><FilterField label="Phạm vi lịch"><SchoolSelectFilter value={schoolId || ''} allLabel="Nhà xe & tất cả trường" onChange={id => { const next = new URLSearchParams(query.toString()); if (id) next.set('schoolId', id); else next.delete('schoolId'); router.replace(`${pathname}?${next}`, { scroll: false }); }} /></FilterField></FilterToolbar>}
    {schoolId ? <SchoolCalendarContent key={`${user.id}:${user.role}:${schoolId}`} schoolId={schoolId} role={user.role} />
      : isSystem ? <ServiceCalendarPanel key={`${user.id}:operator`} role={user.role} />
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
