import { createStore } from 'zustand/vanilla';
import type { StopServiceOverride } from '@/lib/types';

export interface RoutePlanDraft {
  selectedStudentIds: Set<string>;
  selectedVehicleIds: Set<string>;
  studentSearch: string;
  studentPickerTab: 'ELIGIBLE' | 'INELIGIBLE';
  vehiclePickerTab: 'AVAILABLE' | 'UNAVAILABLE';
  vehicleSearch: string;
  maxRouteDurationMinutes: number | undefined;
  defaultStopServiceSeconds: number;
  stopServiceOverrides: StopServiceOverride[];
  showOverridesAccordion: boolean;
  focusPoint: { latitude: number; longitude: number; zoom?: number } | null;
  activePreviewTab: 'OUTBOUND' | 'RETURN' | 'STUDENTS';
  activeRouteIndex: number;
}

type Update<T> = T | ((previous: T) => T);
type DraftActions = {
  [Key in keyof RoutePlanDraft as `set${Capitalize<Key>}`]: (update: Update<RoutePlanDraft[Key]>) => void;
};
export type RoutePlanDraftState = RoutePlanDraft & DraftActions;

/** A new store per mounted workflow. No module singleton, persistence or API calls. */
export function createRoutePlanDraftStore() {
  return createStore<RoutePlanDraftState>()((set, get) => {
    const setter = <Key extends keyof RoutePlanDraft>(key: Key) => (update: Update<RoutePlanDraft[Key]>) => {
      const previous = get()[key];
      const value = typeof update === 'function'
        ? (update as (previous: RoutePlanDraft[Key]) => RoutePlanDraft[Key])(previous)
        : update;
      if (!Object.is(previous, value)) set({ [key]: value } as Pick<RoutePlanDraftState, Key>);
    };

    return {
      selectedStudentIds: new Set<string>(),
      selectedVehicleIds: new Set<string>(),
      studentSearch: '', studentPickerTab: 'ELIGIBLE',
      vehicleSearch: '', vehiclePickerTab: 'AVAILABLE',
      maxRouteDurationMinutes: 60, defaultStopServiceSeconds: 60,
      stopServiceOverrides: [], showOverridesAccordion: false, focusPoint: null,
      activePreviewTab: 'OUTBOUND', activeRouteIndex: 0,
      setSelectedStudentIds: setter('selectedStudentIds'),
      setSelectedVehicleIds: setter('selectedVehicleIds'),
      setStudentSearch: setter('studentSearch'),
      setStudentPickerTab: setter('studentPickerTab'),
      setVehiclePickerTab: setter('vehiclePickerTab'),
      setVehicleSearch: setter('vehicleSearch'),
      setMaxRouteDurationMinutes: setter('maxRouteDurationMinutes'),
      setDefaultStopServiceSeconds: setter('defaultStopServiceSeconds'),
      setStopServiceOverrides: setter('stopServiceOverrides'),
      setShowOverridesAccordion: setter('showOverridesAccordion'),
      setFocusPoint: setter('focusPoint'),
      setActivePreviewTab: setter('activePreviewTab'),
      setActiveRouteIndex: setter('activeRouteIndex'),
    };
  });
}
