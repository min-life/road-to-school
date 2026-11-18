'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { RefreshCw, ArrowRight, Radio, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { SpinnerIcon } from '@/components/icons';
import { PaginationControl } from '@/components/admin/common/pagination-control';
import { iotApi } from '@/lib/iot-api';
import type { IotDevice } from '@/lib/iot-api';
import { iotError } from './use-esp32';

interface DevicePanelProps {
  onSelectDeviceForScanHistory: (deviceId: string) => void;
}

export function DevicePanel({ onSelectDeviceForScanHistory }: DevicePanelProps) {
  const [devices, setDevices] = useState<IotDevice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [deviceIdInput, setDeviceIdInput] = useState('');
  const [activeDeviceIdFilter, setActiveDeviceIdFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchDevices = useCallback(async (targetPage = page, targetFilter = activeDeviceIdFilter) => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const res = await iotApi.devices({
        page: targetPage,
        limit: 20,
        deviceId: targetFilter || undefined,
      });
      setDevices(res.data);
      setTotal(res.total);
    } catch (err) {
      setErrorMessage(iotError(err));
      setDevices([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, activeDeviceIdFilter]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    fetchDevices(page, activeDeviceIdFilter);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [fetchDevices, page, activeDeviceIdFilter]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveDeviceIdFilter(deviceIdInput.trim());
    setPage(1);
  };

  const handleClearFilter = () => {
    setDeviceIdInput('');
    setActiveDeviceIdFilter('');
    setPage(1);
  };

  const formatLastSeen = (isoString?: string) => {
    if (!isoString) return 'Chưa ghi nhận';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Chưa ghi nhận';
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 0 || diffSec < 60) return `${Math.max(1, diffSec)} giây trước`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;

    // Check if same day
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const timeStr = date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    });

    if (isToday) return `Lần cuối ${timeStr} hôm nay`;

    const dateStr = date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Ho_Chi_Minh',
    });
    return `Lần cuối ${timeStr} · ${dateStr}`;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar Card */}
      <Card className="p-4 border border-slate-200 bg-white rounded-2xl shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-bold text-slate-800">Thiết bị đã đăng ký</h2>
            <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs font-semibold">
              {total} thiết bị
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={() => fetchDevices(page, activeDeviceIdFilter)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>Làm mới</span>
            </Button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-end gap-3 pt-1 border-t border-slate-100">
          <div className="w-full sm:w-80 space-y-1">
            <label htmlFor="iot-device-id-filter" className="text-xs font-semibold text-slate-700">
              Mã thiết bị
            </label>
            <Input
              id="iot-device-id-filter"
              type="text"
              placeholder="Nhập đầy đủ mã thiết bị"
              value={deviceIdInput}
              onChange={(e) => setDeviceIdInput(e.target.value)}
              className="w-full text-xs"
              maxLength={128}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="text-xs font-bold px-4 py-2"
            >
              Lọc
            </Button>
            {activeDeviceIdFilter && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleClearFilter}
                disabled={isLoading}
                className="text-xs text-slate-600 hover:text-slate-900"
              >
                Xóa bộ lọc
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* Error state */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between" role="alert">
          <span>{errorMessage}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchDevices(page, activeDeviceIdFilter)}
            className="text-xs"
          >
            Thử lại
          </Button>
        </div>
      )}

      {/* Table Card */}
      <Card className="border border-slate-200 bg-white rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto min-w-0" role="region" aria-label="Bảng danh sách thiết bị IoT">
          <Table minWidth={840}>
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-700 text-xs font-bold">
                <th className="py-3 px-4 text-left">Thiết bị</th>
                <th className="py-3 px-4 text-left">Liên lạc máy chủ</th>
                <th className="py-3 px-4 text-left">Xe được gán</th>
                <th className="py-3 px-4 text-left">Cấu hình xe</th>
                <th className="py-3 px-4 text-left">Firmware</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <SpinnerIcon className="w-5 h-5 animate-spin text-amber-500" />
                      <span>Đang tải danh sách thiết bị…</span>
                    </div>
                  </td>
                </tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Radio className="w-8 h-8 text-slate-300 mx-auto mb-2" aria-hidden="true" />
                    <p className="font-semibold text-slate-700">
                      {activeDeviceIdFilter ? 'Không tìm thấy thiết bị phù hợp' : 'Chưa có thiết bị nào'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {activeDeviceIdFilter
                        ? 'Thử kiểm tra lại mã thiết bị hoặc bấm Xóa bộ lọc.'
                        : 'Kết nối thiết bị qua USB và cấp cấu hình để đăng ký thiết bị mới.'}
                    </p>
                  </td>
                </tr>
              ) : (
                devices.map((dev) => (
                  <tr key={dev.deviceId} className="hover:bg-slate-50/70 transition-colors">
                    {/* Thiết bị */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{dev.name || dev.deviceId}</span>
                          {dev.enrollmentBusy && (
                            <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-semibold">
                              Đang đăng ký thẻ
                            </Badge>
                          )}
                        </div>
                        <div className="font-mono text-slate-500 text-[11px]">
                          {dev.deviceId}
                        </div>
                        {dev.chipModel && (
                          <div className="text-slate-400 text-[10px]">
                            {dev.chipModel}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Liên lạc máy chủ */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <Badge
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                            dev.status === 'ONLINE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${dev.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          <span>{dev.status === 'ONLINE' ? 'Có liên lạc' : 'Chưa có liên lạc'}</span>
                        </Badge>
                        <div className="text-[11px] text-slate-500">
                          {formatLastSeen(dev.lastSeenAt)}
                        </div>
                      </div>
                    </td>

                    {/* Xe được gán */}
                    <td className="py-3 px-4">
                      {dev.assignment?.licensePlate ? (
                        <div className="space-y-0.5">
                          <Link
                            href={`/admin/vehicles?search=${encodeURIComponent(dev.assignment.licensePlate)}`}
                            className="font-bold text-slate-800 hover:text-amber-700 hover:underline inline-flex items-center gap-1"
                          >
                            <span>{dev.assignment.licensePlate}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </Link>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium">Chưa gán xe</span>
                      )}
                    </td>

                    {/* Cấu hình xe */}
                    <td className="py-3 px-4">
                      {dev.configurationStatus === 'CONFIRMED' ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold">
                          Đã nhận phân công
                        </Badge>
                      ) : dev.configurationStatus === 'PENDING' ? (
                        <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[11px] font-semibold">
                          Chờ xác nhận
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[11px] font-semibold">
                          Chưa phân công
                        </Badge>
                      )}
                    </td>

                    {/* Firmware */}
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-700">
                        {dev.firmwareVersion || 'Chưa xác định'}
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td className="py-3 px-4 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelectDeviceForScanHistory(dev.deviceId)}
                        className="text-xs font-semibold text-amber-700 hover:text-amber-800 hover:bg-amber-50 inline-flex items-center gap-1"
                      >
                        <span>Xem lượt quét</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>

        {/* Footer & Phân trang */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span>Gán hoặc tháo thiết bị tại hồ sơ xe.</span>
            <Link
              href="/admin/vehicles"
              className="font-bold text-amber-700 hover:text-amber-800 hover:underline inline-flex items-center gap-0.5"
            >
              <span>Mở Phương tiện →</span>
            </Link>
          </div>

          <PaginationControl
            page={page}
            totalPages={Math.max(1, Math.ceil(total / 20))}
            total={total}
            limit={20}
            loading={isLoading}
            onPageChange={(newPage) => setPage(newPage)}
            onLimitChange={() => undefined}
            limitOptions={[20]}
          />
        </div>
      </Card>
    </div>
  );
}
