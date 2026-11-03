'use client';

import { useEffect, useState } from 'react';
import type { Role } from '@/lib/types';
import { apiClient } from '@/lib/api-client';
import { lifecycleError, lifecycleReason, type ServiceCalendarEntry } from '@/lib/school-lifecycle';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ContextLink } from '@/components/admin/common/context-navigation';
import { LifecycleDialog } from '@/components/admin/common/lifecycle-dialog';
import { ServiceCalendarForm } from './service-calendar-form';
import { toast } from '@/stores/toast-store';
import { calendarMatches, calendarOccurrence } from '@/lib/service-calendar';
import { vietnamDate } from '@/lib/school-lifecycle';

const statuses = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Đã từ chối', CANCELLED: 'Đã hủy', BLOCKED: 'Bị chặn' };
export function ServiceCalendarPanel({ schoolId, role, onUpdated }: { schoolId?: string; role: Role | null; onUpdated?: () => void }) {
  const [rows, setRows] = useState<ServiceCalendarEntry[]>([]);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [creating, setCreating] = useState(false);
  const [action, setAction] = useState<{ row: ServiceCalendarEntry; type: 'APPROVED' | 'REJECTED' | 'CANCEL' } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'PENDING'>('ALL');
  const allowed = role === 'SYSTEM_ADMIN' || (role === 'SCHOOL_ADMIN' && Boolean(schoolId));
  useEffect(() => {
    if (!allowed) return;
    let current = true;
    apiClient.getServiceCalendar(schoolId).then(data => { if (current) { setRows(data); setError(''); } })
      .catch(value => { if (current) setError(lifecycleError(value)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [schoolId, allowed, revision]);
  const reload = () => { setRevision(value => value + 1); onUpdated?.(); };
  const run = async () => {
    if (!action || busy || !allowed) return;
    if (action.type === 'REJECTED' && !reason.trim()) { setActionError('Vui lòng nhập lý do từ chối.'); return; }
    setBusy(true); setActionError('');
    try {
      if (action.type === 'CANCEL') await apiClient.cancelServiceCalendar(action.row.id);
      else await apiClient.decideServiceCalendar(action.row.id, { status: action.type, ...(reason.trim() ? { reason: reason.trim() } : {}) });
      toast.success('Đã cập nhật lịch dịch vụ.'); setAction(null); reload();
    } catch (value) { setActionError(lifecycleError(value)); setRevision(value => value + 1); }
    finally { setBusy(false); }
  };
  if (!allowed) return null;
  const visible = rows.filter(row => filter === 'ALL' || row.status === 'PENDING');
  return <section className="lifecycle-panel" aria-label="Lịch nghỉ và học bù">
    <div className="lifecycle-panel-heading"><h2>{schoolId ? 'Lịch nghỉ và học bù' : 'Lịch dịch vụ'}</h2><div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => setFilter(value => value === 'ALL' ? 'PENDING' : 'ALL')}>{filter === 'ALL' ? 'Chỉ chờ duyệt' : 'Tất cả lịch'}</Button>
      <Button type="button" variant="outline" size="sm" onClick={() => setRevision(value => value + 1)}>Làm mới</Button>
      <Button type="button" variant="primary" size="sm" onClick={() => setCreating(true)}>{schoolId ? role === 'SCHOOL_ADMIN' ? 'Thêm ngày nghỉ / học bù' : 'Thêm ngày nghỉ' : 'Thêm ngày nghỉ nhà xe'}</Button>
    </div></div>
    {error && <p className="lifecycle-error" role="alert">{error}</p>}
    {loading ? <p role="status">Đang tải lịch…</p> : !visible.length && !error ? <p className="text-sm text-slate-500">Chưa có lịch phù hợp.</p> : <div className="lifecycle-records">{visible.map(row => {
      const status = row.effectiveStatus ?? row.status;
      const occurrence = row.year ? calendarOccurrence(row, row.year) : null;
      const canCancel = row.kind === 'HOLIDAY' && row.status === 'APPROVED' && (row.recurrence === 'ANNUAL' ? !calendarMatches(row, vietnamDate()) : Boolean(occurrence && occurrence > vietnamDate())) && (role === 'SYSTEM_ADMIN' || row.schoolId === schoolId);
      return <article className="lifecycle-record" key={row.id}>
        <div><strong>{row.title}</strong><small>{row.kind === 'MAKEUP' ? 'Học bù' : 'Ngày nghỉ'} · {row.schoolId ? 'Lịch trường' : 'Toàn bộ nhà xe'}</small>
          <small>{String(row.day).padStart(2, '0')}/{String(row.month).padStart(2, '0')}{row.year ? `/${row.year}` : ' · Hằng năm'} · {row.calendar === 'LUNAR' ? `Âm lịch${row.leapMonth ? ' · Tháng nhuận' : ''}` : 'Dương lịch'}{row.startTime && row.endTime ? ` · ${row.startTime}–${row.endTime}` : ''}</small>
          {row.effectiveStatusReason && <small>{lifecycleReason(row.effectiveStatusReason)}</small>}
          {row.reason && <small>Lý do: {row.reason}</small>}
          {role === 'SYSTEM_ADMIN' && row.schoolId && !schoolId && <ContextLink className="text-xs text-blue-700" href={`/admin/calendar?schoolId=${row.schoolId}`}>Xem lịch trường</ContextLink>}
        </div>
        <div className="lifecycle-record-actions"><span className="lifecycle-status" data-pending={status === 'PENDING' || status === 'BLOCKED'}>{statuses[status]}</span>
          {role === 'SYSTEM_ADMIN' && row.kind === 'MAKEUP' && row.status === 'PENDING' && <><Button type="button" variant="primary" size="sm" onClick={() => { setReason(''); setActionError(''); setAction({ row, type: 'APPROVED' }); }}>Duyệt</Button><Button type="button" variant="outline" size="sm" onClick={() => { setReason(''); setActionError(''); setAction({ row, type: 'REJECTED' }); }}>Từ chối</Button></>}
          {canCancel && <Button type="button" variant="outline" size="sm" onClick={() => { setReason(''); setActionError(''); setAction({ row, type: 'CANCEL' }); }}>Hủy ngày nghỉ</Button>}
        </div>
      </article>;
    })}</div>}
    {creating && <ServiceCalendarForm schoolId={schoolId} canRequestMakeup={role === 'SCHOOL_ADMIN'} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); toast.success('Đã lưu lịch dịch vụ.'); reload(); }} />}
    <LifecycleDialog open={Boolean(action)} title={action?.type === 'CANCEL' ? 'Hủy ngày nghỉ?' : action?.type === 'REJECTED' ? 'Từ chối học bù?' : 'Duyệt học bù?'} busy={busy} onClose={() => setAction(null)} footer={<><Button type="button" variant="outline" disabled={busy} onClick={() => setAction(null)}>Quay lại</Button><Button type="button" variant={action?.type === 'APPROVED' ? 'primary' : 'danger'} disabled={busy} onClick={run}>{busy ? 'Đang xử lý…' : 'Xác nhận'}</Button></>}>
      <div className="lifecycle-fields"><strong>{action?.row.title}</strong><p className="lifecycle-notice">Hệ thống kiểm tra ngày hiệu lực và xung đột khi xác nhận. Hủy ngày nghỉ không tự phục hồi chuyến đã hủy.</p>
        {action?.type !== 'CANCEL' && <label>Lý do {action?.type === 'REJECTED' ? '*' : '(tùy chọn)'}<Textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={500} disabled={busy} /></label>}
        {actionError && <p className="lifecycle-error" role="alert">{actionError}</p>}
      </div>
    </LifecycleDialog>
  </section>;
}
