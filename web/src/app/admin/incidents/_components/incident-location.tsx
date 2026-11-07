'use client';

import { RouteMap } from '@/components/admin/routes/route-map';
import type { TripIncident } from '@/lib/types';

export function IncidentLocation({ incident }: { incident: TripIncident }) {
  const context = incident.context;
  const latitude = context?.latitude, longitude = context?.longitude;
  const valid = typeof latitude === 'number' && typeof longitude === 'number'
    && Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
  if (!['NO_GUARDIAN_AT_STOP', 'TRAFFIC_DELAY', 'GPS_SIGNAL_LOST'].includes(incident.type)) return null;
  return <section className="incident-section incident-location">
    <h4 className="font-semibold">Vị trí sự cố</h4>
    {valid ? <RouteMap key={incident.id} height="240px" points={[{ id: incident.id, latitude, longitude, title: 'Vị trí ghi nhận sự cố', type: 'INCIDENT', color: '#E11D48', isSelected: true }]} />
      : <p className="text-slate-500">Chưa có vị trí.</p>}
  </section>;
}
