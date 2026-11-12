'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { apiClient } from '@/lib/api-client';
import { authStorage } from '@/lib/auth-storage';
import { iotApi, iotSocketOrigin } from '@/lib/iot-api';
import type { IotDevice, IotPage, IotScan } from '@/lib/iot-api';
import type { Vehicle } from '@/lib/types';
import { iotError } from './use-esp32';

export function useIotFeed() {
  const [page, setPage] = useState(1);
  const [deviceId, setDeviceId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<IotPage<IotScan> | null>(null);
  const [devices, setDevices] = useState<IotDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [live, setLive] = useState('Đang kết nối');
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let active = true;
    let sequence = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let reconnecting = false;
    let attemptedToken: string | null | undefined;
    const socket = io(`${iotSocketOrigin()}/iot`, {
      autoConnect: false, transports: ['websocket'], reconnectionDelayMax: 15000,
      auth: callback => callback({ token: authStorage.getAccessToken() }),
    });
    async function load() {
      const id = ++sequence;
      try {
        const [scans, registered, fleet] = await Promise.all([iotApi.scans(page, deviceId, vehicleId), iotApi.devices(), iotApi.vehicles()]);
        if (!active || id !== sequence) return;
        setData(scans); setDevices(registered.data); setVehicles(fleet); setError('');
        if (!socket.connected && !reconnecting) socket.connect();
      } catch (failure) {
        if (active && id === sequence) {
          setError(iotError(failure)); setData(null); setDevices([]);
          if (!socket.connected) setLive('Chưa kết nối');
        }
      } finally { if (active && id === sequence) setLoading(false); }
    }
    function refreshSoon() {
      if (paused || timer) return;
      timer = setTimeout(() => { timer = undefined; void load(); }, 400);
    }
    async function recoverAuth() {
      if (!active || reconnecting || attemptedToken === authStorage.getAccessToken()) return;
      reconnecting = true; attemptedToken = authStorage.getAccessToken();
      try {
        // Reuse the existing refresh flow; never put JWT in the WebSocket URL.
        await apiClient.request('/iot/devices?limit=1');
        if (active) socket.connect();
      } catch { if (active) setLive('Chưa kết nối'); }
      finally { reconnecting = false; }
    }
    socket.on('connect', () => { if (active) { setLive('Trực tiếp'); attemptedToken = undefined; refreshSoon(); } });
    socket.on('disconnect', reason => {
      if (active) setLive('Đang nối lại');
      if (reason === 'io server disconnect') void recoverAuth();
    });
    socket.on('connect_error', () => { if (active) setLive('Chưa kết nối'); void recoverAuth(); });
    // Ignore raw push payloads: reload the authoritative paginated history, dedup by scanId at source.
    socket.on('new_rfid_scan', refreshSoon);
    void load();
    const poll = setInterval(() => { if (!paused && document.visibilityState === 'visible') void load(); }, 15000);
    const focus = () => { if (!paused) void load(); };
    window.addEventListener('focus', focus);
    return () => {
      active = false; sequence++; clearInterval(poll); clearTimeout(timer);
      socket.removeAllListeners(); socket.disconnect(); window.removeEventListener('focus', focus);
    };
  }, [page, deviceId, vehicleId, revision, paused]);

  return { data, devices, vehicles, vehicleId, loading, error, live, page, deviceId, paused,
    setPage: (next: number) => { setLoading(true); setPage(next); },
    filter: (id: string, vehicle: string) => { setLoading(true); setPage(1); setDeviceId(id); setVehicleId(vehicle); },
    refresh: () => { setLoading(true); setRevision(old => old + 1); }, setPaused };
}
