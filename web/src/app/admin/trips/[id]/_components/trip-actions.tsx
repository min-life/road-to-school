'use client';
import { useId, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { ReopenTripRequest, Role, TripDetail, TripAttendanceRoster } from '@/lib/types';
import { canCancelAllAbsent, canReopenTrip } from '@/lib/web-api-integration';
import { LifecycleDialog } from '@/components/admin/common/lifecycle-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/stores/toast-store';
import { ReopenResourceSelect } from './reopen-resource-select';

export function TripActions({ trip, roster, role, schoolId, onUpdated }: {
  trip: TripDetail; roster: TripAttendanceRoster | null; role?: Role; schoolId?: string | null; onUpdated: () => void;
}) {
  const [action, setAction] = useState<'reopen' | 'absent' | null>(null);
  const [reason, setReason] = useState('');
  const [resources, setResources] = useState<Omit<ReopenTripRequest, 'reason'>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const formId = useId();
  const reopen = canReopenTrip(trip, roster, role);
  const absent = canCancelAllAbsent(trip, roster, role, schoolId);
  const allowed = action === 'reopen' ? reopen : absent;
  const open = (value: 'reopen' | 'absent') => { setReason(''); setError(''); setResources({}); setAction(value); };
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!action || !allowed || busy || !reason.trim() || reason.trim().length > 500) return;
    setBusy(true); setError('');
    try {
      if (action === 'reopen') await apiClient.reopenTrip(trip.id, { ...resources, reason: reason.trim() });
      else await apiClient.cancelAllAbsent(trip.id, reason.trim());
      toast.success(action === 'reopen' ? 'Đã mở lại chuyến.' : 'Đã hủy chuyến do toàn bộ học sinh vắng.');
      setAction(null); onUpdated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể thực hiện. Vui lòng tải lại dữ liệu.');
      onUpdated();
    } finally { setBusy(false); }
  }
  return <>
    <div className="flex flex-wrap gap-2">
      {reopen && <Button size="sm" variant="outline" onClick={() => open('reopen')}>Mở lại chuyến</Button>}
      {absent && <Button size="sm" variant="danger" onClick={() => open('absent')}>Hủy chuyến do học sinh vắng</Button>}
    </div>
    {action && <LifecycleDialog open title={action === 'reopen' ? 'Mở lại chuyến?' : 'Hủy chuyến do học sinh vắng?'} busy={busy} onClose={() => setAction(null)}
      footer={<><Button variant="outline" disabled={busy} onClick={() => setAction(null)}>Quay lại</Button>
        <Button form={formId} type="submit" variant={action === 'reopen' ? 'primary' : 'danger'} disabled={busy || !allowed || !reason.trim() || reason.trim().length > 500}>{busy ? 'Đang lưu…' : 'Xác nhận'}</Button></>}>
      <form id={formId} onSubmit={submit} className="space-y-4">
        <p className="font-semibold">{trip.routeName} · {trip.serviceDate}</p>
        <p className="text-sm text-slate-500">{action === 'reopen' ? 'Dùng lịch và danh sách học sinh hiện hành, giữ báo nghỉ còn hiệu lực. Phụ xe cần xác nhận sẵn sàng lại.' : 'Chuyến chiều về đã sẵn sàng, toàn bộ học sinh được ghi nhận vắng có lý do.'}</p>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        {!allowed && <p role="alert" className="text-sm text-amber-800">Dữ liệu đã thay đổi hoặc chưa đủ dữ liệu kiểm tra. Đóng và tải lại chuyến.</p>}
        <label htmlFor={formId + '-reason'} className="block text-sm font-semibold">Lý do <span className="text-rose-600">*</span></label>
        <Textarea className="block w-full border bg-white px-3 py-2" id={formId + '-reason'} required maxLength={500} rows={3} autoFocus disabled={busy} value={reason} onChange={event => setReason(event.target.value)} />
        {action === 'reopen' && <details><summary className="cursor-pointer text-sm font-semibold">Đổi nguồn lực (tùy chọn)</summary>
          <p className="text-xs text-slate-500 my-2">Hệ thống kiểm tra lịch trùng và khả dụng khi xác nhận.</p>
          <fieldset disabled={busy} className="space-y-4">
            <ReopenResourceSelect kind="vehicle" schoolId={trip.schoolId} onChange={id => setResources(value => ({ ...value, vehicleId: id || undefined }))} />
            <ReopenResourceSelect kind="driver" schoolId={trip.schoolId} onChange={id => setResources(value => ({ ...value, driverId: id || undefined }))} />
            <ReopenResourceSelect kind="attendant" schoolId={trip.schoolId} onChange={id => setResources(value => ({ ...value, busAttendantId: id || undefined }))} />
          </fieldset>
        </details>}
      </form>
    </LifecycleDialog>}
  </>;
}
