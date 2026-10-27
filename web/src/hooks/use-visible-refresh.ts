'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { createRefreshLoop, type RefreshContext } from '../lib/refresh-loop';

export function useVisibleRefresh(
  identity: string,
  task: (context: RefreshContext) => Promise<boolean | void>,
  intervalMs = 15000,
) {
  const taskRef = useRef(task);
  useLayoutEffect(() => { taskRef.current = task; }, [task]);
  const loopRef = useRef<ReturnType<typeof createRefreshLoop> | null>(null);
  useLayoutEffect(() => { loopRef.current?.stop(); }, [identity, intervalMs]);
  useEffect(() => {
    const loop = createRefreshLoop(context => taskRef.current(context), intervalMs);
    loopRef.current = loop;
    const visibility = () => loop.setActive(document.visibilityState === 'visible');
    const refresh = () => { if (document.visibilityState === 'visible') loop.refresh(); };
    visibility();
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    window.addEventListener('rts:mutation', refresh);
    return () => {
      loop.stop();
      if (loopRef.current === loop) loopRef.current = null;
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      window.removeEventListener('rts:mutation', refresh);
    };
  }, [identity, intervalMs]);
  return useCallback(() => loopRef.current?.refresh(), []);
}
