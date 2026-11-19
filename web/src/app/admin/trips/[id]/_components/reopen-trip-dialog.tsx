'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle } from 'lucide-react';
import { LifecycleDialog } from '@/components/admin/common/lifecycle-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { apiClient, ApiError } from '@/lib/api-client';
import type { ReopenStaffLeaveNotice, TripDetail } from '@/lib/types';
import { toast } from '@/stores/toast-store';
import { ReopenResourceSelect, type ReopenResourceOption } from './reopen-resource-select';

const kinds = ['vehicle', 'driver', 'attendant'] as const;
type ResourceKind = typeof kinds[number];
const labels: Record<ResourceKind, string> = { vehicle: 'Xe', driver: 'Tài xế', attendant: 'Giáo viên phụ xe' };
const errorCodes: Record<string, ResourceKind | undefined> = {
  REOPEN_VEHICLE: 'vehicle', REOPEN_DRIVER: 'driver', REOPEN_ATTENDANT: 'attendant',
};
const noticeKinds = { vehicle: null, driver: 'DRIVER', attendant: 'BUS_ATTENDANT' };

export function ReopenTripDialog({ trip, allowed, onClose, onUpdated }: {
  trip: TripDetail; allowed: boolean; onClose: () => void; onUpdated: () => void;
}) {
  const id = useId();
  const rowButtons = useRef<Partial<Record<ResourceKind, HTMLButtonElement | null>>>({});
  const [reason, setReason] = useState('');
  const [selected, setSelected] = useState<Partial<Record<ResourceKind, ReopenResourceOption>>>({});
  const [editing, setEditing] = useState<ResourceKind | null>(null);
  const [notices, setNotices] = useState<ReopenStaffLeaveNotice[] | null>(null);
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [noticeError, setNoticeError] = useState('');
  const [retry, setRetry] = useState(0);
  const [resourceError, setResourceError] = useState<{ kind: ResourceKind; message: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    apiClient.getReopenStaffLeaveNotices(trip.id, controller.signal).then(({ items }) => {
      if (!controller.signal.aborted) setNotices(items);
    }).catch(() => {
      if (!controller.signal.aborted) setNoticeError('Không thể kiểm tra báo nghỉ.');
    });
    return () => controller.abort();
  }, [trip.id, retry]);

  function reloadNotices() {
    setNotices(null);
    setNoticeError('');
    setRetry(value => value + 1);
  }

  const original = {
    vehicle: { id: trip.vehicleId, label: trip.vehiclePlate },
    driver: { id: trip.driverId, label: trip.driverName },
    attendant: { id: trip.busAttendantId, label: trip.busAttendantName },
  };
  const rows = kinds.map(kind => {
    const choice = selected[kind] ?? original[kind];
    const notice = notices?.find(item => item.kind === noticeKinds[kind] && item.staffId === choice.id);
    return { kind, choice, notice, unresolved: Boolean(notice && !confirmed.includes(notice.id)) };
  });
  const canSubmit = allowed && notices !== null && !rows.some(row => row.unresolved)
    && Boolean(reason.trim()) && reason.trim().length <= 500 && !busy;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError('');
    setResourceError(null);
    try {
      const result = await apiClient.reopenTrip(trip.id, {
        reason: reason.trim(), vehicleId: selected.vehicle?.id, driverId: selected.driver?.id,
        busAttendantId: selected.attendant?.id,
        confirmedStaffLeaveNoticeIds: rows.flatMap(({ notice }) => notice && confirmed.includes(notice.id) ? [notice.id] : []),
      });
      toast.success(result.message);
      onClose();
      onUpdated();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Không thể mở lại chuyến.';
      const kind = cause instanceof ApiError ? errorCodes[cause.code] : undefined;
      if (kind) {
        setResourceError({ kind, message });
        setEditing(null);
      } else if (cause instanceof ApiError && cause.code === 'REOPEN_STAFF_LEAVE') {
        reloadNotices();
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  function selectResource(kind: ResourceKind, option: ReopenResourceOption) {
    setSelected(value => ({ ...value, [kind]: option.id === original[kind].id ? undefined : option }));
    setEditing(null);
    setError('');
    if (resourceError?.kind === kind) setResourceError(null);
    rowButtons.current[kind]?.focus();
  }

  const routeNumber = /^(?:TD|TV)(\d+)(?:-|$)/i.exec(trip.routeName)?.[1];
  const direction = trip.direction === 'TO_SCHOOL' ? 'Tuyến đi' : 'Tuyến về';
  const routeLabel = routeNumber ? `${direction} ${routeNumber}` : trip.routeName || direction;
  const serviceDate = trip.serviceDate.slice(0, 10).split('-').reverse().join('/');

  return <LifecycleDialog open title="Mở lại chuyến" busy={busy} onClose={onClose} className="!w-[min(560px,calc(100vw-24px))]"
    footer={<>
      <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Quay lại</Button>
      <Button form={id} type="submit" variant="primary" disabled={!canSubmit}>{busy ? 'Đang mở lại…' : 'Mở lại chuyến'}</Button>
    </>}>
    <form id={id} onSubmit={submit} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700">{routeLabel} · {serviceDate} · {trip.scheduledStartTime.slice(0, 5)}</p>
        <span className="lifecycle-status">Đã hủy</span>
      </div>
      {rows.map(({ kind, choice, notice }) => notice && <div key={kind} className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
        <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 space-y-1">
          <p className="font-semibold">{choice.label || labels[kind]} đã báo nghỉ cho chuyến này</p>
          <p>Chọn người thay hoặc xác nhận người này có thể làm chuyến.</p>
          <label className="flex min-h-8 items-center gap-2 font-medium">
            <input type="checkbox" checked={confirmed.includes(notice.id)} disabled={busy}
              onChange={event => { const checked = event.target.checked; setConfirmed(value => checked ? [...value, notice.id] : value.filter(item => item !== notice.id)); }} />
            Xác nhận {labels[kind].toLowerCase()} có thể làm chuyến
          </label>
        </div>
      </div>)}
      <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        Chuyến dùng lịch và danh sách học sinh hiện hành. Giáo viên phụ xe cần xác nhận sẵn sàng lại.
      </p>
      {notices === null && !noticeError && <p role="status" className="text-sm text-slate-600">Đang kiểm tra báo nghỉ…</p>}
      {noticeError && <div className="flex flex-wrap items-center gap-2 text-sm text-rose-700">
        <span role="alert">{noticeError}</span><Button type="button" variant="outline" size="sm" onClick={reloadNotices}>Thử lại</Button>
      </div>}
      {!allowed && <p role="alert" className="text-sm text-amber-800">Chuyến không còn đủ điều kiện mở lại.</p>}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <div className="space-y-2">
        <label htmlFor={`${id}-reason`} className="block text-sm font-semibold">Lý do mở lại <span className="text-rose-700">*</span></label>
        <Textarea id={`${id}-reason`} className="block w-full border bg-white px-3 py-2" required maxLength={500}
          rows={3} disabled={busy} value={reason} onChange={event => setReason(event.target.value)} />
      </div>
      <fieldset disabled={busy} className="min-w-0 space-y-2">
        <legend className="text-sm font-semibold">Phân công sau khi mở lại</legend>
        <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
          {rows.map(({ kind, choice, unresolved }) => <div key={kind} className={unresolved ? 'bg-amber-50' : undefined}>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 px-3 py-1 text-sm sm:grid-cols-[135px_minmax(0,1fr)_auto]">
              <span className="col-start-1 row-start-1 text-slate-600">{labels[kind]}</span>
              <span className="col-start-1 row-start-2 break-words font-semibold sm:col-start-2 sm:row-start-1">{choice.label || 'Chưa phân công'}</span>
              <Button type="button" variant="ghost" size="sm" className="col-start-2 row-span-2 row-start-1 !text-blue-800 sm:col-start-3 sm:row-span-1"
                ref={node => { rowButtons.current[kind] = node; }} aria-expanded={editing === kind}
                aria-label={`${editing === kind ? 'Đóng bộ chọn' : unresolved ? 'Chọn người thay' : 'Đổi'} ${labels[kind].toLowerCase()}`}
                onClick={() => setEditing(editing === kind ? null : kind)}>
                {editing === kind ? 'Đóng' : unresolved ? 'Chọn người thay' : 'Đổi'}
              </Button>
            </div>
            {resourceError?.kind === kind && <p role="alert" className="px-3 pb-2 text-sm text-rose-700">{resourceError.message}</p>}
            {editing === kind && <div className="space-y-2 border-t border-slate-200 bg-slate-50 p-3">
              <ReopenResourceSelect kind={kind} schoolId={trip.schoolId} onPick={option => selectResource(kind, option)} />
              {selected[kind] && <Button type="button" size="sm" variant="outline" onClick={() => selectResource(kind, original[kind])}>Dùng phân công ban đầu</Button>}
            </div>}
          </div>)}
        </div>
      </fieldset>
    </form>
  </LifecycleDialog>;
}
