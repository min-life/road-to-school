'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { ResourceImpact, ResourceTarget } from '@/lib/resource-status';
import { toast } from '@/stores/toast-store';
import { LifecycleDialog } from './lifecycle-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

/** Lists are scoped by endpoint; availability and handover are validated by the server. */
export function ResourceStatusDialog({ target, onClose, onSuccess }: {
  target: ResourceTarget; onClose: () => void; onSuccess: () => void;
}) {
  const [impact, setImpact] = useState<ResourceImpact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [options, setOptions] = useState<{ id: string; label: string }[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState('');
  const [replacement, setReplacement] = useState<{ id: string; label: string } | null>(null);
  const needsReplacement = target.isActive && impact && !impact.canDeactivateDirectly && !impact.hasBlockingInProgress;

  useEffect(() => {
    let current = true;
    apiClient.getResourceImpact(target).then(value => {
      if (current) { setImpact(value); setError(value.isActive !== target.isActive ? 'Trạng thái đã thay đổi. Đóng và tải lại danh sách.' : ''); }
    }).catch(cause => { if (current) setError(cause instanceof Error ? cause.message : 'Không thể kiểm tra tác động.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [target, revision]);

  useEffect(() => {
    if (!needsReplacement) return;
    let current = true;
    const timer = setTimeout(async () => {
      setOptionsLoading(true); setOptionsError('');
      try {
        let items: { id: string; label: string }[], totalPages: number;
        const params = { page, limit: 20, search, status: 'ACTIVE' as const };
        if (target.kind === 'vehicle') {
          const res = await apiClient.listVehicles(params);
          items = res.items.filter(item => item.isActive).map(item => ({ id: item.id, label: `${item.licensePlate} · ${item.seatCount} chỗ · ${item.brand}` }));
          totalPages = res.totalPages;
        } else if (target.kind === 'driver') {
          const res = await apiClient.getDrivers(params);
          items = res.items.filter(item => item.isActive).map(item => ({ id: item.id, label: `${item.fullName} · ${item.email || item.phone || ''}` }));
          totalPages = res.meta.totalPages;
        } else {
          const res = await apiClient.getSchoolEmployees(target.schoolId, { ...params, role: target.role });
          items = res.items.filter(item => item.isActive).map(item => ({ id: item.id, label: `${item.fullName} · ${item.email || ''}` }));
          totalPages = res.meta.totalPages;
        }
        if (current) { setOptions(items.filter(item => item.id !== target.id)); setPages(Math.max(1, totalPages)); }
      } catch (cause) {
        if (current) { setOptions([]); setOptionsError(cause instanceof Error ? cause.message : 'Không thể tải danh sách thay thế.'); }
      } finally { if (current) setOptionsLoading(false); }
    }, 250);
    return () => { current = false; clearTimeout(timer); };
  }, [target, needsReplacement, page, search, revision]);

  async function submit() {
    if (!impact || busy || loading || error || (target.isActive && impact.hasBlockingInProgress) || (needsReplacement && !replacement)) return;
    setBusy(true); setError('');
    try {
      await apiClient.updateResourceStatus(target, !target.isActive, needsReplacement ? replacement?.id : undefined);
      toast.success(target.isActive ? 'Đã ngừng hoạt động và cập nhật bàn giao.' : 'Đã kích hoạt.');
      onSuccess(); onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể đổi trạng thái.');
      setReplacement(null);
      setImpact(null);
    } finally { setBusy(false); }
  }

  const label = target.kind === 'vehicle' ? 'phương tiện' : target.kind === 'driver' ? 'tài xế' : 'nhân viên';
  return <LifecycleDialog open title={`${target.isActive ? 'Ngừng hoạt động' : 'Kích hoạt'} ${label}`} busy={busy} onClose={onClose}
    footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Quay lại</Button><Button variant={target.isActive ? 'danger' : 'primary'}
      disabled={busy || loading || !!error || !impact || impact.isActive !== target.isActive || (target.isActive && impact.hasBlockingInProgress) || !!(needsReplacement && !replacement)}
      onClick={submit}>{busy ? 'Đang lưu…' : 'Xác nhận'}</Button></>}>
    <div className="space-y-4">
      <p className="font-semibold">{target.name}</p>
      {loading && <p role="status">Đang kiểm tra tác động…</p>}
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}
        <Button variant="outline" size="sm" disabled={busy} onClick={() => { setError(''); setLoading(true); setImpact(null); setRevision(value => value + 1); }}>Kiểm tra lại</Button></div>}
      {impact && target.isActive && <>
        <dl className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <div><dt>Tuyến ảnh hưởng</dt><dd className="text-xl font-bold">{impact.proposedRoutesCount ?? impact.defaultRoutesCount ?? impact.affectedRoutes.length}</dd></div>
          <div><dt>Đã lên lịch</dt><dd className="text-xl font-bold">{impact.scheduledTripsCount}</dd></div>
          <div><dt>Đang chạy</dt><dd className="text-xl font-bold">{impact.inProgressTripsCount}</dd></div>
        </dl>
        {impact.hasBlockingInProgress ? <p role="alert" className="text-sm text-rose-700">Có chuyến đang chạy. Chưa thể ngừng hoạt động.</p>
          : needsReplacement ? <div className="space-y-2">
            <label htmlFor="replacement-search" className="block text-sm font-semibold">Chọn thay thế <span className="text-rose-600">*</span></label>
            <Input id="replacement-search" placeholder="Tìm theo tên, email hoặc biển số…" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
            <Select aria-label="Tài nguyên thay thế" value={replacement?.id || ''} disabled={optionsLoading || busy} onChange={event => setReplacement(options.find(item => item.id === event.target.value) ?? null)}>
              <option value="">{optionsLoading ? 'Đang tải…' : 'Chọn thay thế'}</option>
              {replacement && !options.some(item => item.id === replacement.id) && <option value={replacement.id}>{replacement.label}</option>}
              {options.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </Select>
            {optionsError && <p role="alert" className="text-sm text-rose-700">{optionsError}</p>}
            {!optionsLoading && !optionsError && options.length === 0 && <p className="text-sm text-slate-500">Không có kết quả trong trang này.</p>}
            <div className="flex items-center justify-end gap-2 text-sm"><Button size="sm" variant="outline" disabled={page <= 1 || optionsLoading} onClick={() => setPage(value => value - 1)}>Trước</Button>
              {page}/{pages}<Button size="sm" variant="outline" disabled={page >= pages || optionsLoading} onClick={() => setPage(value => value + 1)}>Sau</Button></div>
            <p className="text-xs text-slate-500">Hệ thống kiểm tra sức chứa và lịch trùng khi xác nhận.</p>
          </div> : <p className="text-sm text-slate-600">Có thể ngừng hoạt động mà không cần bàn giao.</p>}
        {(impact.affectedRoutes.length > 0 || impact.affectedTrips.length > 0) && <details className="text-sm"><summary>Chi tiết ảnh hưởng</summary>
          <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">{impact.affectedRoutes.map(item => <li key={item.id}>{item.name} · {item.schoolName}</li>)}
            {impact.affectedTrips.map(item => <li key={item.id}>{item.date} · {item.routeName} · {item.schoolName}</li>)}</ul></details>}
      </>}
    </div>
  </LifecycleDialog>;
}
