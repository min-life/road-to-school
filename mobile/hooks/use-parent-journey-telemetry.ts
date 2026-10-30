import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { mobileApiClient, type MobileTripDetail, type OperationalStateResponse, type ParentHomeCardItem, type TripIncident } from '@/services/api-client';
import { useActiveRefresh } from '@/hooks/use-active-refresh';

export type ParentJourneyTelemetry = {
  detail?: MobileTripDetail;
  operation?: OperationalStateResponse;
  incidents?: TripIncident[];
  operationUnavailable?: boolean;
  incidentsUnavailable?: boolean;
  detailUnavailable?: boolean;
  unavailable?: boolean;
  metadataAt?: number;
};

/** Read-only operational milestones. No location request, publisher or GPS watcher. */
export function useParentJourneyTelemetry(identity: string, cards: ParentHomeCardItem[]) {
  const [active, setActive] = useState(false);
  useFocusEffect(useCallback(() => {
    setActive(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => { setActive(false); subscription.remove(); };
  }, []));
  const ids = [...new Set(cards.map(c => c.tripId))].sort();
  const scope = JSON.stringify([identity, ids]);
  const [result, setResult] = useState<{ identity: string; trips: Record<string, ParentJourneyTelemetry> }>({ identity, trips: {} });
  const cache = useRef<{ identity: string; trips: Record<string, ParentJourneyTelemetry> }>({ identity, trips: {} });
  useEffect(() => {
    const trips: Record<string, ParentJourneyTelemetry> = {};
    if (cache.current.identity === identity) for (const id of ids) {
      if (cache.current.trips[id]) trips[id] = cache.current.trips[id];
    }
    cache.current = { identity, trips };
  }, [scope, identity]);
  useActiveRefresh(scope, async ({ isCurrent, immediate }) => {
    if (!ids.length) return false;
    const entries = await Promise.all(ids.map(async id => {
      const previous = cache.current.identity === identity ? cache.current.trips[id] : undefined;
      const readDetail = immediate || !previous?.detail || Date.now() - (previous.metadataAt ?? 0) >= 20000;
      const [operation, incidents, detail] = await Promise.allSettled([
        mobileApiClient.getOperationalState(id),
        mobileApiClient.getTripIncidents(id),
        readDetail ? mobileApiClient.getMobileTripDetail(id) : Promise.resolve(previous?.detail),
      ]);
      if (!isCurrent()) return null;
      const denied = [operation, incidents, detail].some(r => r.status === 'rejected'
        && [401, 403, 404].includes((r.reason as { statusCode?: number })?.statusCode ?? 0));
      if (denied) return [id, { unavailable: true, operationUnavailable: true, incidentsUnavailable: true, detailUnavailable: true }] as const;
      return [id, {
        operation: operation.status === 'fulfilled' ? operation.value : previous?.operation,
        incidents: incidents.status === 'fulfilled' ? incidents.value : previous?.incidents,
        detail: detail.status === 'fulfilled' ? detail.value : previous?.detail,
        operationUnavailable: operation.status === 'rejected', incidentsUnavailable: incidents.status === 'rejected',
        detailUnavailable: detail.status === 'rejected',
        metadataAt: readDetail && detail.status === 'fulfilled' ? Date.now() : previous?.metadataAt,
        unavailable: false,
      }] as const;
    }));
    if (!isCurrent()) return;
    const trips: Record<string, ParentJourneyTelemetry> = {};
    for (const entry of entries) if (entry) trips[entry[0]] = entry[1];
    cache.current = { identity, trips };
    setResult({ identity, trips });
  }, 5000);
  const trips: Record<string, ParentJourneyTelemetry> = {};
  if (result.identity === identity) for (const id of ids) {
    if (result.trips[id]) trips[id] = result.trips[id];
  }
  return { trips, active };
}
