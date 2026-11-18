'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '@/lib/api-client';
import { authStorage } from '@/lib/auth-storage';
import { iotApi, iotSocketOrigin } from '@/lib/iot-api';
import type { IotDevice, IotPage, IotScan } from '@/lib/iot-api';
import type { Vehicle } from '@/lib/types';
import { iotError } from './use-esp32';

export interface UseIotFeedOptions {
  initialDeviceId?: string;
}

export function useIotFeed(options?: UseIotFeedOptions) {
  const [page, setPage] = useState(1);
  const [deviceId, setDeviceId] = useState(options?.initialDeviceId || '');
  const [vehicleId, setVehicleId] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<IotPage<IotScan> | null>(null);
  const [devices, setDevices] = useState<IotDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [live, setLive] = useState('Đang kết nối');
  const [paused, setPaused] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const sequenceRef = useRef(0);

  // Update initialDeviceId if changed from outside (e.g. when clicking "Xem lượt quét" from devices tab)
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (options?.initialDeviceId !== undefined) {
      setDeviceId(options.initialDeviceId);
      setPage(1);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [options?.initialDeviceId]);

  // Load supporting options (devices and vehicles) separately so failures don't wipe scans
  useEffect(() => {
    let active = true;

    async function loadOptions() {
      try {
        const [devicesRes, vehiclesRes] = await Promise.allSettled([
          iotApi.devices(1),
          iotApi.vehicles(),
        ]);

        if (!active) return;

        if (devicesRes.status === 'fulfilled') {
          setDevices(devicesRes.value.data);
        }

        if (vehiclesRes.status === 'fulfilled') {
          setVehicles(vehiclesRes.value);
        }
      } catch {
        // Option load failure is isolated; do not clear main scans data
      }
    }

    void loadOptions();

    return () => {
      active = false;
    };
  }, []);

  // Main load function for paginated scans
  const loadScans = useCallback(async () => {
    const id = ++sequenceRef.current;
    try {
      setLoading(true);
      setError('');
      const scans = await iotApi.scans(page, deviceId, vehicleId);
      if (id !== sequenceRef.current) return;
      setData(scans);
      setLastUpdatedAt(new Date());
    } catch (failure) {
      if (id === sequenceRef.current) {
        setError(iotError(failure));
      }
    } finally {
      if (id === sequenceRef.current) {
        setLoading(false);
      }
    }
  }, [page, deviceId, vehicleId]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    void loadScans();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [loadScans, revision]);

  // Realtime Socket.IO and polling
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let reconnecting = false;
    let attemptedToken: string | null | undefined;

    const socket = io(`${iotSocketOrigin()}/iot`, {
      autoConnect: false,
      transports: ['websocket'],
      reconnectionDelayMax: 15000,
      auth: (callback) => callback({ token: authStorage.getAccessToken() }),
    });
    socketRef.current = socket;

    function refreshSoon() {
      if (paused || timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        void loadScans();
      }, 400);
    }

    async function recoverAuth() {
      if (!active || reconnecting || attemptedToken === authStorage.getAccessToken()) return;
      reconnecting = true;
      attemptedToken = authStorage.getAccessToken();
      try {
        await apiClient.request('/iot/devices?limit=1');
        if (active) socket.connect();
      } catch {
        if (active) setLive('Chưa kết nối');
      } finally {
        reconnecting = false;
      }
    }

    socket.on('connect', () => {
      if (active) {
        setLive(paused ? 'Tạm dừng cập nhật' : 'Đang nhận sự kiện');
        attemptedToken = undefined;
        refreshSoon();
      }
    });

    socket.on('disconnect', (reason) => {
      if (active) setLive(paused ? 'Tạm dừng cập nhật' : 'Đang nối lại');
      if (reason === 'io server disconnect') void recoverAuth();
    });

    socket.on('connect_error', () => {
      if (active) setLive(paused ? 'Tạm dừng cập nhật' : 'Tự cập nhật định kỳ');
      void recoverAuth();
    });

    socket.on('new_rfid_scan', refreshSoon);

    socket.connect();

    // 15s Polling when page is visible and not paused
    const poll = setInterval(() => {
      if (!paused && document.visibilityState === 'visible') {
        void loadScans();
      }
    }, 15000);

    const onFocus = () => {
      if (!paused) void loadScans();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      active = false;
      clearInterval(poll);
      clearTimeout(timer);
      socket.removeAllListeners();
      socket.disconnect();
      window.removeEventListener('focus', onFocus);
      socketRef.current = null;
    };
  }, [loadScans, paused]);

  return {
    data,
    devices,
    vehicles,
    vehicleId,
    loading,
    error,
    live: paused ? 'Tạm dừng cập nhật' : live,
    page,
    deviceId,
    paused,
    lastUpdatedAt,
    setPage: (next: number) => {
      setPage(next);
    },
    filter: (id: string, vehicle: string) => {
      setPage(1);
      setDeviceId(id);
      setVehicleId(vehicle);
    },
    refresh: () => {
      setRevision((old) => old + 1);
    },
    setPaused,
  };
}
