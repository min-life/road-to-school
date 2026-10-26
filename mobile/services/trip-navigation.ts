import { mobileApiClient } from './api-client';

export type LocationSource = 'LIVE' | 'TEST_AUTO' | 'TEST_JOYSTICK';
export interface Position { latitude: number; longitude: number }
export interface PositionSample extends Position { capturedAt: string; accuracyMeters?: number | null }
export interface LocationPoint extends Position { sequence: number; recordedAt: string; runId: string }
export interface Checkpoint { runId: string; enabled: boolean; activeSource: LocationSource; targetStopId: string | null; routeVersion: string }
export interface NavigationState {
  status: string; routeVersion: string; latestPosition: LocationPoint | null; freshness: 'NONE' | 'FRESH' | 'STALE';
  serverNow: string; canPublish: boolean; testMode: boolean; checkpoint: Checkpoint | null;
  controlRunId: string | null; nextSequence: number; publishIntervalMs: number;
}
export interface Instruction { interval: [number, number]; text: string; streetName: string; sign: number; distance: number }
export interface NavigationSegment {
  segmentVersion: string; routeVersion: string; targetStopId: string | null; geometry: string;
  instructions: Instruction[]; distanceMeters: number; durationSeconds: number; finished: boolean;
}
export interface HistoryPage { points: LocationPoint[]; nextCursor: number; snapshotMaxSequence: number; hasMore: boolean }

const path = (id: string) => `/trips/${encodeURIComponent(id)}`;
export const navigationApi = {
  state: (id: string) => mobileApiClient.request<NavigationState>(`${path(id)}/navigation`),
  session: (id: string, action: 'START' | 'RESUME' | 'STOP' | 'SWITCH', expectedRunId: string | null, source?: LocationSource) =>
    mobileApiClient.request<NavigationState>(`${path(id)}/navigation/session`, { method: 'PUT', body: JSON.stringify({ action, expectedRunId, source }) }),
  segment: (id: string, cp: Checkpoint, position: PositionSample, action: 'CURRENT' | 'ADVANCE') =>
    mobileApiClient.request<NavigationSegment>(`${path(id)}/navigation/segment`, { method: 'POST', body: JSON.stringify({
      action, runId: cp.runId, routeVersion: cp.routeVersion, expectedTargetStopId: cp.targetStopId, position,
    }) }, 0, 13000),
  publish: (id: string, cp: Checkpoint, sequence: number, sample: PositionSample) =>
    mobileApiClient.request<{ nextSequence: number }>(`${path(id)}/navigation/position`, { method: 'PUT', body: JSON.stringify({ runId: cp.runId, sequence, ...sample }) }),
  history: (id: string, afterSequence = 0, snapshotMaxSequence?: number) =>
    mobileApiClient.request<HistoryPage>(`${path(id)}/location-history?afterSequence=${afterSequence}${snapshotMaxSequence === undefined ? '' : `&snapshotMaxSequence=${snapshotMaxSequence}`}`),
};

export async function loadLocationHistory(id: string, isCurrent: () => boolean) {
  const points: LocationPoint[] = [];
  let cursor = 0, snapshot: number | undefined;
  do {
    const page = await navigationApi.history(id, cursor, snapshot);
    if (!isCurrent()) return null;
    points.push(...page.points);
    if (!page.hasMore) return points;
    if (page.nextCursor <= cursor) throw new Error('Không thể tải tiếp hành trình');
    cursor = page.nextCursor; snapshot = page.snapshotMaxSequence;
  } while (isCurrent());
  return null;
}
