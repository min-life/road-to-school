import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { otpCooldownDeadline, otpCooldownSecondsLeft } from '@/utils/leave-otp-cooldown';

/** In-memory waits scoped exactly as Leave OTP: actor + child (staff: actor only). */
export function useLeaveOtpCooldown(scope: string) {
  const [deadlines, setDeadlines] = useState<Record<string, number>>({});
  const [, setTick] = useState(0);
  const deadline = deadlines[scope] ?? 0;
  const remainingSeconds = otpCooldownSecondsLeft(deadline, Date.now());

  useFocusEffect(useCallback(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => { if (timer !== undefined) clearInterval(timer); timer = undefined; };
    const update = () => {
      setTick(value => value + 1);
      if (otpCooldownSecondsLeft(deadline, Date.now()) === 0) stop();
    };
    const activate = (state: string | null | undefined) => {
      stop();
      update();
      if (state === 'active' && otpCooldownSecondsLeft(deadline, Date.now()) > 0) {
        timer = setInterval(update, 1000);
      }
    };
    activate(AppState.currentState);
    const subscription = AppState.addEventListener('change', activate);
    return () => { stop(); subscription.remove(); };
  }, [deadline]));

  // The callback captures the request's scope, even if the user switches child meanwhile.
  const start = useCallback((seconds: number) => {
    const until = otpCooldownDeadline(seconds, Date.now());
    if (until === null) return false;
    setDeadlines(current => ({ ...current, [scope]: until }));
    return true;
  }, [scope]);

  return { remainingSeconds, start };
}
