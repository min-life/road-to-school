'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { displayDate, lifecycleError, lifecycleReason, type AdminFinalizationTrip, type FinalizeTripInput } from '@/lib/school-lifecycle';
import { getTripStatusLabel } from '@/lib/status-labels';
import { LifecycleDialog } from '@/components/admin/common/lifecycle-dialog';
import { ContextLink } from '@/components/admin/common/context-navigation';
import { PaginationControl } from '@/components/admin/common/pagination-control';
import { Button } from '@/components/ui/button';
import { Table } from '@/components/ui/table';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/stores/toast-store';

export function AdminFinalizationsPanel({ onUpdated, schoolId }: { onUpdated: () => void; schoolId?: string }) {
  const [rows, setRows] = useState<AdminFinalizationTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [revision, setRevision] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selected, setSelected] = useState<AdminFinalizationTrip | null>(null);
  const [finalStatus, setFinalStatus] = useState<FinalizeTripInput['finalStatus']>('CANCELLED');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let current = true;
    apiClient.getAdminFinalizations(schoolId).then(data => { if (current) { setRows(data); setError(''); } })
      .catch(value => { if (current) setError(lifecycleError(value)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [revision, schoolId]);
  const confirm = async () => {
    if (!selected || busy || !['SCHEDULED', 'IN_PROGRESS'].includes(selected.status)) return;
    if (!reason.trim()) { setActionError('Vui lòng nhập lý do xử lý.'); return; }
    setBusy(true); setActionError('');
    try {
      await apiClient.finalizeTrip(selected.id, { finalStatus, expectedStatus: selected.status as FinalizeTripInput['expectedStatus'], reason: reason.trim() });
      setSelected(null); setRevision(value => value + 1); onUpdated(); toast.success('Đã kết thúc xử lý chuyến.');
    } catch (value) {
      setActionError(lifecycleError(value));
      // Refresh the list after a concurrent update; never repeat the mutation automatically.
      setRevision(value => value + 1);
    } finally { setBusy(false); }
  };
  const pages = Math.max(1, Math.ceil(rows.length / limit));
  const currentPage = Math.min(page, pages);
  return <section className="lifecycle-panel" aria-label="Chuyến cần xử lý hành chính">
    <div className="lifecycle-panel-heading"><h2>Cần xử lý hành chính ({rows.length})</h2><Button type="button" variant="outline" size="sm" onClick={() => setRevision(value => value + 1)}>Làm mới</Button></div>
    <p className="lifecycle-notice">Các chuyến cần nhà xe quyết định trạng thái cuối sau thay đổi điều kiện vận hành. Hoàn tất hành chính không xác nhận học sinh đã xuống xe.</p>
    {error && <p className="lifecycle-error" role="alert">{error}</p>}
    {loading ? <p role="status">Đang tải chuyến…</p> : !rows.length && !error ? <p className="py-4 text-sm text-slate-500">Không có chuyến cần xử lý.</p> : <>
      <div className="overflow-x-auto mt-4"><Table minWidth={700}><thead><tr><th>Chuyến / Tuyến</th><th>Ngày chạy</th><th>Trạng thái</th><th>Nguyên nhân</th><th>Thao tác</th></tr></thead><tbody>
        {rows.slice((currentPage - 1) * limit, currentPage * limit).map(row => <tr key={row.id}>
          <td><strong>{row.routeSnapshot?.routeName || row.routeSnapshot?.name || 'Chuyến xe'}</strong><small className="block text-slate-500">{row.id.slice(0, 8)}</small></td>
          <td>{displayDate(row.serviceDate)}</td><td>{getTripStatusLabel(row.status)}</td><td>{lifecycleReason(row.adminFinalization?.trigger) || 'Thay đổi điều kiện vận hành'}</td>
          <td><div className="flex justify-end flex-wrap gap-2"><ContextLink className="ui-button" data-variant="outline" data-size="sm" href={`/admin/trips/${row.id}`}>Chi tiết</ContextLink><Button type="button" variant="primary" size="sm" onClick={() => { setSelected(row); setReason(''); setFinalStatus('CANCELLED'); setActionError(''); }}>Xử lý</Button></div></td>
        </tr>)}
      </tbody></Table></div>
      <PaginationControl page={currentPage} totalPages={pages} total={rows.length} limit={limit} onPageChange={setPage} onLimitChange={value => { setLimit(value); setPage(1); }} />
    </>}
    <LifecycleDialog open={Boolean(selected)} title="Xử lý kết thúc chuyến" busy={busy} onClose={() => setSelected(null)} footer={<><Button type="button" variant="outline" disabled={busy} onClick={() => setSelected(null)}>Quay lại</Button><Button type="submit" form="finalize-trip-form" variant={finalStatus === 'CANCELLED' ? 'danger' : 'primary'} disabled={busy}>{busy ? 'Đang xử lý…' : 'Xác nhận'}</Button></>}>
      <form id="finalize-trip-form" className="lifecycle-fields" onSubmit={event => { event.preventDefault(); void confirm(); }}>
        <strong>{selected?.routeSnapshot?.routeName || 'Chuyến xe'} · {selected && displayDate(selected.serviceDate)}</strong>
        <p className="lifecycle-notice">Thao tác không tạo điểm danh, không xác nhận xuống xe và không tự ghi thời gian kết thúc thực tế.</p>
        <label>Trạng thái cuối *<Select value={finalStatus} onChange={event => setFinalStatus(event.target.value as typeof finalStatus)} disabled={busy}><option value="CANCELLED">Đã hủy</option><option value="COMPLETED">Đã hoàn thành</option></Select></label>
        <label>Lý do *<Textarea required maxLength={500} rows={3} value={reason} onChange={event => setReason(event.target.value)} disabled={busy} /></label>
        {actionError && <p className="lifecycle-error" role="alert">{actionError}</p>}
      </form>
    </LifecycleDialog>
  </section>;
}
