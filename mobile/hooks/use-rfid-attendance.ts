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
  const [busyId, setBusyId] = useState<string | null>(null),
    [lastEvent, setLastEvent] = useState<RfidAttendanceEvent | null>(null);
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
    failures = useRef(0),
    receivedAt = useRef(0);
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
    setLastEvent(null);
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
        receivedAt.current = Date.now();
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
  async function action(
    event: RfidAttendanceEvent,
    kind: 'confirm' | 'dismiss',
  ) {
    if (!active.current || blocked.current || locked.current) return;
    if (held && (kind !== 'confirm' || held.event.scanId !== event.scanId))
      return;
    locked.current = true;
    setBusyId(event.scanId);
    setMessage('');
    const version = generation.current;
    const current = () =>
      active.current && mounted.current && version === generation.current;
    try {
      const result = await refresh.mutate(() =>
        runMutation(() => rfidAttendanceApi[kind](tripId, event.scanId)),
      );
      if (!current()) return;
      setLastEvent(result);
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
      else if ((e as { statusCode?: number })?.statusCode === 410) {
        setHeld(null);
        setLastEvent({ ...event, state: 'EXPIRED', current: false });
      } else if (kind === 'confirm' && rfidResultUnknown(e))
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
    lastEvent,
    view,
    page,
    serverNow: data
      ? new Date(data.serverTime).getTime() +
        Math.max(0, Date.now() - receivedAt.current)
      : Date.now(),
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
    confirm: (event: RfidAttendanceEvent) => action(event, 'confirm'),
    dismiss: (event: RfidAttendanceEvent) => action(event, 'dismiss'),
  };
}
