'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { displayDate, lifecycleError, vietnamDate, type SchoolScheduledChange } from '@/lib/school-lifecycle';
import { Button } from '@/components/ui/button';
import { LifecycleDialog } from '@/components/admin/common/lifecycle-dialog';
import { toast } from '@/stores/toast-store';

const statusLabels = { PENDING: 'Đã hẹn', APPLIED: 'Đã áp dụng', CANCELLED: 'Đã hủy', FAILED: 'Áp dụng thất bại' };
const typeLabels = { INACTIVE: 'Ngừng hoạt động', LOCATION: 'Đổi vị trí', SCHEDULE: 'Đổi lịch học' };
export function SchoolScheduledChanges({ schoolId, canManage, onUpdated, onPendingCountChange }: { schoolId: string; canManage: boolean; onUpdated?: () => void; onPendingCountChange?: (count: number | null) => void }) {
  const [rows, setRows] = useState<SchoolScheduledChange[]>([]);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<SchoolScheduledChange | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let current = true;
    apiClient.getSchoolScheduledChanges(schoolId).then(data => { if (current) { setRows(data); setError(''); onPendingCountChange?.(data.filter(row => row.status === 'PENDING').length); } })
      .catch(reason => { if (current) { setError(lifecycleError(reason)); onPendingCountChange?.(null); } })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [schoolId, revision, onPendingCountChange]);
  const cancel = async () => {
    if (!selected || busy || !canManage) return;
    setBusy(true); setActionError('');
    try {
      await apiClient.cancelSchoolScheduledChange(schoolId, selected.id);
      toast.success('Đã hủy lịch hẹn.'); setSelected(null); setError('');
      onUpdated?.();
    } catch (reason) { setActionError(lifecycleError(reason)); }
    finally { setBusy(false); setRevision(value => value + 1); }
  };
  return <section className="lifecycle-panel" aria-label="Thay đổi đã hẹn">
    <div className="lifecycle-panel-heading"><h2>Thay đổi đã hẹn</h2><Button type="button" variant="outline" size="sm" onClick={() => setRevision(value => value + 1)}>Làm mới</Button></div>
    {error && <p className="lifecycle-error" role="alert">{error}</p>}
    {loading ? <p role="status">Đang tải lịch hẹn…</p> : !rows.length && !error ? <p className="text-sm text-slate-500">Chưa có thay đổi được hẹn.</p> : <div className="lifecycle-records">{rows.map(row => <article className="lifecycle-record" key={row.id}>
      <div><strong>{typeLabels[row.type]}</strong><small>Áp dụng từ {displayDate(row.effectiveDate)}</small>
        {row.payload.addressText && <small>{row.payload.addressText}</small>}
        {row.payload.weeklySchedule && <small>{Object.entries(row.payload.weeklySchedule).map(([day, hours]) => `${({ monday: 'T2', tuesday: 'T3', wednesday: 'T4', thursday: 'T5', friday: 'T6', saturday: 'T7', sunday: 'CN' } as Record<string, string>)[day] || day}: ${hours.start}–${hours.end}`).join(' · ')}</small>}
        {row.status === 'FAILED' && <small className="text-red-700">{row.lastError || 'Không thể áp dụng. Liên hệ quản trị viên.'}</small>}
      </div>
      <div className="lifecycle-record-actions"><span className="lifecycle-status" data-pending={row.status === 'PENDING'}>{statusLabels[row.status]}</span>
        {canManage && row.status === 'PENDING' && row.effectiveDate.slice(0, 10) > vietnamDate() && <Button type="button" variant="outline" size="sm" onClick={() => { setActionError(''); setSelected(row); }}>Hủy lịch hẹn</Button>}
      </div>
    </article>)}</div>}
    <LifecycleDialog open={Boolean(selected)} title="Hủy lịch thay đổi?" busy={busy} onClose={() => setSelected(null)} footer={<><Button type="button" variant="outline" disabled={busy} onClick={() => setSelected(null)}>Quay lại</Button><Button type="button" variant="danger" disabled={busy} onClick={cancel}>{busy ? 'Đang hủy…' : 'Hủy lịch hẹn'}</Button></>}>
      <p className="text-sm">Hủy lịch {selected ? typeLabels[selected.type].toLowerCase() : ''} ngày {selected ? displayDate(selected.effectiveDate) : ''}. Thao tác này không khôi phục chuyến đã hủy.</p>
      {actionError && <p className="lifecycle-error" role="alert">{actionError}</p>}
    </LifecycleDialog>
  </section>;
}
