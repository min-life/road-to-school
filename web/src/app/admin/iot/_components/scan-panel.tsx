import { useState } from 'react';
import { Radio, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PaginationControl } from '@/components/admin/common/pagination-control';
import { useIotFeed } from './use-iot-feed';

export function ScanPanel() {
  const feed = useIotFeed();
  const [filter, setFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  return <section className="iot-panel" aria-labelledby="iot-scans-title">
    <div className="iot-panel-heading">
      <h2 id="iot-scans-title"><Radio size={20} aria-hidden="true" /> Lịch sử quẹt thẻ</h2>
      <Badge className="iot-badge" data-active={feed.live === 'Trực tiếp'}>{feed.paused ? 'Tạm dừng cập nhật' : feed.live}</Badge>
    </div>
    <div className="iot-toolbar">
      <form className="iot-actions" onSubmit={e => { e.preventDefault(); feed.filter(filter.trim(), vehicleFilter); }}>
        <label className="iot-filter-label" htmlFor="iot-filter">Thiết bị<Input id="iot-filter" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Tất cả thiết bị" maxLength={128} /></label>
        <label className="iot-filter-label" htmlFor="iot-vehicle-filter">Xe<Select id="iot-vehicle-filter" value={vehicleFilter} onChange={event => setVehicleFilter(event.target.value)}><option value="">Tất cả xe</option>{feed.vehicles.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.licensePlate}{vehicle.isActive ? "" : " · Ngừng hoạt động"}</option>)}</Select></label>
        <Button variant="outline" type="submit" disabled={feed.loading}>Lọc</Button>
      </form>
      <div className="iot-actions">
        <label className="iot-checkbox"><input type="checkbox" checked={!feed.paused} onChange={e => feed.setPaused(!e.target.checked)} /> Tự cập nhật</label>
        <Button variant="ghost" disabled={feed.loading} onClick={feed.refresh} aria-label="Làm mới lịch sử quẹt thẻ"><RefreshCw size={17} aria-hidden="true" /></Button>
      </div>
    </div>
    {feed.error && <p className="iot-notice iot-error" role="alert">{feed.error}</p>}
    <div className="iot-table-scroll" aria-busy={feed.loading} tabIndex={0} role="region" aria-label="Bảng lịch sử quẹt thẻ">
      <Table minWidth={620}>
        <thead><tr><th>Thời gian quẹt</th><th>Xe (snapshot)</th><th>UID thẻ</th><th>Loại thẻ</th><th>Thiết bị</th></tr></thead>
        <tbody>{feed.data?.data.map(scan => <tr key={scan.scanId}>
          <td>{new Date(scan.scannedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td>
          <td>{scan.vehicleLicensePlateSnapshot || scan.vehicleId || "POC / Chưa xác định xe"}</td>
          <td className="iot-mono iot-uid">{scan.cardUid}</td><td>{scan.cardType || '—'}</td>
          <td className="iot-mono">{scan.deviceId}</td>
        </tr>)}
          {!feed.data?.data.length && <tr><td colSpan={5} className="iot-empty">{feed.loading ? 'Đang tải lịch sử…' : feed.error ? 'Chưa tải được dữ liệu' : 'Chưa có lượt quẹt thẻ'}</td></tr>}
        </tbody>
      </Table>
    </div>
    <PaginationControl page={feed.page} totalPages={Math.ceil((feed.data?.total || 0) / 20)} total={feed.data?.total || 0}
      limit={20} onPageChange={feed.setPage} onLimitChange={() => undefined} limitOptions={[20]} loading={feed.loading} />
    <details className="iot-details"><summary>Thiết bị đã đăng ký ({feed.devices.length}{feed.devices.length === 100 ? '+' : ''})</summary>
      <div className="iot-device-list">{feed.devices.map(device => <div key={device.deviceId}><span>{device.name}</span>
        <span className="iot-mono">{device.deviceId}</span><Badge className="iot-badge" data-active={device.status === 'ONLINE'}>{device.status === 'ONLINE' ? 'Có liên lạc gần đây' : 'Chưa có liên lạc gần đây'}</Badge>
      </div>)}{!feed.devices.length && <p className="iot-muted">Chưa có thiết bị để hiển thị</p>}</div>
    </details>
  </section>;
}
