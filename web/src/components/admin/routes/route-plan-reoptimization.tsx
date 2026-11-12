'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { ParkingLot, RoutePlanItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { LifecycleDialog } from '@/components/admin/common/lifecycle-dialog';
import { ContextLink } from '@/components/admin/common/context-navigation';
import { toast } from '@/stores/toast-store';

export function RoutePlanReoptimization({ plan, systemAdmin, onUpdated }: {
  plan: RoutePlanItem; systemAdmin: boolean; onUpdated: () => void;
}) {
  const [parking, setParking] = useState<ParkingLot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');
  useEffect(() => {
    let current = true;
    if (!plan.needsReoptimization || !systemAdmin) return;
    apiClient.getParkingLot().then(value => { if (current) { setParking(value); setError(''); } })
      .catch(cause => { if (current) setError(cause instanceof Error ? cause.message : 'Không thể kiểm tra bãi xe.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [plan.id, plan.needsReoptimization, systemAdmin, revision]);
  if (!plan.needsReoptimization) return null;
  const pending = !!parking?.scheduledChange;
  const disabled = loading || !!error || pending || !parking || ['CANCELLED', 'EXPIRED'].includes(plan.effectiveStatus || plan.status);
  async function submit() {
    if (busy || disabled) return;
    setBusy(true); setSubmitError('');
    try {
      // Recheck before mutation: a relocation may have been scheduled since opening.
      const latest = await apiClient.getParkingLot();
      setParking(latest);
      if (latest.scheduledChange) throw new Error('Bãi xe còn lịch thay đổi chưa áp dụng. Kiểm tra lại tại Cài đặt.');
      await apiClient.reoptimizeRoutePlan(plan.id);
      toast.success('Đã tối ưu lại. Phương án cần được trường duyệt lại.');
      setOpen(false); onUpdated();
    } catch (cause) { setSubmitError(cause instanceof Error ? cause.message : 'Không thể tối ưu lại phương án.'); }
    finally { setBusy(false); }
  }
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm" role="status">
      <div><strong>Cần tối ưu lại phương án</strong><p className="mt-1">{plan.reoptimizationReason || 'Điều kiện vận hành đã thay đổi.'}</p>
        {!systemAdmin && <p className="mt-1">Chờ nhà xe tối ưu lại phương án.</p>}
        {systemAdmin && pending && <p className="mt-1">Chờ áp dụng vị trí bãi mới từ {parking?.scheduledChange?.effectiveDate.split('-').reverse().join('/')}.</p>}
        {error && <p role="alert">{error}</p>}
      </div>
      {systemAdmin && <div className="flex flex-wrap gap-2">
        {pending && <ContextLink href="/admin/settings?tab=parking" className="ui-button" data-variant="outline" data-size="sm">Cài đặt bãi xe</ContextLink>}
        <Button size="sm" variant="outline" disabled={loading || busy} onClick={() => { setLoading(true); setRevision(value => value + 1); }}>Kiểm tra lại</Button>
        <Button size="sm" variant="primary" disabled={disabled} onClick={() => { setSubmitError(''); setOpen(true); }}>Tối ưu lại</Button>
      </div>}
    </div>
    <LifecycleDialog open={open} title="Tối ưu lại phương án?" busy={busy} onClose={() => setOpen(false)}
      footer={<><Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>Quay lại</Button><Button variant="primary" disabled={busy || disabled} onClick={submit}>{busy ? 'Đang tối ưu…' : 'Xác nhận tối ưu'}</Button></>}>
      <div className="space-y-3 text-sm"><p className="font-semibold">{plan.name}</p>
        <p>Dùng bãi hiện tại: {parking?.addressText}</p>
        <p>Giữ phân bổ học sinh và xe; cập nhật lộ trình, thời gian. Phương án chuyển về Chưa duyệt để trường duyệt lại.</p>
        <p>Không tự sinh lại các chuyến đã hủy.</p>
        {submitError && <p role="alert" className="text-rose-700">{submitError}</p>}
      </div>
    </LifecycleDialog>
  </>;
}
