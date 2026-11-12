import { Cpu, PlugZap, Unplug, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Esp32Controls } from './use-esp32';

export function UsbPanel({ controls: usb }: { controls: Esp32Controls }) {
  return <section className="iot-panel" aria-labelledby="iot-usb-title" aria-busy={Boolean(usb.busy)}>
    <div className="iot-panel-heading">
      <h2 id="iot-usb-title"><Cpu size={20} aria-hidden="true" /> ESP32 & firmware</h2>
      <Badge className="iot-badge" data-active={Boolean(usb.chip)}>{usb.chip ? 'Đã kết nối USB' : 'Chưa kết nối'}</Badge>
    </div>
    {usb.supported === false && <p className="iot-notice" role="status">Dùng Chrome hoặc Edge trên máy tính qua HTTPS hoặc localhost để kết nối USB.</p>}
    <div className="iot-usb-grid">
      <div className="iot-stack">
        <div className="iot-actions">
          <Button variant="outline" disabled={Boolean(usb.busy) || Boolean(usb.chip) || usb.supported !== true} onClick={() => void usb.connect()}>
            <PlugZap size={17} aria-hidden="true" /> Kết nối thiết bị
          </Button>
          <Button variant="ghost" disabled={Boolean(usb.busy) || !usb.chip} onClick={() => void usb.disconnect()}>
            <Unplug size={16} aria-hidden="true" /> Ngắt kết nối
          </Button>
        </div>
        <p className="iot-muted">ESP32 DevKit V1 · CP2102 · 115200 baud</p>
        <details className="iot-details"><summary>Cập nhật firmware</summary><div className="iot-actions">
          <Button variant="outline" disabled={Boolean(usb.busy) || Boolean(usb.chip) || usb.supported !== true} onClick={() => void usb.connect(true)}>Kết nối để nạp</Button>
          <Button variant="primary" disabled={Boolean(usb.busy) || usb.mode !== 'bootloader'} onClick={() => void usb.flash()}>
            <Upload size={17} aria-hidden="true" /> Nạp firmware
          </Button>
          <Button variant="outline" disabled={Boolean(usb.busy) || usb.mode !== 'bootloader'} onClick={() => void usb.openConsole()}>Chạy thiết bị</Button>
        </div><p className="iot-muted">Ngắt kết nối USB trước khi chọn chế độ nạp.</p></details>
        {usb.progress !== null && <div className="iot-progress">
          <label htmlFor="iot-flash-progress">Nạp firmware <strong>{usb.progress}%</strong></label>
          <progress id="iot-flash-progress" value={usb.progress} max={100} />
        </div>}
        <p className="iot-muted" role="status" aria-live="polite">{usb.busy || (usb.mode === 'console' ? (usb.provisioned ? 'Thiết bị đã sẵn sàng' : 'Thiết lập chưa hoàn tất') : 'Kết nối USB để bắt đầu')}</p>
      </div>
      <dl className="iot-chip-info">
        <div><dt>Chip</dt><dd>{usb.chip?.chipModel || '—'}</dd></div>
        <div><dt>MAC</dt><dd className="iot-mono">{usb.chip?.macAddress || '—'}</dd></div>
        <div><dt>Thiết bị</dt><dd className="iot-mono">{usb.chip?.deviceId || '—'}</dd></div>
        <div><dt>Firmware</dt><dd>{usb.firmwareVersion || 'Chưa đọc'}</dd></div>
      </dl>
    </div>
  </section>;
}
