'use client';

import { useState } from 'react';
import { apiClient, ApiError } from '@/lib/api-client';
import type { TripAttendanceRoster } from '@/lib/types';
import { useVisibleRefresh } from '@/hooks/use-visible-refresh';

/** Read-only roster, independent of GPS failures and scoped to the authenticated trip view. */
export function useTripAttendance(tripId: string, identity: string, enabled: boolean) {
  const [stored, setStored] = useState<{ identity: string; data: TripAttendanceRoster; updatedAt: string } | null>(null);
  const [failure, setFailure] = useState<{ identity: string; message: string } | null>(null);
  const [fetchingScope, setFetchingScope] = useState<string | null>(null);
  const refresh = useVisibleRefresh(`trip-attendance:${identity}`, async ({ isCurrent }) => {
    if (!enabled) return false;
    setFetchingScope(identity);
    try {
      const data = await apiClient.getTripAttendance(tripId);
      if (!isCurrent()) return;
      if (data.tripId !== tripId) throw new Error('Dữ liệu điểm danh không khớp chuyến đang xem.');
      setStored({ identity, data, updatedAt: new Date().toISOString() });
      setFailure(null);
    } catch (reason) {
      if (!isCurrent()) return;
      const denied = reason instanceof ApiError && [401, 403, 404].includes(reason.statusCode);
      if (denied) setStored(null);
      setFailure({ identity, message: reason instanceof Error ? reason.message : 'Không thể tải danh sách điểm danh.' });
      if (denied) return false;
    } finally {
      if (isCurrent()) setFetchingScope(null);
    }
  }, 15000);
  const current = enabled && stored?.identity === identity ? stored : null;
  const error = enabled && failure?.identity === identity ? failure.message : null;
  return { data: current?.data ?? null, updatedAt: current?.updatedAt ?? null, error, refresh, isRefreshing: enabled && fetchingScope === identity };
}
