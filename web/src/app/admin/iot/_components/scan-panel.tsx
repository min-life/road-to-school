'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Radio,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { SpinnerIcon } from '@/components/icons';
import { PaginationControl } from '@/components/admin/common/pagination-control';
import { useIotFeed } from './use-iot-feed';

interface ScanPanelProps {
  initialDeviceId?: string;
}

export function ScanPanel({ initialDeviceId = '' }: ScanPanelProps) {
  const feed = useIotFeed({ initialDeviceId });
  const [deviceFilter, setDeviceFilter] = useState(initialDeviceId);
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  // Sync when initialDeviceId prop changes (e.g. from "Xem lượt quét")
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (initialDeviceId) {
      setDeviceFilter(initialDeviceId);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [initialDeviceId]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    feed.filter(deviceFilter.trim(), vehicleFilter);
  };

  const handleClearFilter = () => {
    setDeviceFilter('');
    setVehicleFilter('');
    feed.filter('', '');
  };

  const handleCopyUid = (uid: string) => {
    try {
      void navigator.clipboard.writeText(uid);
      setCopiedUid(uid);
      setTimeout(() => setCopiedUid(null), 1800);
    } catch {
      // Clipboard write failed
    }
  };

  const formatVietnamTime = (isoString: string) => {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return { time: '—', date: '—' };
    const time = date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    });
    const day = date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Ho_Chi_Minh',
    });
    return { time, date: day };
  };

  const hasActiveFilters = Boolean(feed.deviceId || feed.vehicleId);

  return (
    <div className="space-y-4">
      {/* Banner link to Trips */}
      <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
          <span>
            Lịch sử tại đây chỉ ghi nhận các lượt quét kỹ thuật từ ESP32 (không bao gồm lượt điểm danh chuyến xe).
          </span>
        </div>
        <Link
          href="/admin/trips"
          className="font-bold text-amber-800 hover:text-amber-900 hover:underline inline-flex items-center gap-1 shrink-0"
        >
          <span>Xem điểm danh theo chuyến tại Chuyến xe</span>
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>

      {/* Toolbar Card */}
      <Card className="p-4 border border-slate-200 bg-white rounded-2xl shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-bold text-slate-800">Lịch sử quét thẻ</h2>
            <Badge
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                feed.live === 'Đang nhận sự kiện'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : feed.live === 'Tạm dừng cập nhật'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  feed.live === 'Đang nhận sự kiện'
                    ? 'bg-emerald-500 animate-pulse'
                    : feed.live === 'Tạm dừng cập nhật'
                    ? 'bg-amber-500'
                    : 'bg-slate-400'
                }`}
              />
              <span>{feed.live}</span>
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!feed.paused}
                onChange={(e) => feed.setPaused(!e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 accent-amber-500"
              />
              <span className="font-medium text-slate-700">Tự cập nhật</span>
            </label>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={feed.loading}
              onClick={feed.refresh}
              className="inline-flex items-center gap-1.5 text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${feed.loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>Làm mới lịch sử</span>
            </Button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-end gap-3 pt-1 border-t border-slate-100">
          <div className="w-full sm:w-64 space-y-1">
            <label htmlFor="iot-scan-device-filter" className="text-xs font-semibold text-slate-700">
              Thiết bị
            </label>
            <Input
              id="iot-scan-device-filter"
              type="text"
              placeholder="Tất cả thiết bị (nhập mã)"
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value)}
              className="w-full text-xs"
              maxLength={128}
            />
          </div>

          <div className="w-full sm:w-56 space-y-1">
            <label htmlFor="iot-scan-vehicle-filter" className="text-xs font-semibold text-slate-700">
              Xe
            </label>
            <Select
              id="iot-scan-vehicle-filter"
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="w-full text-xs"
            >
              <option value="">Tất cả xe</option>
              {feed.vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.licensePlate} {!v.isActive ? '(Ngừng HĐ)' : ''}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="submit"
              variant="primary"
              disabled={feed.loading}
              className="text-xs font-bold px-4 py-2"
            >
              Lọc
            </Button>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleClearFilter}
                disabled={feed.loading}
                className="text-xs text-slate-600 hover:text-slate-900"
              >
                Xóa bộ lọc
              </Button>
            )}
          </div>

          <div className="ml-auto text-[11px] text-slate-400 self-center">
            Giờ Việt Nam · Mới nhận trước
            {feed.lastUpdatedAt && (
              <span> · Cập nhật lúc {feed.lastUpdatedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            )}
          </div>
        </form>
      </Card>

      {/* Error state */}
      {feed.error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between" role="alert">
          <span>{feed.error}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={feed.refresh}
            className="text-xs"
          >
            Thử lại
          </Button>
        </div>
      )}

      {/* Table Card */}
      <Card className="border border-slate-200 bg-white rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto min-w-0" role="region" aria-label="Bảng lịch sử quẹt thẻ">
          <Table minWidth={760}>
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-700 text-xs font-bold">
                <th className="py-3 px-4 text-left">Thời gian quét</th>
                <th className="py-3 px-4 text-left">Xe lúc quét</th>
                <th className="py-3 px-4 text-left">Mã thẻ (UID)</th>
                <th className="py-3 px-4 text-left">Loại thẻ</th>
                <th className="py-3 px-4 text-left">Thiết bị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {feed.loading && !feed.data?.data.length ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <SpinnerIcon className="w-5 h-5 animate-spin text-amber-500" />
                      <span>Đang tải lịch sử quét…</span>
                    </div>
                  </td>
                </tr>
              ) : !feed.data?.data.length ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Radio className="w-8 h-8 text-slate-300 mx-auto mb-2" aria-hidden="true" />
                    <p className="font-semibold text-slate-700">
                      {hasActiveFilters ? 'Không tìm thấy lượt quét phù hợp' : 'Chưa có lượt quét thẻ'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {hasActiveFilters
                        ? 'Thử thay đổi bộ lọc thiết bị/xe hoặc bấm Xóa bộ lọc.'
                        : 'Các lượt quẹt thẻ từ ESP32 sẽ tự động xuất hiện tại đây theo thời gian thực.'}
                    </p>
                  </td>
                </tr>
              ) : (
                feed.data.data.map((scan) => {
                  const { time, date } = formatVietnamTime(scan.scannedAt);
                  return (
                    <tr key={scan.scanId} className="hover:bg-slate-50/70 transition-colors">
                      {/* Thời gian */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 text-sm">
                            {time}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {date}
                          </div>
                        </div>
                      </td>

                      {/* Xe lúc quét */}
                      <td className="py-3 px-4">
                        {scan.vehicleLicensePlateSnapshot ? (
                          <span className="font-bold text-slate-800">
                            {scan.vehicleLicensePlateSnapshot}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium italic">
                            {scan.vehicleId || 'Chưa xác định xe'}
                          </span>
                        )}
                      </td>

                      {/* UID */}
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 text-sm bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {scan.cardUid}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyUid(scan.cardUid)}
                            title="Sao chép UID"
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            {copiedUid === scan.cardUid ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Loại thẻ */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-700">
                          {scan.cardType || 'Chưa xác định'}
                        </span>
                      </td>

                      {/* Thiết bị */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-600 text-[11px]">
                          {scan.deviceId}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>

        {/* Phân trang */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Hiển thị {feed.data?.data.length ? `${(feed.page - 1) * 20 + 1}–${Math.min(feed.page * 20, feed.data.total)} trên ` : ''}
            {feed.data?.total || 0} lượt quét
          </span>

          <PaginationControl
            page={feed.page}
            totalPages={Math.max(1, Math.ceil((feed.data?.total || 0) / 20))}
            total={feed.data?.total || 0}
            limit={20}
            loading={feed.loading}
            onPageChange={feed.setPage}
            onLimitChange={() => undefined}
            limitOptions={[20]}
          />
        </div>
      </Card>
    </div>
  );
}
