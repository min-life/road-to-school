import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { onboardingStorage } from '@/services/onboarding-storage';

interface OnboardingState {
  ready: boolean;
  completed: boolean;
  saving: boolean;
  error: string | null;
  complete: () => Promise<void>;
  continueWithoutSaving: () => void;
}

const OnboardingContext = createContext<OnboardingState | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void onboardingStorage.isCompleted().then(value => {
      if (!cancelled) { setCompleted(value); setReady(true); }
    });
    return () => { cancelled = true; };
  }, []);

  const complete = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    setError(null);
    try {
      await onboardingStorage.complete();
      setCompleted(true);
    } catch {
      setError('Chưa lưu được lựa chọn trên thiết bị. Bạn có thể thử lại hoặc tiếp tục.');
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }, []);

  const continueWithoutSaving = useCallback(() => {
    if (!pending.current) setCompleted(true);
  }, []);

  return (
    <OnboardingContext.Provider value={{ ready, completed, saving, error, complete, continueWithoutSaving }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error('useOnboarding must be used within OnboardingProvider');
  return value;
}
