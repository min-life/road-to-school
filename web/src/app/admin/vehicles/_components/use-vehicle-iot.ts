'use client';

import { useEffect, useRef, useState } from 'react';
import { iotApi } from '@/lib/iot-api';
import type { IotAssignmentState, IotDevice } from '@/lib/iot-api';
import type { Vehicle } from '@/lib/types';

interface VehicleIotData { vehicle: Vehicle; devices: IotDevice[]; current: IotAssignmentState | null }
const message = (error: unknown) => error instanceof Error ? error.message.slice(0, 240) : 'Không thể tải thiết bị. Thử lại.';

async function registeredDevices() {
  const devices: IotDevice[] = [];
  for (let page = 1; page <= 100; page++) {
    const rows = await iotApi.devices(page);
    devices.push(...rows.data);
    if (page * rows.limit >= rows.total) return devices;
  }
  throw new Error('Danh sách thiết bị quá lớn. Liên hệ quản trị máy chủ.');
}

export function useVehicleIot(vehicleId: string, onUpdated: () => void) {
  const [data, setData] = useState<VehicleIotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const mounted = useRef(false);
  const locked = useRef(false);
  const sequence = useRef(0);

  useEffect(() => {
    let active = true;
    mounted.current = true;
    async function load() {
    const version = ++sequence.current;
    try {
      const [vehicle, devices] = await Promise.all([iotApi.vehicle(vehicleId), registeredDevices()]);
      const current = vehicle.iotDevice ? await iotApi.assignment(vehicle.iotDevice.deviceId) : null;
      if (vehicle.iotDevice && (current?.assignment?.id !== vehicle.iotDevice.assignmentId || current.assignment.vehicleId !== vehicleId)) {
        throw new Error('Thiết bị của xe vừa thay đổi. Bấm Tải lại.');
      }
      if (active && version === sequence.current) {
        setData({ vehicle, devices, current }); setLoadError('');
      }
    } catch (error) {
      if (active && version === sequence.current) { setLoadError(message(error)); setData(null); }
    } finally { if (active && version === sequence.current) setLoading(false); }
    }
    void load();
    const timer = setInterval(() => { if (!locked.current && document.visibilityState === 'visible') void load(); }, 10000);
    return () => { active = false; mounted.current = false; clearInterval(timer); };
  }, [vehicleId, revision]);

  function reload() { sequence.current++; setLoading(true); setData(null); setRevision(value => value + 1); }

  async function change(device: IotDevice | null, reason: string) {
    if (locked.current || !data) return;
    if (device && (data.current?.assignment || !data.vehicle.isActive)) return;
    if (!device && !data.current?.assignment) return;
    locked.current = true; sequence.current++; setBusy(true); setActionError(''); setNotice('');
    try {
      if (device) await iotApi.assign(device.deviceId, vehicleId, device.assignment?.id ?? null, reason.trim());
      else await iotApi.release(data.current!.deviceId, data.current!.assignment!.id, reason.trim());
      if (mounted.current) {
        setNotice(device ? 'Đã gán thiết bị.' : 'Đã tháo thiết bị.');
        onUpdated();
      }
    } catch (error) { if (mounted.current) setActionError(message(error)); }
    finally {
      locked.current = false;
      if (mounted.current) { setBusy(false); reload(); }
    }
  }
  return { data, loading, busy, error: actionError || loadError, notice, reload, change };
}
