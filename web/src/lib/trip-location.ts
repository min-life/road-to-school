import { apiClient } from './api-client';

import type { RecordedPoint } from './trip-location-history';
export { splitRecordedHistory, type RecordedPoint, type VehiclePosition } from './trip-location-history';
export interface TripLocationState { status: string; latestPosition: RecordedPoint | null; freshness: 'NONE' | 'FRESH' | 'STALE'; serverNow: string }
interface HistoryPage { points: RecordedPoint[]; nextCursor: number; snapshotMaxSequence: number; hasMore: boolean }
export const getTripLocation = (id: string) => apiClient.request<TripLocationState>(`/trips/${encodeURIComponent(id)}/navigation`);
export async function getRecordedHistory(id: string, isCurrent: () => boolean) {
  const points: RecordedPoint[] = [];
  let after = 0, boundary: number | undefined;
  do {
    const page = await apiClient.request<HistoryPage>(`/trips/${encodeURIComponent(id)}/location-history?afterSequence=${after}${boundary === undefined ? '' : `&snapshotMaxSequence=${boundary}`}`);
    if (!isCurrent()) return null;
    points.push(...page.points);
    if (!page.hasMore) return points;
    if (page.nextCursor <= after) throw new Error('Không thể tải tiếp hành trình');
    after = page.nextCursor; boundary = page.snapshotMaxSequence;
  } while (isCurrent());
  return null;
}
