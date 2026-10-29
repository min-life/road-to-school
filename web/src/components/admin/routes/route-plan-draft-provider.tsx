'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useStore } from 'zustand';
import { createRoutePlanDraftStore, type RoutePlanDraftState } from '@/stores/routes/route-plan-draft-store';

const Context = createContext<ReturnType<typeof createRoutePlanDraftStore> | null>(null);

export function RoutePlanDraftProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createRoutePlanDraftStore);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}

export function useRoutePlanDraft<Value>(selector: (state: RoutePlanDraftState) => Value): Value {
  const store = useContext(Context);
  if (!store) throw new Error('RoutePlanDraftProvider is required.');
  return useStore(store, selector);
}
