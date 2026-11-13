'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { useEsp32 } from './use-esp32';
import { UsbPanel } from './usb-panel';
import { WifiPanel } from './wifi-panel';
import { ScanPanel } from './scan-panel';
import './iot.css';

export function IotDashboard() {
  const usb = useEsp32();
  return <div className="iot-page">
    <PageHeader title="Thiết bị IoT" />
    {usb.error && <p className="iot-notice iot-error" role="alert">{usb.error}</p>}
    <UsbPanel controls={usb} />
    <WifiPanel key={usb.chip?.deviceId || 'disconnected'} controls={usb} />
    <ScanPanel />
    <details className="iot-panel iot-details">
      <summary>Nhật ký kết nối USB</summary>
      <div className="iot-log" role="log" aria-label="Nhật ký kết nối">{usb.logs.map((line, index) => <p key={`${index}-${line}`}>{line}</p>)}
        {!usb.logs.length && <p className="iot-muted">Chưa có hoạt động USB</p>}
      </div>
      <Button variant="ghost" size="sm" onClick={usb.clearLogs} disabled={!usb.logs.length}>Xóa nhật ký trên màn hình</Button>
    </details>
  </div>;
}
