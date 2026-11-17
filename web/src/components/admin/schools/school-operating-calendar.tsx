'use client';

import { useId, useState, type KeyboardEvent } from 'react';
import type { Role } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ServiceCalendarPanel } from './service-calendar-panel';
import { SchoolScheduledChanges } from './school-scheduled-changes';
import './school-operating-calendar.css';

const tabs = ['calendar', 'changes'] as const;
export type CalendarTab = typeof tabs[number];

export function SchoolOperatingCalendar({
  schoolId,
  role,
  onUpdated,
  activeTab,
  onTabChange,
  contractStartDate,
  contractEndDate,
  isActive,
}: {
  schoolId: string;
  role: Role | null;
  onUpdated: () => void;
  activeTab: CalendarTab;
  onTabChange: (tab: CalendarTab) => void;
  contractStartDate?: string;
  contractEndDate?: string;
  isActive?: boolean;
}) {
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const id = useId();
  const navigateTabs = (event: KeyboardEvent<HTMLButtonElement>, tab: CalendarTab) => {
    const index = tabs.indexOf(tab);
    const next = event.key === 'ArrowRight' ? tabs[(index + 1) % tabs.length]
      : event.key === 'ArrowLeft' ? tabs[(index + tabs.length - 1) % tabs.length]
        : event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs[tabs.length - 1] : null;
    if (!next) return;
    event.preventDefault();
    onTabChange(next);
    document.getElementById(`${id}-${next}-tab`)?.focus();
  };

  return <div className="school-operating-calendar school-operating-calendar-frame">
    <div className="school-operating-subtabs" role="tablist" aria-label="Lịch vận hành">
      {tabs.map(tab => <button key={tab} type="button" role="tab" id={`${id}-${tab}-tab`}
        aria-selected={activeTab === tab} aria-controls={`${id}-${tab}-panel`} tabIndex={activeTab === tab ? 0 : -1}
        className={`school-subtab-btn ${activeTab === tab ? 'is-active' : ''}`}
        onClick={() => onTabChange(tab)} onKeyDown={event => navigateTabs(event, tab)}>
        <span>{tab === 'calendar' ? 'Ngày nghỉ & học bù' : 'Thay đổi đã hẹn'}</span>
        {tab === 'changes' && pendingCount !== null && pendingCount > 0 && <span className="school-operating-calendar-count" aria-label={`${pendingCount} thay đổi chờ áp dụng`}>{pendingCount}</span>}
      </button>)}
    </div>
    {/* Keep both mounted to retain their data and existing request/mutation behavior. */}
    <div role="tabpanel" id={`${id}-calendar-panel`} aria-labelledby={`${id}-calendar-tab`} hidden={activeTab !== 'calendar'}>
      <ServiceCalendarPanel
        schoolId={schoolId}
        role={role}
        onUpdated={onUpdated}
        contractStartDate={contractStartDate}
        contractEndDate={contractEndDate}
        isSchoolActive={isActive}
      />
    </div>
    <div role="tabpanel" id={`${id}-changes-panel`} aria-labelledby={`${id}-changes-tab`} hidden={activeTab !== 'changes'}>
      <SchoolScheduledChanges schoolId={schoolId} canManage={role === 'SYSTEM_ADMIN'} onUpdated={onUpdated} onPendingCountChange={setPendingCount} />
    </div>
  </div>;
}
