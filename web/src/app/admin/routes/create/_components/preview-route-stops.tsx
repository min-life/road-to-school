import { useEffect, useRef } from 'react';
import type { MapPoint } from '@/components/admin/routes/route-map';
import type { PreviewStop } from '@/lib/types';

export function previewStopKind(stop: PreviewStop): MapPoint['type'] {
  const type = stop.stopType ?? stop.type;
  if (type === 'PARKING_START' || type === 'PARKING_END') return 'DEPOT';
  if (type === 'SCHOOL_ARRIVAL' || type === 'SCHOOL_DEPARTURE') return 'SCHOOL';
  return 'STUDENT';
}

export function previewStopTitle(stop: PreviewStop, schoolName: string) {
  const kind = previewStopKind(stop);
  if (kind === 'DEPOT') return 'Bãi xe trung tâm';
  if (kind === 'SCHOOL') return schoolName;
  return stop.studentName || 'Điểm đón/trả';
}

export function PreviewRouteStops({ stops, schoolName, selectedId, routeId, defaultServiceSeconds, onSelect }: {
  stops: PreviewStop[];
  schoolName: string;
  selectedId: string | null;
  routeId: string;
  defaultServiceSeconds: number;
  onSelect: (stop: PreviewStop) => void;
}) {
  const selectedRow = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    selectedRow.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  return <section className="preview-route-stops" aria-label="Điểm dừng của tuyến đang xem">
    <div className="preview-stop-list-heading"><h3>Điểm dừng</h3><span>Giờ dự kiến</span></div>
    {stops.length ? <ol className="preview-route-stops-list" tabIndex={0} aria-label="Trình tự điểm dừng">
      {stops.map(stop => {
        const kind = previewStopKind(stop);
        const selected = selectedId === `${routeId}:${stop.stopOrder}`;
        return <li key={stop.stopOrder}>
          <button type="button" ref={selected ? selectedRow : undefined} className="preview-stop-row" aria-pressed={selected}
            disabled={!Number.isFinite(stop.latitude) || !Number.isFinite(stop.longitude)} onClick={() => onSelect(stop)}>
            <span className="preview-stop-badge" data-kind={kind} aria-hidden={kind !== 'STUDENT'}>
              {kind === 'DEPOT' ? 'P' : kind === 'SCHOOL' ? 'S' : stop.stopOrder}
            </span>
            <span className="preview-stop-body">
              <strong className="preview-stop-name">{previewStopTitle(stop, schoolName)}</strong>
              {stop.addressText && <span className="preview-stop-address" title={stop.addressText}>{stop.addressText}</span>}
              {kind === 'STUDENT' && stop.serviceDurationSeconds != null && stop.serviceDurationSeconds !== defaultServiceSeconds &&
                <span className="preview-stop-service">Dừng {stop.serviceDurationSeconds} giây</span>}
            </span>
            <time>{stop.plannedArrivalTime || '—'}</time>
          </button>
        </li>;
      })}
    </ol> : <p className="route-workspace-empty">Tuyến này chưa có điểm dừng.</p>}
  </section>;
}
