'use client';
import { useId, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { Role, TripDetail, TripAttendanceRoster } from '@/lib/types';
import { canCancelAllAbsent, canCancelTrip, canReopenTrip } from '@/lib/web-api-integration';
import { LifecycleDialog } from '@/components/admin/common/lifecycle-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/stores/toast-store';
import { ReopenTripDialog } from './reopen-trip-dialog';

const actions = {
  cancel: { label: 'Hủy chuyến', note: 'Thông báo hủy sẽ được gửi đến những người liên quan.' },
  absent: { label: 'Hủy chuyến do học sinh vắng', note: 'Chuyến chiều về đã sẵn sàng, toàn bộ học sinh được ghi nhận vắng có lý do.' },
};

export function TripActions({ trip, roster, role, schoolId, onUpdated }: {
  trip: TripDetail; roster: TripAttendanceRoster | null; role?: Role; schoolId?: string | null; onUpdated: () => void;
}) {
  const [action, setAction] = useState<keyof typeof actions | null>(null);
  const [showReopen, setShowReopen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const formId = useId();
  const reopen = canReopenTrip(trip, roster, role);
  const cancel = canCancelTrip(trip, roster, role);
  const absent = canCancelAllAbsent(trip, roster, role, schoolId);
  const allowed = action && { cancel, absent }[action];
  const open = (value: keyof typeof actions) => { setReason(''); setError(''); setAction(value); };
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!action || !allowed || busy || !reason.trim() || reason.trim().length > 500) return;
    setBusy(true); setError('');
    try {
      const result = action === 'cancel'
        ? await apiClient.cancelTrip(trip.id, reason.trim())
        : await apiClient.cancelAllAbsent(trip.id, reason.trim());
      toast.success(result.message);
      setAction(null); onUpdated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể thực hiện. Vui lòng tải lại dữ liệu.');
      onUpdated();
    } finally { setBusy(false); }
  }
  return <>
    <div className="flex flex-wrap gap-2">
      {reopen && <Button size="sm" variant="outline" onClick={() => setShowReopen(true)}>Mở lại chuyến</Button>}
      {cancel && <Button size="sm" variant="danger" onClick={() => open('cancel')}>{actions.cancel.label}</Button>}
      {!cancel && absent && <Button size="sm" variant="danger" onClick={() => open('absent')}>{actions.absent.label}</Button>}
    </div>
    {showReopen && <ReopenTripDialog trip={trip} allowed={reopen} onClose={() => setShowReopen(false)} onUpdated={onUpdated} />}
    {action && <LifecycleDialog open title={`${actions[action].label}?`} busy={busy} onClose={() => setAction(null)}
      footer={<><Button variant="outline" disabled={busy} onClick={() => setAction(null)}>Quay lại</Button>
        <Button form={formId} type="submit" variant="danger" disabled={busy || !allowed || !reason.trim() || reason.trim().length > 500}>{busy ? 'Đang lưu…' : 'Xác nhận'}</Button></>}>
      <form id={formId} onSubmit={submit} className="space-y-4">
        <p className="font-semibold">{trip.routeName} · {trip.serviceDate}</p>
        <p className="text-sm text-slate-500">{actions[action].note}</p>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        {!allowed && <p role="alert" className="text-sm text-amber-800">Dữ liệu đã thay đổi hoặc chưa đủ dữ liệu kiểm tra. Đóng và tải lại chuyến.</p>}
        <label htmlFor={formId + '-reason'} className="block text-sm font-semibold">Lý do <span className="text-rose-600">*</span></label>
        <Textarea className="block w-full border bg-white px-3 py-2" id={formId + '-reason'} required maxLength={500} rows={3} autoFocus disabled={busy} value={reason} onChange={event => setReason(event.target.value)} />
      </form>
    </LifecycleDialog>}
  </>;
}
