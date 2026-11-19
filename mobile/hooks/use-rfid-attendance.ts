import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useActiveRefresh } from './use-active-refresh';
import {
  rfidAttendanceApi,
  type RfidAttendanceEvent,
  type RfidAttendanceList,
} from '../services/rfid-attendance';
import {
  isRfidPending,
  rfidError,
  rfidOutcome,
  rfidResultUnknown,
} from '../utils/rfid-attendance';

export type RfidMutation = <T>(operation: () => Promise<T>) => Promise<T>;
export function useRfidAttendance(
  identity: string,
  tripId: string,
  runMutation: RfidMutation,
  onUpdated: () => void,
) {
  const [view, setView] = useState<'queue' | 'history'>('queue'),
    [page, setPage] = useState(1);
  const [data, setData] = useState<RfidAttendanceList | null>(null),
    [loading, setLoading] = useState(true);
  const [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [denied, setDenied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [held, setHeld] = useState<{
    event: RfidAttendanceEvent;
    unknown: boolean;
  } | null>(null);
  const active = useRef(false),
    mounted = useRef(false),
    generation = useRef(0),
    locked = useRef(false),
    blocked = useRef(false);
  const retryAt = useRef(0),
    failures = useRef(0);
  const latestApplied = useRef<string | null>(null);
  const updateRef = useRef(onUpdated);
  useLayoutEffect(() => {
    updateRef.current = onUpdated;
  }, [onUpdated]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current = false;
      generation.current++;
    };
  }, []);
  useFocusEffect(
    useCallback(() => {
      generation.current++;
      active.current = AppState.currentState === 'active';
      const subscription = AppState.addEventListener('change', (state) => {
        generation.current++;
        active.current = state === 'active';
      });
      return () => {
        active.current = false;
        generation.current++;
        subscription.remove();
      };
    }, [identity]),
  );
  const revokeAccess = () => {
    blocked.current = true;
    setDenied(true);
    setData(null);
    setHeld(null);
  };
  const scope = JSON.stringify([identity, view, page]);
  const refresh = useActiveRefresh(
    scope,
    async ({ isCurrent }) => {
      if (blocked.current) return false;
      if (Date.now() < retryAt.current) return;
      try {
        const result = await rfidAttendanceApi.list(tripId, view, page);
        if (!isCurrent()) return;
        setData(result);
        const applied = result.data.find(item => item.state === 'APPLIED' && item.current);
        if (view === 'queue' && page === 1 && applied && applied.scanId !== latestApplied.current) {
          latestApplied.current = applied.scanId;
          updateRef.current();
        }
        setError('');
        setLoading(false);
        failures.current = 0;
      } catch (e) {
        if (!isCurrent()) return;
        setError(rfidError(e));
        setLoading(false);
        if (
          [401, 403, 404].includes(
            (e as { statusCode?: number })?.statusCode ?? 0,
          )
        ) {
          revokeAccess();
          return false;
        }
        retryAt.current =
          Date.now() +
          Math.min(15000, 1000 * 2 ** Math.min(++failures.current, 4));
      }
    },
    2000,
  );
  async function checkResult(event: RfidAttendanceEvent) {
    if (!active.current || blocked.current || locked.current) return;
    if (!isRfidPending(event.state) || (held && held.event.scanId !== event.scanId)) return;
    locked.current = true;
    setBusyId(event.scanId);
    setMessage('');
    const version = generation.current;
    const current = () =>
      active.current && mounted.current && version === generation.current;
    try {
      const result = await refresh.mutate(() =>
        runMutation(() => rfidAttendanceApi.checkResult(tripId, event.scanId)),
      );
      if (!current()) return;
      setMessage(
        [result.studentName, rfidOutcome(result)].filter(Boolean).join(' · '),
      );
      setHeld(
        isRfidPending(result.state) ? { event: result, unknown: false } : null,
      );
      updateRef.current();
    } catch (e) {
      if (!current()) return;
      setMessage(rfidError(e));
      if (
        [401, 403, 404].includes(
          (e as { statusCode?: number })?.statusCode ?? 0,
        )
      )
        revokeAccess();
      else if ((e as { statusCode?: number })?.statusCode === 410)
        setHeld(null);
      else if (rfidResultUnknown(e))
        setHeld({ event, unknown: true });
      updateRef.current();
    } finally {
      locked.current = false;
      if (mounted.current) setBusyId(null);
    }
  }
  const changePage = (next: number) => {
    if (!locked.current) {
      setPage(Math.max(1, next));
      setLoading(true);
    }
  };
  return {
    data,
    loading,
    error,
    message,
    denied,
    busyId,
    held,
    view,
    page,
    clearMessage: () => setMessage(''),
    retry: refresh.refresh,
    setPage: changePage,
    setView: (next: 'queue' | 'history') => {
      if (!locked.current) {
        setView(next);
        setPage(1);
        setLoading(true);
      }
    },
    checkResult,
  };
}
