'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { useVisibleRefresh } from '@/hooks/use-visible-refresh';
import { getNotificationSummary, type NotificationSummary } from '@/lib/notifications';

const Context = createContext<{ summary: NotificationSummary | null; refresh: () => void }>({ summary: null, refresh: () => {} });
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const identity = JSON.stringify([user?.id, user?.role, user?.schoolId]);
  const [stored, setStored] = useState<{ identity: string; value: NotificationSummary } | null>(null);
  const refresh = useVisibleRefresh(`notifications:${identity}`, async ({ isCurrent }) => {
    if (!user) return false;
    try { const value = await getNotificationSummary(); if (isCurrent()) setStored({ identity, value }); }
    catch { if (isCurrent()) setStored(null); }
  }, 15000);
  return <Context.Provider value={{ summary: stored?.identity === identity ? stored.value : null, refresh }}>{children}</Context.Provider>;
}
export const useNotifications = () => useContext(Context);
