'use client';
import { useEffect, useId, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export function ReopenResourceSelect({ kind, schoolId, onChange, initialSelection, allowKeep = true }: {
  kind: 'vehicle' | 'driver' | 'attendant'; schoolId: string; onChange: (id: string) => void; initialSelection?: { id: string; label: string }; allowKeep?: boolean;
}) {
  const id = useId();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<{ id: string; label: string } | null>(initialSelection ?? null);
  const [result, setResult] = useState<{ key: string; items: { id: string; label: string }[]; pages: number; error?: string } | null>(null);
  const requestKey = JSON.stringify([kind, schoolId, search, page]);
  useEffect(() => {
    let current = true;
    const timer = setTimeout(async () => {
      try {
        const params = { page, limit: 20, search, status: 'ACTIVE' as const };
        let items: { id: string; label: string }[], pages: number;
        if (kind === 'vehicle') {
          const res = await apiClient.listVehicles(params);
          items = res.items.filter(item => item.isActive).map(item => ({ id: item.id, label: item.licensePlate + ' · ' + item.seatCount + ' chỗ' }));
          pages = res.totalPages;
        } else if (kind === 'driver') {
          const res = await apiClient.getDrivers(params);
          items = res.items.filter(item => item.isActive).map(item => ({ id: item.id, label: item.fullName }));
          pages = res.meta.totalPages;
        } else {
          const res = await apiClient.getSchoolEmployees(schoolId, { ...params, role: 'BUS_ATTENDANT' });
          items = res.items.filter(item => item.isActive).map(item => ({ id: item.id, label: item.fullName }));
          pages = res.meta.totalPages;
        }
        if (current) setResult({ key: requestKey, items, pages });
      } catch (error) {
        if (current) setResult({ key: requestKey, items: [], pages: 1, error: error instanceof Error ? error.message : 'Không thể tải nguồn lực.' });
      }
    }, 250);
    return () => { current = false; clearTimeout(timer); };
  }, [kind, schoolId, search, page, requestKey]);
  const label = kind === 'vehicle' ? 'Xe' : kind === 'driver' ? 'Tài xế' : 'Giáo viên phụ xe';
  const current = result?.key === requestKey ? result : null;
  return <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-semibold">{label}</label>
    <Input className="w-full border bg-white px-3 py-2" aria-label={'Tìm ' + label.toLowerCase()} placeholder={'Tìm ' + label.toLowerCase() + '…'} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
    <Select id={id} className="w-full border bg-white px-3 py-2" disabled={!current || !!current.error} value={selected?.id || ''} onChange={event => {
      const next = current?.items.find(item => item.id === event.target.value) ?? null;
      setSelected(next); onChange(next?.id || '');
    }}>
      <option value="">{current ? allowKeep ? 'Giữ phân công cũ' : 'Chọn giáo viên phụ xe' : 'Đang tải…'}</option>
      {selected && !current?.items.some(item => item.id === selected.id) && <option value={selected.id}>{selected.label}</option>}
      {current?.items.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
    </Select>
    {current?.error && <p role="alert" className="text-xs text-rose-700">{current.error}</p>}
    <div className="flex items-center justify-end gap-2 text-xs">
      <Button size="sm" variant="outline" disabled={page <= 1 || !current} onClick={() => setPage(value => value - 1)}>Trước</Button>
      <span>{page}/{Math.max(1, current?.pages ?? page)}</span>
      <Button size="sm" variant="outline" disabled={!current || page >= current.pages} onClick={() => setPage(value => value + 1)}>Sau</Button>
    </div>
  </div>;
}
