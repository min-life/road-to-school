'use client';

import type { RouteStopDetail } from '@/lib/types';
import { Button } from '@/components/ui/button';

export function TripStopsPanel({ stops, schoolName, onFocus }: {
  stops: RouteStopDetail[]; schoolName: string; onFocus: (point: { latitude: number; longitude: number; zoom: number }) => void;
}) {
  return <div className="trip-detail-stops-panel">
    <h2 className="trip-detail-panel-title">Trình tự điểm dừng ({stops.length})</h2>
    {!stops.length ? <p className="trip-detail-empty">Không có dữ liệu điểm dừng.</p> : <div className="trip-detail-stop-list">{stops.map((stop, index) => {
      const parking = stop.stopType === 'PARKING_START' || stop.stopType === 'PARKING_END';
      const school = stop.stopType === 'SCHOOL_ARRIVAL' || stop.stopType === 'SCHOOL_DEPARTURE';
      return <Button type="button" key={stop.id || index} className="trip-detail-stop" onClick={() => onFocus({ latitude: stop.latitude, longitude: stop.longitude, zoom: 16 })}>
        <span className="trip-detail-stop-order">{stop.stopOrder}</span>
        <span className="trip-detail-stop-body"><span className="trip-detail-stop-heading"><strong>{parking ? 'Bãi xe trung tâm' : school ? schoolName : stop.studentName || 'Điểm đón học sinh'}</strong>{stop.plannedArrivalTime && <time>{stop.plannedArrivalTime}</time>}</span><span className="trip-detail-stop-address">{stop.addressText}</span></span>
      </Button>;
    })}</div>}
  </div>;
}
