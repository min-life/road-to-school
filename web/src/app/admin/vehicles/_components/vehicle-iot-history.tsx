'use client';

import { useEffect, useState } from 'react';
import { iotApi } from '@/lib/iot-api';
import type { IotAssignment, IotPage } from '@/lib/iot-api';
import { Table } from '@/components/ui/table';
import { PaginationControl } from '@/components/admin/common/pagination-control';

export function VehicleIotHistory({ deviceId }: { deviceId: string }) {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<IotPage<IotAssignment> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await iotApi.history(deviceId, page);
        if (active) { setRows(data); setError(''); }
      } catch { if (active) { setRows(null); setError('Không thể tải lịch sử thiết bị.'); } }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [deviceId, page]);
  return <div aria-busy={loading}>
    {error && <p className="vehicle-iot-error" role="alert">{error}</p>}
    <div className="vehicle-iot-history-scroll"><Table minWidth={480}>
      <thead><tr><th>Xe</th><th>Gán lúc</th><th>Tháo lúc</th></tr></thead>
      <tbody>{rows?.data.map(row => <tr key={row.id}><td>{row.licensePlate}</td><td>{new Date(row.assignedAt).toLocaleString('vi-VN')}</td><td>{row.releasedAt ? new Date(row.releasedAt).toLocaleString('vi-VN') : 'Đang gán'}</td></tr>)}
        {!rows?.data.length && <tr><td colSpan={3}>{loading ? 'Đang tải…' : error ? '—' : 'Chưa có lịch sử gán xe'}</td></tr>}
      </tbody>
    </Table></div>
    <PaginationControl page={page} totalPages={Math.ceil((rows?.total || 0) / 10)} total={rows?.total || 0} limit={10} limitOptions={[10]} onPageChange={value => { setLoading(true); setRows(null); setPage(value); }} onLimitChange={() => undefined} loading={loading} />
  </div>;
}
