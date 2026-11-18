'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  PlugZap,
  Unplug,
  Wifi,
  RefreshCw,
  Eye,
  EyeOff,
  X,
  Upload,
  Cpu,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { SpinnerIcon } from '@/components/icons';
import type { Esp32Controls } from './use-esp32';

interface UsbSetupPanelProps {
  isOpen: boolean;
  onClose: () => void;
  controls: Esp32Controls;
  onOpenFirmwareDialog: () => void;
}

export function UsbSetupPanel({
  isOpen,
  onClose,
  controls: usb,
  onOpenFirmwareDialog,
}: UsbSetupPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Local Wi-Fi form state
  const [apiUrl, setApiUrl] = useState('');
  const [ssid, setSsid] = useState('');
  const [manual, setManual] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saveWifiOnServer, setSaveWifiOnServer] = useState(false);

  // Close with Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !usb.busy) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, usb.busy, onClose]);

  if (!isOpen) return null;

  const disabled = Boolean(usb.busy);
  const selectedNetwork = usb.networks.find((n) => n.ssid === ssid);
  const canConnectWifi =
    usb.mode === 'console' &&
    usb.provisioned &&
    Boolean(ssid) &&
    (manual || selectedNetwork?.supported === true);

  const scanMessage =
    usb.scanStatus === 'scanning'
      ? 'Đang tìm mạng Wi-Fi…'
      : usb.scanStatus === 'error'
      ? 'Quét chưa thành công. Bấm Quét lại.'
      : usb.scanStatus === 'ready'
      ? usb.networks.length
        ? `${usb.networks.length} mạng khả dụng (2.4 GHz)`
        : 'Không tìm thấy mạng phù hợp. Bấm quét lại hoặc nhập tên mạng.'
      : 'Cần kết nối thiết bị qua USB để quét Wi-Fi.';

  const handleWifiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canConnectWifi) return;
    const ok = await usb.configureWifi(ssid, password, saveWifiOnServer);
    if (ok) {
      setPassword('');
      setShowPassword(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="iot-usb-setup-title"
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !usb.busy) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className="w-full max-w-[680px] bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden"
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <PlugZap className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="iot-usb-setup-title" className="text-base font-bold text-slate-800">
                Thiết lập thiết bị qua USB
              </h2>
              <p className="text-xs text-slate-500">
                ESP32 đang cắm USB vào máy tính này
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={Boolean(usb.busy)}
            onClick={onClose}
            aria-label="Đóng bảng thiết lập"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Global Error Banner */}
        {usb.error && (
          <div className="px-6 py-3 bg-rose-50 border-b border-rose-200 text-xs text-rose-800 flex items-center justify-between" role="alert">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
              <span>{usb.error}</span>
            </div>
            <button
              type="button"
              onClick={usb.clearError}
              className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold underline"
            >
              Bỏ qua
            </button>
          </div>
        )}

        {/* Panel Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-3 gap-2">
            <div className={`p-2.5 rounded-xl border text-center transition-colors ${
              usb.chip ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <div className="text-[11px] font-bold uppercase tracking-wider">Bước 1</div>
              <div className="text-xs font-semibold mt-0.5">USB & Thiết bị</div>
            </div>
            <div className={`p-2.5 rounded-xl border text-center transition-colors ${
              usb.provisioned ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <div className="text-[11px] font-bold uppercase tracking-wider">Bước 2</div>
              <div className="text-xs font-semibold mt-0.5">Cấp cấu hình</div>
            </div>
            <div className={`p-2.5 rounded-xl border text-center transition-colors ${
              usb.wifiStatus.includes('Đã kết nối') ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <div className="text-[11px] font-bold uppercase tracking-wider">Bước 3</div>
              <div className="text-xs font-semibold mt-0.5">Kết nối Wi-Fi</div>
            </div>
          </div>

          {/* BƯỚC 1: USB */}
          <div className="p-4 border border-slate-200 rounded-2xl bg-white shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-slate-600" aria-hidden="true" />
                <h3 className="font-bold text-slate-800 text-sm">Kết nối USB & Nhận diện chip</h3>
              </div>
              <Badge
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  usb.chip
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {usb.chip ? 'USB đã kết nối' : 'Chưa kết nối'}
              </Badge>
            </div>

            {usb.supported === false && (
              <p className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                Trình duyệt chưa hỗ trợ Web Serial. Hãy sử dụng Chrome hoặc Edge trên máy tính qua giao thức HTTPS hoặc localhost.
              </p>
            )}

            {!usb.chip ? (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-slate-600">
                  Cắm thiết bị ESP32 qua cáp USB dữ liệu vào máy tính, sau đó bấm nút bên dưới để chọn cổng COM:
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="primary"
                    disabled={disabled || usb.supported !== true}
                    onClick={() => void usb.connect()}
                    className="inline-flex items-center gap-2 font-bold px-4 py-2"
                  >
                    {usb.busy === 'Đang kết nối' ? (
                      <SpinnerIcon className="w-4 h-4 animate-spin" />
                    ) : (
                      <PlugZap className="w-4 h-4" aria-hidden="true" />
                    )}
                    <span>Kết nối USB</span>
                  </Button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Hỗ trợ chip ESP32 DevKit V1 · CP2102 · Baud rate 115200
                </p>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Mã thiết bị:</span>
                    <strong className="font-mono text-slate-800">{usb.chip.deviceId}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Chip / Model:</span>
                    <span className="text-slate-700 font-medium">{usb.chip.chipModel || 'ESP32'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Địa chỉ MAC:</span>
                    <span className="font-mono text-slate-700">{usb.chip.macAddress}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Firmware:</span>
                    <span className="font-medium text-slate-700">
                      {usb.firmwareVersion || 'Chưa đọc được INFO'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <details className="text-xs text-slate-500">
                    <summary className="cursor-pointer hover:text-slate-800 font-semibold select-none">
                      Thông tin kỹ thuật chi tiết
                    </summary>
                    <div className="mt-2 p-2 bg-slate-100 rounded-lg font-mono text-[11px] space-y-1 text-slate-600">
                      <p>Baud rate: 115200</p>
                      <p>Mode: {usb.mode}</p>
                      <p>API URL: {usb.backendUrl || 'Mặc định từ máy chủ'}</p>
                    </div>
                  </details>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    onClick={() => void usb.disconnect()}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    <Unplug className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Ngắt USB</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* BƯỚC 2: CẤP CẤU HÌNH */}
          <div className="p-4 border border-slate-200 rounded-2xl bg-white shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Cấp cấu hình tự động (Provisioning)</h3>
              <Badge
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  usb.provisioned
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {usb.provisioned ? 'Đã nhận cấu hình' : 'Chưa cấu hình'}
              </Badge>
            </div>

            {usb.mode === 'console' && !usb.provisioned && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
                <p className="text-amber-800 font-medium">
                  Thiết lập tự động chưa hoàn tất. Có thể máy chủ chưa sẵn sàng hoặc thiết bị chưa nhận ACK.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => void usb.provision()}
                  className="inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Thiết lập lại</span>
                </Button>
              </div>
            )}

            {usb.provisioned && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                <span>Thiết bị đã được máy chủ cấp cấu hình và xác nhận ACK thành công.</span>
              </div>
            )}

            {!usb.chip && (
              <p className="text-xs text-slate-400">
                Cần hoàn tất Bước 1 (Kết nối USB) để thiết bị tự động nhận cấu hình từ máy chủ.
              </p>
            )}
          </div>

          {/* BƯỚC 3: WI-FI */}
          <div className="p-4 border border-slate-200 rounded-2xl bg-white shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-slate-600" aria-hidden="true" />
                <h3 className="font-bold text-slate-800 text-sm">Kết nối Wi-Fi</h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || usb.mode !== 'console' || !usb.wifiScanSupported}
                onClick={() => void usb.scanWifi()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${usb.scanStatus === 'scanning' ? 'animate-spin' : ''}`} aria-hidden="true" />
                <span>Quét lại</span>
              </Button>
            </div>

            {usb.mode === 'console' && !usb.wifiScanSupported && (
              <p className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                Firmware hiện tại chưa hỗ trợ quét mạng tự động. Bạn vẫn có thể bấm “Nhập tên mạng” để kết nối thủ công, hoặc cập nhật firmware mới.
              </p>
            )}

            <form onSubmit={handleWifiSubmit} className="space-y-4">
              <div className="space-y-3">
                {/* Chọn hoặc nhập SSID */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="iot-network-select" className="text-xs font-semibold text-slate-700">
                      Mạng Wi-Fi (2.4 GHz)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setManual((prev) => !prev);
                        setSsid('');
                        setPassword('');
                      }}
                      className="text-xs font-semibold text-amber-700 hover:text-amber-800 underline"
                    >
                      {manual ? 'Chọn từ danh sách quét' : 'Nhập tên mạng thủ công'}
                    </button>
                  </div>

                  {manual ? (
                    <Input
                      id="iot-manual-ssid"
                      type="text"
                      placeholder="Nhập chính xác SSID Wi-Fi"
                      value={ssid}
                      maxLength={32}
                      disabled={disabled || usb.mode !== 'console'}
                      onChange={(e) => setSsid(e.target.value)}
                      className="w-full text-xs"
                      required
                    />
                  ) : (
                    <Select
                      id="iot-network-select"
                      value={ssid ? `ssid:${ssid}` : ''}
                      disabled={disabled || usb.mode !== 'console'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.startsWith('ssid:')) {
                          setSsid(val.slice(5));
                        } else {
                          setSsid('');
                        }
                        setPassword('');
                      }}
                      className="w-full text-xs"
                    >
                      <option value="">-- Chọn mạng Wi-Fi --</option>
                      {usb.networks.map((net) => (
                        <option
                          key={net.ssid}
                          value={`ssid:${net.ssid}`}
                          disabled={!net.supported}
                        >
                          {net.ssid} · {net.rssi >= -55 ? 'Tín hiệu mạnh' : net.rssi >= -70 ? 'Tín hiệu vừa' : 'Tín hiệu yếu'}
                          {!net.supported
                            ? net.secure
                              ? ' (Bảo mật chưa hỗ trợ)'
                              : ' (Mạng mở không hỗ trợ)'
                            : ''}
                        </option>
                      ))}
                    </Select>
                  )}
                  <p className="text-[11px] text-slate-400">{scanMessage}</p>
                </div>

                {/* Mật khẩu */}
                <div className="space-y-1.5">
                  <label htmlFor="iot-wifi-password" className="text-xs font-semibold text-slate-700">
                    Mật khẩu Wi-Fi
                  </label>
                  <div className="relative">
                    <Input
                      id="iot-wifi-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Nhập mật khẩu (8–63 ký tự)"
                      value={password}
                      minLength={8}
                      maxLength={64}
                      disabled={disabled || !canConnectWifi}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full text-xs pr-10"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      disabled={disabled || !canConnectWifi}
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 disabled:opacity-40"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action button & Status */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={disabled || !canConnectWifi || !password}
                  className="font-bold px-4 py-2 text-xs"
                >
                  {usb.busy === 'Đang kết nối Wi-Fi' ? (
                    <SpinnerIcon className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wifi className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>Kết nối Wi-Fi</span>
                </Button>

                <div className="text-xs font-medium text-slate-600">
                  {usb.wifiStatus}
                </div>
              </div>
            </form>
          </div>

          {/* CÀI ĐẶT NÂNG CAO */}
          <details className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 text-xs text-slate-600 space-y-3">
            <summary className="font-bold text-slate-800 cursor-pointer select-none">
              Cài đặt nâng cao & Ghi đè địa chỉ API
            </summary>
            <div className="pt-2 space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="iot-custom-api-url" className="font-semibold text-slate-700">
                  Địa chỉ API máy chủ (tùy chọn ghi đè)
                </label>
                <Input
                  id="iot-custom-api-url"
                  type="url"
                  placeholder={usb.backendUrl || 'Mặc định do máy chủ cấp'}
                  value={apiUrl}
                  maxLength={512}
                  disabled={disabled || usb.mode !== 'console'}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="w-full text-xs"
                />
                <p className="text-[11px] text-slate-400">
                  Chỉ điền khi máy chủ đổi địa chỉ IP hoặc cần trỏ sang môi trường khác.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled || usb.mode !== 'console' || !apiUrl}
                  onClick={async () => {
                    const ok = await usb.provision('', apiUrl);
                    if (ok) setApiUrl('');
                  }}
                  className="text-xs font-semibold"
                >
                  Áp dụng cấu hình ghi đè
                </Button>

                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={saveWifiOnServer}
                    onChange={(e) => setSaveWifiOnServer(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                  />
                  <span>Lưu Wi-Fi mã hóa trên máy chủ (mặc định tắt)</span>
                </label>
              </div>
            </div>
          </details>

          {/* CẬP NHẬT FIRMWARE CTA */}
          <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-800 text-xs">Cập nhật firmware</h4>
              <p className="text-[11px] text-slate-500">
                Nạp bản build mới nhất do máy chủ cung cấp lên ESP32
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={onOpenFirmwareDialog}
              className="inline-flex items-center gap-1.5 text-xs font-semibold"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Mở nạp firmware</span>
            </Button>
          </div>

          {/* NHẬT KÝ PHIÊN USB */}
          <details className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 text-xs text-slate-600 space-y-2">
            <summary className="font-bold text-slate-800 cursor-pointer select-none flex items-center justify-between">
              <span>Nhật ký phiên USB ({usb.logs.length} bản ghi)</span>
            </summary>
            <div className="pt-2 space-y-2">
              <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] max-h-40 overflow-y-auto space-y-1">
                {usb.logs.length > 0 ? (
                  usb.logs.map((line, idx) => <p key={idx}>{line}</p>)
                ) : (
                  <p className="text-slate-500">Chưa có hoạt động USB nào trong phiên này.</p>
                )}
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={!usb.logs.length}
                  onClick={usb.clearLogs}
                  className="text-[11px] text-slate-500 hover:text-slate-700"
                >
                  Xóa nhật ký trên màn hình
                </Button>
              </div>
            </div>
          </details>
        </div>

        {/* Panel Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            Đóng bảng điều khiển vẫn giữ nguyên phiên USB
          </span>
          <Button
            type="button"
            variant="ghost"
            disabled={Boolean(usb.busy)}
            onClick={onClose}
            className="text-xs font-semibold"
          >
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}
