'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ApiError } from '@/lib/api-client';
import { iotApi } from '@/lib/iot-api';
import { Esp32Session } from './esp32-session';
import { parseWifiNetworks, validateDeviceApiUrl } from './iot-protocol';
import type { UsbChip, WifiNetwork } from './iot-protocol';

const subscribeBrowserSupport = () => () => undefined;

export function iotError(error: unknown): string {
  if (error instanceof ApiError && error.statusCode === 404) return 'IoT chưa bật trên máy chủ hoặc thiết bị chưa đăng ký.';
  return error instanceof Error ? error.message.slice(0, 240) : 'Thao tác chưa hoàn tất. Vui lòng thử lại.';
}

export function useEsp32() {
  const session = useRef<Esp32Session | null>(null);
  const active = useRef(true);
  const locked = useRef(false);
  const [chip, setChip] = useState<UsbChip | null>(null);
  const [firmwareVersion, setFirmwareVersion] = useState('');
  const [mode, setMode] = useState<'idle' | 'bootloader' | 'console'>('idle');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [provisioned, setProvisioned] = useState(false);
  const [wifiStatus, setWifiStatus] = useState('Chưa cấu hình');
  const [backendUrl, setBackendUrl] = useState('');
  const [wifiScanSupported, setWifiScanSupported] = useState(false);
  const [vehicleAssignmentSupported, setVehicleAssignmentSupported] = useState(false);
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'ready' | 'error'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const supported = useSyncExternalStore(subscribeBrowserSupport,
    () => window.isSecureContext && 'serial' in navigator, () => null);
  const log = (message: string) => {
    if (active.current) setLogs(old => [...old, `${new Date().toLocaleTimeString('vi-VN')} · ${message}`].slice(-30));
  };

  const disconnect = useCallback(async () => {
    const current = session.current;
    session.current = null;
    if (active.current) {
      setChip(null); setFirmwareVersion(''); setMode('idle'); setProvisioned(false);
      setWifiStatus('Chưa cấu hình'); setProgress(null);
      setBackendUrl(''); setWifiScanSupported(false); setNetworks([]); setScanStatus('idle');
      setVehicleAssignmentSupported(false);
    }
    await current?.disconnect();
  }, []);

  useEffect(() => {
    active.current = true;
    const lost = (event: Event) => {
      if (event.target === session.current?.port) {
        setError('ESP32 đã ngắt kết nối USB.');
        void disconnect();
      }
    };
    const warn = (event: BeforeUnloadEvent) => {
      if (locked.current) { event.preventDefault(); event.returnValue = ''; }
    };
    navigator.serial?.addEventListener('disconnect', lost);
    window.addEventListener('beforeunload', warn);
    return () => {
      active.current = false;
      navigator.serial?.removeEventListener('disconnect', lost);
      window.removeEventListener('beforeunload', warn);
      void disconnect();
    };
  }, [disconnect]);

  async function run(label: string, action: () => Promise<void>): Promise<boolean> {
    if (locked.current) return false;
    locked.current = true; setBusy(label); setError('');
    try { await action(); return true; }
    catch (failure) {
      if (active.current && !(failure instanceof DOMException && failure.name === 'NotFoundError')) setError(iotError(failure));
      return false;
    } finally {
      locked.current = false;
      if (active.current) setBusy('');
    }
  }

  async function scanNetworks(current: Esp32Session) {
    setNetworks([]); setScanStatus('scanning');
    try {
      const reply = await current.command('SCAN_WIFI');
      const found = parseWifiNetworks(reply.data);
      if (active.current && session.current === current) { setNetworks(found); setScanStatus('ready'); }
    } catch (failure) {
      if (active.current && session.current === current) setScanStatus('error');
      throw failure;
    }
  }

  async function provisionDevice(current: Esp32Session, info: UsbChip, version: string, name = '', override = '') {
    const customUrl = override ? validateDeviceApiUrl(override) : '';
    setProvisioned(false);
    const config = await iotApi.provision({ ...info, name: name.trim() || info.deviceId, firmwareVersion: version });
    if (!active.current || session.current !== current) return;
    const url = customUrl || validateDeviceApiUrl(config.backendUrl);
    if (config.device.deviceId !== info.deviceId || !/^[0-9a-f]{64}$/.test(config.deviceKey)) {
      throw new Error('Máy chủ trả cấu hình thiết bị không hợp lệ.');
    }
    const reply = await current.command('CONFIG_DEVICE', { deviceId: info.deviceId, backendUrl: url, deviceKey: config.deviceKey });
    if (reply.data?.deviceId !== info.deviceId) throw new Error('ESP32 chưa xác nhận đúng định danh thiết bị.');
    if (active.current && session.current === current) {
      setProvisioned(true); setBackendUrl(url); log('ESP32 đã nhận cấu hình tự động.');
    }
  }

  async function initializeConsole(current: Esp32Session, info: UsbChip) {
    let firmware;
    try {
      firmware = await current.openConsole(() => { if (session.current === current) void disconnect(); });
      if (firmware.deviceId !== info.deviceId) throw new Error('Định danh firmware không khớp ESP32 đang kết nối.');
    } catch (failure) { await disconnect(); throw failure; }
    if (!active.current || session.current !== current) return;
    setFirmwareVersion(firmware.firmwareVersion); setMode('console');
    setWifiScanSupported(firmware.wifiScan); setWifiStatus('Chưa kiểm tra Wi-Fi');
    setVehicleAssignmentSupported(firmware.vehicleAssignment);
    log('Firmware đã phản hồi.');
    await provisionDevice(current, info, firmware.firmwareVersion);
    if (firmware.wifiScan && active.current && session.current === current) await scanNetworks(current);
  }

  async function connect(forFlashing = false) {
    return run('Đang kết nối', async () => {
      const current = new Esp32Session(); session.current = current;
      let info: UsbChip;
      try { info = await current.connect(); }
      catch (failure) { await disconnect(); throw failure; }
      if (!active.current || session.current !== current) return;
      setChip(info); setMode('bootloader'); setProgress(null); log('Đã nhận diện ESP32.');
      if (!forFlashing) await initializeConsole(current, info);
    });
  }

  async function openConsole() {
    return run('Đang mở Serial', async () => {
      const current = session.current;
      if (!current || !chip) return;
      await initializeConsole(current, chip);
    });
  }

  async function flash() {
    if (!window.confirm('Nạp firmware lên ESP32 đang kết nối? Cấu hình trên thiết bị có thể bị thay thế.')) return;
    return run('Đang nạp firmware', async () => {
      const current = session.current;
      if (!current) return;
      setProgress(0);
      const binary = await iotApi.firmware();
      if (!active.current || session.current !== current) return;
      await current.flash(new Uint8Array(binary), value => { if (active.current) setProgress(value); });
      log('Đã nạp và kiểm tra MD5. Bấm Chạy thiết bị để hoàn tất.');
    });
  }

  async function provision(name = '', apiUrl = '') {
    return run('Đang cấp cấu hình', async () => {
      const current = session.current;
      if (!chip || !firmwareVersion || !current) throw new Error('Mở Serial để đọc phiên bản firmware trước.');
      await provisionDevice(current, chip, firmwareVersion, name, apiUrl);
    });
  }

  async function scanWifi() {
    return run('Đang tìm Wi-Fi', async () => {
      if (!session.current || mode !== 'console') throw new Error('Kết nối thiết bị trước.');
      if (!wifiScanSupported) throw new Error('Nạp firmware mới để quét Wi-Fi.');
      await scanNetworks(session.current);
    });
  }

  async function configureWifi(ssid: string, password: string, save: boolean) {
    return run('Đang kết nối Wi-Fi', async () => {
      if (!chip || !provisioned || !session.current) throw new Error('Cấp cấu hình thiết bị trước.');
      if (new TextEncoder().encode(ssid).length > 32 || !ssid || ssid.includes('\0')) throw new Error('SSID phải có 1–32 byte UTF-8.');
      if (!/^(?:[\x20-\x7E]{8,63}|[0-9a-fA-F]{64})$/.test(password)) throw new Error('Mật khẩu cần 8–63 ký tự ASCII hoặc 64 hex.');
      const current = session.current;
      setWifiStatus('Đang kết nối');
      try {
        if (save) await iotApi.saveWifi(chip.deviceId, ssid, password);
        if (!active.current || session.current !== current) return;
        const reply = await current.command('SET_WIFI', { ssid, password });
        if (reply.data?.connected !== true || reply.data.ssid !== ssid || typeof reply.data.ip !== 'string'
          || !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(reply.data.ip)
          || reply.data.ip.split('.').some(part => Number(part) > 255)) throw new Error('ESP32 chưa xác nhận kết nối Wi-Fi.');
        if (active.current) { setWifiStatus(`Đã kết nối · ${reply.data.ip.slice(0, 45)}`); log('ESP32 đã kết nối Wi-Fi.'); }
      } catch (failure) { if (active.current) setWifiStatus('Chưa xác nhận kết nối'); throw failure; }
    });
  }

  return { chip, mode, firmwareVersion, busy, error, progress, provisioned, wifiStatus, logs, supported,
    backendUrl, wifiScanSupported, vehicleAssignmentSupported, networks, scanStatus,
    connect, disconnect, openConsole, flash, provision, scanWifi, configureWifi, clearLogs: () => setLogs([]) };
}

export type Esp32Controls = ReturnType<typeof useEsp32>;
