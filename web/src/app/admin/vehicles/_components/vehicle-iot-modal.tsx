'use client';
import { EnrollmentRecovery } from '@/components/admin/iot/enrollment-recovery';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { Vehicle } from '@/lib/types';
import { useVehicleIot } from './use-vehicle-iot';
import { VehicleIotHistory } from './vehicle-iot-history';
import './vehicle-iot-modal.css';

export function VehicleIotModal({ vehicle, onClose, onUpdated }: { vehicle: Vehicle; onClose: () => void; onUpdated: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [deviceId, setDeviceId] = useState('');
  const [reason, setReason] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const binding = useVehicleIot(vehicle.id, onUpdated);
  const current = binding.data?.current;
  const assignment = current?.assignment;
  const selected = binding.data?.devices.find(device => device.deviceId === deviceId);
  const blocked = binding.busy || binding.loading || !binding.data;
  const confirmed = current?.configurationStatus === 'CONFIRMED';
  const historyDevice = current?.deviceId || selected?.deviceId;

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); };
  }, []);

  return <dialog ref={dialog} className="vehicle-iot-modal" aria-labelledby="vehicle-iot-title"
    onCancel={event => { event.preventDefault(); if (!binding.busy) onClose(); }}
    onClick={event => { if (event.target === event.currentTarget && !binding.busy) onClose(); }}>
    <header className="vehicle-iot-header">
      <h2 id="vehicle-iot-title">Thiết bị IoT · {vehicle.licensePlate}</h2>
      <Button type="button" variant="ghost" size="sm" disabled={binding.busy} onClick={onClose}>Đóng</Button>
    </header>
    <form className="vehicle-iot-form" aria-busy={binding.busy || binding.loading} onSubmit={event => {
      event.preventDefault();
      if (blocked || assignment || !selected || !binding.data?.vehicle.isActive) return;
      const source = selected.assignment?.licensePlate;
      const confirmation = source
        ? `Chuyển ${selected.deviceId} từ xe ${source} sang xe ${vehicle.licensePlate}?`
        : `Gán ${selected.deviceId} cho xe ${vehicle.licensePlate}?`;
      if (window.confirm(confirmation)) void binding.change(selected, reason);
    }}>
      <div className="vehicle-iot-body">
        {binding.error && <p className="vehicle-iot-error" role="alert">{binding.error}</p>}
        {binding.notice && <p className="vehicle-iot-notice" role="status">{binding.notice}</p>}
        {binding.loading ? <p role="status">Đang tải thiết bị…</p> : binding.data && <>
          <dl className="vehicle-iot-current"><dt>Thiết bị hiện tại</dt><dd>{current?.deviceId || 'Chưa gắn'}</dd></dl>
          <Badge>{assignment ? (confirmed ? 'Đã nhận cấu hình' : 'Chờ thiết bị nhận cấu hình') : 'Chưa gắn thiết bị'}</Badge>
          {current?.lastConfigAckAt && <p className="vehicle-iot-muted">Xác nhận gần nhất: {new Date(current.lastConfigAckAt).toLocaleString('vi-VN')}</p>}
          {!binding.data.vehicle.isActive && <p className="vehicle-iot-notice">Xe đang ngừng hoạt động.</p>}
          {assignment ? <p className="vehicle-iot-muted">Tháo thiết bị hiện tại trước khi gán thiết bị khác.</p> : <label htmlFor="vehicle-iot-device">Chọn ESP32
            <Select id="vehicle-iot-device" value={deviceId} required disabled={blocked || !binding.data.vehicle.isActive} onChange={event => setDeviceId(event.target.value)}>
              <option value="">Chọn thiết bị đã đăng ký</option>
              {binding.data.devices.map(device => <option key={device.deviceId} value={device.deviceId} disabled={device.enrollmentBusy}>
                {device.name} · {device.deviceId}{device.enrollmentBusy?' · Đang đăng ký thẻ':device.assignment ? ` · Xe ${device.assignment.licensePlate}` : ' · Chưa gắn xe'}
              </option>)}
            </Select>
          </label>}
          <EnrollmentRecovery devices={binding.data.devices} onUpdated={binding.reload} />
          {!assignment && !binding.data.devices.length && <p className="vehicle-iot-muted">Chưa có thiết bị đã đăng ký.</p>}
          <label htmlFor="vehicle-iot-reason">Lý do (tùy chọn)<Input id="vehicle-iot-reason" value={reason} maxLength={500} disabled={blocked} onChange={event => setReason(event.target.value)} /></label>
          {historyDevice && <details onToggle={event => setHistoryOpen(event.currentTarget.open)}>
            <summary>Lịch sử thiết bị {historyDevice}</summary>
            {historyOpen && <VehicleIotHistory key={`${historyDevice}-${assignment?.id || 'unassigned'}`} deviceId={historyDevice} />}
          </details>}
        </>}
      </div>
      <footer className="vehicle-iot-footer">
        <Button type="button" variant="ghost" disabled={binding.busy || binding.loading} onClick={() => { void binding.reload(); }}>Tải lại</Button>
        {assignment ? <Button type="button" variant="danger" disabled={blocked} onClick={() => {
          if (window.confirm(`Tháo ${current.deviceId} khỏi xe ${vehicle.licensePlate}? Lịch sử quẹt và Wi-Fi được giữ nguyên.`)) void binding.change(null, reason);
        }}>{binding.busy ? 'Đang tháo…' : 'Tháo thiết bị'}</Button>
          : <Button type="submit" variant="primary" disabled={blocked || !selected || !binding.data?.vehicle.isActive}>{binding.busy ? 'Đang gán…' : selected?.assignment ? 'Chuyển về xe này' : 'Gán thiết bị'}</Button>}
      </footer>
    </form>
  </dialog>;
}
