import { useCallback, useLayoutEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { createRefreshLoop, type RefreshContext } from '../utils/refresh-loop';

export function useActiveRefresh(
  identity: string,
  task: (context: RefreshContext) => Promise<boolean | void>,
  intervalMs: number,
) {
  const taskRef = useRef(task);
  useLayoutEffect(() => { taskRef.current = task; }, [task]);
  const loopRef = useRef<ReturnType<typeof createRefreshLoop> | null>(null);
  const mutating = useRef(false);
  useLayoutEffect(() => { loopRef.current?.stop(); }, [identity, intervalMs]);

  useFocusEffect(useCallback(() => {
    const loop = createRefreshLoop(context => taskRef.current(context), intervalMs);
    loopRef.current = loop;
    loop.setActive(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', state => loop.setActive(state === 'active'));
    return () => {
      loop.stop();
      if (loopRef.current === loop) loopRef.current = null;
      subscription.remove();
    };
  }, [identity, intervalMs]));

  const refresh = useCallback(() => loopRef.current?.refresh(), []);
  const mutate = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    if (mutating.current) throw new Error('Đang xử lý thao tác trước');
    mutating.current = true;
    const loop = loopRef.current;
    loop?.pause();
    try { return await operation(); }
    finally {
      mutating.current = false;
      if (loopRef.current === loop) loop?.resume();
    }
  }, []);
  return { refresh, mutate };
}
