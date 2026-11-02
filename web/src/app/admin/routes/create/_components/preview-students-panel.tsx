'use client';

import { useMemo, useState } from 'react';
import type { RoutePreviewResponse } from '@/lib/types';
import { PlanningTabs } from '@/components/admin/routes/route-planning-workspace';

export function PreviewStudentsPanel({ preview }: { preview: RoutePreviewResponse }) {
  const [tab, setTab] = useState<'ASSIGNED_STUDENTS' | 'UNASSIGNED_STUDENTS'>(() =>
    preview.summary.unassignedStudents.length ? 'UNASSIGNED_STUDENTS' : 'ASSIGNED_STUDENTS');
  const assignedStudents = useMemo(() => {
    const returnRoutes = new Map(preview.returnRoutes.flatMap(route => route.students.map(student => [student.id, route.name] as const)));
    const students = new Map<string, { id: string; fullName: string; addressText?: string; outbound: string; inbound: string }>();
    for (const route of preview.outboundRoutes) {
      for (const student of route.students) {
        const inbound = returnRoutes.get(student.id);
        if (inbound !== undefined) students.set(student.id, { ...student, outbound: route.name, inbound });
      }
    }
    return [...students.values()];
  }, [preview.outboundRoutes, preview.returnRoutes]);

  return <>
    <PlanningTabs value={tab} onChange={setTab} tabs={[
      { value: 'ASSIGNED_STUDENTS', label: `Đã xếp đủ (${assignedStudents.length})` },
      { value: 'UNASSIGNED_STUDENTS', label: `Chưa xếp đủ (${preview.summary.unassignedStudents.length})` },
    ]} />
    <div className="preview-student-list" role="tabpanel" id={`planning-panel-${tab}`} aria-labelledby={`planning-tab-${tab}`} tabIndex={0}>
      {tab === 'ASSIGNED_STUDENTS' ? assignedStudents.length ? assignedStudents.map(student =>
        <article key={student.id} className="preview-student-card is-assigned">
          <h3>{student.fullName}</h3>
          {student.addressText && <p className="preview-student-address" title={student.addressText}>{student.addressText}</p>}
          <p className="preview-student-route">Chiều đi · {student.outbound}</p>
          <p className="preview-student-route">Chiều về · {student.inbound}</p>
        </article>) : <p className="route-workspace-empty">Chưa có học sinh được xếp đủ hai chiều.</p>
        : preview.summary.unassignedStudents.length ? preview.summary.unassignedStudents.map(student =>
          <article key={student.id} className="preview-student-card is-unassigned">
            <div className="preview-student-heading">
              <h3>{student.fullName}</h3>
              {student.missingDirection && <span className="preview-student-missing">
                {student.missingDirection === 'RETURN' ? 'Thiếu tuyến về' : student.missingDirection === 'OUTBOUND' ? 'Thiếu tuyến đi' : 'Chưa có tuyến'}
              </span>}
            </div>
            {student.addressText && <p className="preview-student-address" title={student.addressText}>{student.addressText}</p>}
            <p className="preview-student-reason">{student.reason || 'Vượt quá ràng buộc xe/thời gian'}</p>
          </article>) : <p className="route-workspace-empty">Tất cả học sinh đã được xếp đủ hai chiều.</p>}
    </div>
  </>;
}
