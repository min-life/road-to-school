'use client';

import { RouteMap } from '@/components/admin/routes/route-map';
import type { TripIncident } from '@/lib/types';

export function IncidentLocation({ incident }: { incident: TripIncident }) {
  const context = incident.context;
  const latitude = context?.latitude, longitude = context?.longitude;
  const source = context?.locationSource;
  const valid = source !== 'UNKNOWN' && typeof latitude === 'number' && typeof longitude === 'number'
    && Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
  if (!['NO_GUARDIAN_AT_STOP', 'TRAFFIC_DELAY', 'GPS_SIGNAL_LOST'].includes(incident.type)) return null;
  return <section className="incident-section incident-location">
    <h4 className="font-semibold">{source === 'LAST_KNOWN' ? 'Vị trí cuối ghi nhận' : 'Vị trí sự cố'}</h4>
    {context?.addressText && <p className="text-sm text-slate-500">{context.addressText}</p>}
    {typeof context?.capturedAt === 'string' && Number.isFinite(Date.parse(context.capturedAt)) && <p className="text-xs text-slate-500">Ghi nhận: {new Date(context.capturedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>}
    {valid ? <RouteMap key={incident.id} height="240px" points={[{ id: incident.id, latitude, longitude, title: source === 'LAST_KNOWN' ? 'Vị trí cuối ghi nhận' : 'Vị trí ghi nhận sự cố', type: 'INCIDENT', color: '#E11D48', isSelected: true }]} />
      : <p className="text-slate-500">Chưa có vị trí.</p>}
  </section>;
}
