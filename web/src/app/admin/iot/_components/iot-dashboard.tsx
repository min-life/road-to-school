'use client';

import React, { useState } from 'react';
import { Cpu, Radio, PlugZap } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { useEsp32 } from './use-esp32';
import { DevicePanel } from './device-panel';
import { ScanPanel } from './scan-panel';
import { UsbSetupPanel } from './usb-setup-panel';
import { FirmwareDialog } from './firmware-dialog';
import './iot.css';

export function IotDashboard() {
  // Keep USB session persistent at dashboard root level
  const usb = useEsp32();

  const [activeTab, setActiveTab] = useState<'devices' | 'history'>('devices');
  const [isUsbSetupOpen, setIsUsbSetupOpen] = useState(false);
  const [isFirmwareOpen, setIsFirmwareOpen] = useState(false);
  const [scanDeviceId, setScanDeviceId] = useState('');

  const handleSelectDeviceForScanHistory = (deviceId: string) => {
    setScanDeviceId(deviceId);
    setActiveTab('history');
  };

  return (
    <div className="iot-page space-y-5">
      {/* Page Header with USB Setup Action */}
      <PageHeader
        title="Thiết bị IoT"
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={usb.chip ? 'primary' : 'outline'}
              onClick={() => setIsUsbSetupOpen(true)}
              className="inline-flex items-center gap-2 font-bold px-4 py-2 text-xs shadow-2xs"
            >
              <PlugZap className="w-4 h-4" aria-hidden="true" />
              <span>{usb.chip ? 'Tiếp tục thiết lập USB' : 'Thiết lập qua USB'}</span>
              {usb.chip && (
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse ml-0.5" />
              )}
            </Button>
          </div>
        }
      />

      {/* Tabs Bar */}
      <div
        role="tablist"
        aria-label="Các mục quản lý IoT"
        className="inline-flex items-center gap-1.5 p-1 bg-slate-100/80 border border-slate-200/80 rounded-2xl"
      >
        <button
          type="button"
          id="iot-tab-btn-devices"
          role="tab"
          aria-selected={activeTab === 'devices'}
          aria-controls="iot-tab-panel-devices"
          onClick={() => setActiveTab('devices')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'devices'
              ? 'bg-amber-400 text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Cpu className="w-4 h-4" aria-hidden="true" />
          <span>Thiết bị</span>
        </button>

        <button
          type="button"
          id="iot-tab-btn-history"
          role="tab"
          aria-selected={activeTab === 'history'}
          aria-controls="iot-tab-panel-history"
          onClick={() => setActiveTab('history')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-amber-400 text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Radio className="w-4 h-4" aria-hidden="true" />
          <span>Lịch sử quét thẻ</span>
        </button>
      </div>

      {/* Tab Panels (kept mounted to preserve state across tab switches) */}
      <div
        id="iot-tab-panel-devices"
        role="tabpanel"
        aria-labelledby="iot-tab-btn-devices"
        className={activeTab === 'devices' ? 'block' : 'hidden'}
      >
        <DevicePanel onSelectDeviceForScanHistory={handleSelectDeviceForScanHistory} />
      </div>

      <div
        id="iot-tab-panel-history"
        role="tabpanel"
        aria-labelledby="iot-tab-btn-history"
        className={activeTab === 'history' ? 'block' : 'hidden'}
      >
        <ScanPanel initialDeviceId={scanDeviceId} />
      </div>

      {/* Right Drawer: Thiết lập qua USB */}
      <UsbSetupPanel
        isOpen={isUsbSetupOpen}
        onClose={() => setIsUsbSetupOpen(false)}
        controls={usb}
        onOpenFirmwareDialog={() => {
          setIsUsbSetupOpen(false);
          setIsFirmwareOpen(true);
        }}
      />

      {/* Dialog: Cập nhật Firmware */}
      <FirmwareDialog
        isOpen={isFirmwareOpen}
        onClose={() => setIsFirmwareOpen(false)}
        controls={usb}
      />
    </div>
  );
}
