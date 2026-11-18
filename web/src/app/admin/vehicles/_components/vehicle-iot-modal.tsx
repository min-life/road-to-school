'use client';

import React, { useEffect, useState } from 'react';
import { EnrollmentRecovery } from '@/components/admin/iot/enrollment-recovery';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { SpinnerIcon } from '@/components/icons';
import type { Vehicle } from '@/lib/types';
import { useVehicleIot } from './use-vehicle-iot';
import { VehicleIotHistory } from './vehicle-iot-history';
import './vehicle-iot-modal.css';

interface VehicleIotModalProps {
  vehicle: Vehicle;
  onClose: () => void;
  onUpdated: () => void;
}

export function VehicleIotModal({ vehicle, onClose, onUpdated }: VehicleIotModalProps) {
  const [deviceId, setDeviceId] = useState('');
  const [reason, setReason] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'assign' | 'release' | null>(null);
  const [staleWarning, setStaleWarning] = useState('');

  const binding = useVehicleIot(vehicle.id, onUpdated);
  const current = binding.data?.current;
  const assignment = current?.assignment;
  const blocked = binding.busy || binding.loading || !binding.data;
  const confirmed = current?.configurationStatus === 'CONFIRMED';
  const historyDevice = current?.deviceId || deviceId;

  // Filter out any device that has an active assignment (including waiting for ACK)
  const unassignedDevices = (binding.data?.devices || []).filter((device) => {
    if (device.assignment && !device.assignment.releasedAt) {
      return false;
    }
    return true;
  });

  const selected = unassignedDevices.find((device) => device.deviceId === deviceId);

  // If selected device was assigned elsewhere in background
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (deviceId && binding.data && !binding.loading) {
      const isAvailable = unassignedDevices.some((d) => d.deviceId === deviceId);
      if (!isAvailable) {
        setDeviceId('');
        setConfirmAction(null);
        setStaleWarning('Thiết bị vừa được gán cho phương tiện khác. Danh sách đã được làm mới.');
        void binding.reload();
      }
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [deviceId, binding.data, binding.loading, unassignedDevices, binding]);

  // Keyboard navigation & Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !binding.busy) {
        if (confirmAction) {
          setConfirmAction(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [binding.busy, confirmAction, onClose]);

  const handleStartAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (blocked || assignment || !selected || !binding.data?.vehicle.isActive || selected.enrollmentBusy) {
      return;
    }
    setStaleWarning('');
    setConfirmAction('assign');
  };

  const handleConfirmAssign = async () => {
    if (!selected) return;
    await binding.change(selected, reason);
    setConfirmAction(null);
    setDeviceId('');
    setReason('');
  };

  const handleConfirmRelease = async () => {
    await binding.change(null, reason);
    setConfirmAction(null);
    setReason('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="vehicle-iot-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !binding.busy) {
          onClose();
        }
      }}
    >
      <Card className="ui-dialog-panel relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div>
            <h2 id="vehicle-iot-modal-title" className="text-base font-bold text-foreground">
              Quản lý thiết bị IoT
            </h2>
            <p className="text-xs text-slate-500">
              Phương tiện: <strong className="font-mono text-slate-800">{vehicle.licensePlate}</strong> · {vehicle.brand}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={binding.busy}
            onClick={onClose}
            aria-label="Đóng"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            ✕
          </Button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm flex-1">
          {/* Notifications / Errors */}
          {binding.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800" role="alert">
              {binding.error}
            </div>
          )}
          {binding.notice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800" role="status">
              {binding.notice}
            </div>
          )}
          {staleWarning && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800" role="alert">
              {staleWarning}
            </div>
          )}

          {binding.loading && !binding.data ? (
            <div className="py-12 text-center text-slate-400">
              <SpinnerIcon className="w-5 h-5 animate-spin mx-auto text-amber-500 mb-2" />
              <p className="text-xs">Đang tải thông tin thiết bị…</p>
            </div>
          ) : binding.data ? (
            <>
              {/* Khối thông tin riêng: Thiết bị hiện tại */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Thiết bị hiện tại</span>
                  {assignment ? (
                    <Badge
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        confirmed
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {confirmed ? 'Đã nhận cấu hình' : 'Chờ thiết bị nhận cấu hình'}
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[11px] font-semibold">
                      Chưa gắn thiết bị
                    </Badge>
                  )}
                </div>

                <div className="font-mono font-bold text-slate-800 text-sm">
                  {current?.deviceId || 'Chưa có thiết bị nào được gán'}
                </div>

                {current?.lastConfigAckAt && (
                  <p className="text-[11px] text-slate-500">
                    Xác nhận gần nhất:{' '}
                    {new Date(current.lastConfigAckAt).toLocaleString('vi-VN', {
                      timeZone: 'Asia/Ho_Chi_Minh',
                    })}
                  </p>
                )}

                {!binding.data.vehicle.isActive && (
                  <p className="text-xs text-amber-700 font-medium pt-1">
                    Xe đang ngừng hoạt động. Kích hoạt xe trước khi gán thiết bị.
                  </p>
                )}
              </div>

              {/* Confirmations (Inline dialog) */}
              {confirmAction === 'assign' && selected && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-3 animate-in fade-in duration-100">
                  <div className="font-bold text-amber-900 text-sm">
                    Xác nhận gán thiết bị
                  </div>
                  <p className="text-amber-800">
                    Gán thiết bị <strong className="font-mono">{selected.deviceId}</strong> ({selected.name}) cho xe{' '}
                    <strong>{vehicle.licensePlate}</strong>?
                  </p>
                  {reason.trim() && (
                    <p className="text-amber-700">
                      Lý do: <em>{reason.trim()}</em>
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={binding.busy}
                      onClick={handleConfirmAssign}
                      className="font-bold text-xs"
                    >
                      {binding.busy ? <SpinnerIcon className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>{binding.busy ? 'Đang gán…' : 'Xác nhận gán'}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={binding.busy}
                      onClick={() => setConfirmAction(null)}
                      className="text-xs"
                    >
                      Quay lại
                    </Button>
                  </div>
                </div>
              )}

              {confirmAction === 'release' && current && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-3 animate-in fade-in duration-100">
                  <div className="font-bold text-rose-900 text-sm">
                    Xác nhận tháo thiết bị
                  </div>
                  <p className="text-rose-800">
                    Tháo thiết bị <strong className="font-mono">{current.deviceId}</strong> khỏi xe{' '}
                    <strong>{vehicle.licensePlate}</strong>?
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    Lịch sử quẹt thẻ và cấu hình Wi-Fi đã lưu trên thiết bị sẽ được giữ nguyên.
                  </p>
                  {reason.trim() && (
                    <p className="text-rose-700">
                      Lý do: <em>{reason.trim()}</em>
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={binding.busy}
                      onClick={handleConfirmRelease}
                      className="font-bold text-xs"
                    >
                      {binding.busy ? <SpinnerIcon className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>{binding.busy ? 'Đang tháo…' : 'Xác nhận tháo'}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={binding.busy}
                      onClick={() => setConfirmAction(null)}
                      className="text-xs"
                    >
                      Quay lại
                    </Button>
                  </div>
                </div>
              )}

              {/* Form Gán / Tháo khi chưa trong bước xác nhận */}
              {!confirmAction && (
                <>
                  {assignment ? (
                    <p className="text-xs text-slate-500">
                      Phương tiện đã có thiết bị. Bấm nút <strong>Tháo thiết bị</strong> bên dưới nếu muốn gỡ bỏ thiết bị hiện tại trước khi gán thiết bị khác.
                    </p>
                  ) : binding.data.vehicle.isActive ? (
                    <div className="space-y-1.5">
                      <label htmlFor="vehicle-iot-device-select" className="block text-xs font-semibold text-slate-700">
                        Chọn thiết bị IoT (ESP32) *
                      </label>
                      {unassignedDevices.length === 0 ? (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                          Không có thiết bị chưa gán cho xe
                        </div>
                      ) : (
                        <Select
                          id="vehicle-iot-device-select"
                          value={deviceId}
                          disabled={blocked || !binding.data.vehicle.isActive}
                          onChange={(e) => setDeviceId(e.target.value)}
                          className="w-full text-xs"
                        >
                          <option value="">-- Chọn thiết bị chưa gán ({unassignedDevices.length}) --</option>
                          {unassignedDevices.map((dev) => (
                            <option
                              key={dev.deviceId}
                              value={dev.deviceId}
                              disabled={dev.enrollmentBusy}
                            >
                              {dev.name || dev.deviceId} · {dev.deviceId}
                              {dev.enrollmentBusy ? ' (Đang đăng ký thẻ RFID)' : ''}
                            </option>
                          ))}
                        </Select>
                      )}
                    </div>
                  ) : null}

                  {/* Lý do (tùy chọn) */}
                  <div className="space-y-1">
                    <label htmlFor="vehicle-iot-reason" className="block text-xs font-semibold text-slate-700">
                      Lý do thay đổi (tùy chọn)
                    </label>
                    <Input
                      id="vehicle-iot-reason"
                      type="text"
                      placeholder="VD: Thay thế thiết bị bảo trì, đổi xe..."
                      value={reason}
                      maxLength={500}
                      disabled={blocked}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full text-xs"
                    />
                  </div>

                  {/* Đối soát đăng ký RFID */}
                  <EnrollmentRecovery
                    devices={binding.data.devices}
                    onUpdated={binding.reload}
                  />

                  {/* Lịch sử thiết bị */}
                  {historyDevice && (
                    <details
                      onToggle={(e) => setHistoryOpen(e.currentTarget.open)}
                      className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 text-xs space-y-2"
                    >
                      <summary className="font-semibold text-slate-700 cursor-pointer select-none">
                        Lịch sử gán thiết bị {historyDevice}
                      </summary>
                      {historyOpen && (
                        <div className="pt-2">
                          <VehicleIotHistory
                            key={`${historyDevice}-${assignment?.id || 'unassigned'}`}
                            deviceId={historyDevice}
                          />
                        </div>
                      )}
                    </details>
                  )}
                </>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={binding.busy || binding.loading}
            onClick={() => void binding.reload()}
            className="text-xs"
          >
            Tải lại
          </Button>

          {!confirmAction && binding.data && (
            <div className="flex items-center gap-2">
              {assignment ? (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={blocked}
                  onClick={() => setConfirmAction('release')}
                  className="font-bold text-xs"
                >
                  Tháo thiết bị
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={blocked || !selected || !binding.data?.vehicle.isActive || selected.enrollmentBusy}
                  onClick={handleStartAssign}
                  className="font-bold text-xs"
                >
                  Gán thiết bị
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
