import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { navigationResumeStorage } from '../services/navigation-resume-storage';
import { navigationApi } from '../services/trip-navigation';

/** Restore the active Trip Detail once on launch; never create a second GPS engine. */
export function useNavigationReopen(userId: string | undefined, role: string | undefined, ready: boolean) {
  const checked = useRef<string | null>(null);
  const [foregroundRun, setForegroundRun] = useState(0);
  const router = useRouter(), segments = useSegments();
  const inAuth = segments[0] === '(auth)', inTrip = segments[0] === 'trip';
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') { checked.current = null; setForegroundRun(n => n + 1); }
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!userId) { checked.current = null; return; }
    if (!ready || role !== 'DRIVER' || inAuth || checked.current === userId) return;
    checked.current = userId;
    let cancelled = false;
    void (async () => {
      try {
        const id = await navigationResumeStorage.get(userId);
        if (!id || cancelled) return;
        const state = await navigationApi.state(id);
        if (cancelled) return;
        if (state.status === 'IN_PROGRESS' && state.canPublish && state.checkpoint?.enabled) {
          if (!inTrip) router.push({ pathname: '/trip/[id]', params: { id } });
        } else await navigationResumeStorage.clear(userId);
      } catch { checked.current = null; /* A subsequent foreground/auth retry may restore; never fabricate offline state. */ }
    })();
    return () => { cancelled = true; };
  }, [userId, role, ready, router, inAuth, inTrip, foregroundRun]);
}
