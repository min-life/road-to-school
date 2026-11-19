'use client';

import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SpinnerIcon } from '@/components/icons';
import type { SystemRequestRoutingPreviewResponse } from '@/lib/types';
import { addressApprovalOutcome } from '@/lib/address-request-review';

type Route = SystemRequestRoutingPreviewResponse['routes'][number];

function routeLabel(route: Route) {
  const number = /^(?:TD|TV)(\d+)(?:-|$)/i.exec(route.routeName)?.[1];
  return number ? `${route.direction === 'TO_SCHOOL' ? 'Tuyến đi' : 'Tuyến về'} ${number}` : route.routeName;
}

function durationChange({ oldDurationSeconds, newDurationSeconds }: Route) {
  if (oldDurationSeconds == null || newDurationSeconds == null) return 'Có thể cập nhật';
  const difference = Math.round(newDurationSeconds - oldDurationSeconds);
  if (!difference) return 'Thời gian giữ nguyên';
  const absolute = Math.abs(difference);
  const duration = absolute < 60 ? `${absolute} giây` : `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(absolute / 60)} phút`;
  return `${difference > 0 ? 'Dài hơn' : 'Ngắn hơn'} ${duration}`;
}

export function AddressRoutingReview({ preview, busy, error, hasChecked, minutes, seconds, minutesError, secondsError, onMinutes, onSeconds }: {
  preview: SystemRequestRoutingPreviewResponse | null;
  busy: boolean; error: string | null; hasChecked: boolean;
  minutes: string; seconds: string; minutesError: string | null; secondsError: string | null;
  onMinutes: (value: string) => void; onSeconds: (value: string) => void;
}) {
  const id = useId();
  const [showDetails, setShowDetails] = useState(false);
  const outcome = addressApprovalOutcome(preview);
  const resultTitle = outcome === 'DIRECT_UPDATE' ? 'Học sinh chưa có tuyến'
    : outcome === 'REOPTIMIZED' ? `Có thể cập nhật ${preview?.routes.length} tuyến`
    : outcome === 'REMOVED_FROM_ROUTES' ? 'Không thể bố trí vào tuyến hiện tại'
    : 'Chưa có kết quả kiểm tra đầy đủ';

  return <section className="space-y-2.5" aria-labelledby={`${id}-routing`}>
    <h3 id={`${id}-routing`} className="text-sm font-semibold text-slate-900">Tác động đến tuyến</h3>
    <details className="group rounded-xl border border-slate-200">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 [&::-webkit-details-marker]:hidden">
        Tùy chỉnh kiểm tra
        <span className="ml-auto flex items-center gap-2 text-xs font-normal text-slate-600">
          {minutesError || secondsError ? 'Cần sửa thông số' : `${minutes} phút · ${seconds} giây/điểm`}
          <ChevronDown size={16} aria-hidden="true" className="group-open:rotate-180" />
        </span>
      </summary>
      <div className="grid gap-3 border-t border-slate-200 p-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={`${id}-minutes`} className="block font-medium">Thời gian tối đa tuyến (phút)</label>
          <Input id={`${id}-minutes`} className="w-full" type="number" min={10} max={180} step="any" disabled={busy}
            value={minutes} onChange={event => onMinutes(event.target.value)} aria-invalid={!!minutesError} aria-describedby={`${id}-minutes-help`} />
          <p id={`${id}-minutes-help`} className={minutesError ? 'text-rose-700' : 'text-slate-600'}>{minutesError ?? 'Gồm thời gian di chuyển, dừng và chờ.'}</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${id}-seconds`} className="block font-medium">Thời gian dừng mỗi điểm (giây)</label>
          <Input id={`${id}-seconds`} className="w-full" type="number" min={10} max={300} step={1} disabled={busy}
            value={seconds} onChange={event => onSeconds(event.target.value)} aria-invalid={!!secondsError} aria-describedby={`${id}-seconds-help`} />
          <p id={`${id}-seconds-help`} className={secondsError ? 'text-rose-700' : 'text-slate-600'}>{secondsError ?? 'Thời gian phục vụ đón hoặc trả học sinh.'}</p>
        </div>
      </div>
    </details>
    {busy ? <div role="status" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
      <SpinnerIcon className="size-4 animate-spin" />Đang kiểm tra tuyến…
    </div> : error ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{error}</p>
    : !preview ? <div role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
      <p className="font-semibold text-slate-900">{hasChecked ? 'Kết quả cần kiểm tra lại' : 'Chưa kiểm tra tuyến'}</p>
      <p className="mt-1">{hasChecked ? 'Kiểm tra lại trước khi duyệt.' : 'Kiểm tra để biết địa chỉ mới ảnh hưởng đến tuyến nào.'}</p>
    </div> : <div className="space-y-2">
      <div className={`rounded-xl border p-3 ${outcome === 'DIRECT_UPDATE' || outcome === 'REOPTIMIZED' ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
        <p role="status" className="text-sm font-semibold text-slate-900">{resultTitle}</p>
        {outcome === 'DIRECT_UPDATE' && <p className="mt-1 text-slate-700">Có thể duyệt cập nhật địa chỉ học sinh.</p>}
        {!outcome && <p className="mt-1 text-slate-700">Vui lòng thử lại trước khi duyệt.</p>}
        {preview.routes.length > 0 && <ul className="mt-2 divide-y divide-slate-200 border-t border-slate-200">
          {preview.routes.map(route => <li key={route.routeId} className="flex flex-wrap justify-between gap-x-3 gap-y-1 py-2 text-sm">
            <span className="font-medium text-slate-900">{routeLabel(route)}</span>
            <span>{route.feasibility === 'FEASIBLE' ? durationChange(route) : route.feasibility === 'INFEASIBLE' ? 'Không khả thi' : 'Chưa kiểm tra được'}</span>
          </li>)}
        </ul>}
      </div>
      {preview.routes.length > 0 && <div>
        <button type="button" className="rounded text-sm font-semibold text-blue-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-expanded={showDetails} aria-controls={`${id}-impact`} onClick={() => setShowDetails(value => !value)}>{showDetails ? 'Ẩn chi tiết tác động' : 'Xem chi tiết tác động'}</button>
        <div id={`${id}-impact`} hidden={!showDetails} className="mt-2 space-y-2 rounded-xl border border-slate-200 p-3 text-slate-700">
          {outcome === 'REOPTIMIZED' && <p>{preview.affectedScheduledTripsCount} chuyến đã lên lịch sẽ cập nhật · {preview.preservedTripsCount} chuyến giữ nguyên</p>}
          {preview.routes.map(route => {
            const reason = route.infeasibilityReason ?? route.reason;
            return reason || route.newPlannedArrivalTime ? <p key={route.routeId}>{routeLabel(route)} · {reason || `Giờ dự kiến tại điểm đón trả ${route.newPlannedArrivalTime}`}</p> : null;
          })}
        </div>
      </div>}
    </div>}
  </section>;
}
