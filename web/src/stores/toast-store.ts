import { createStore } from 'zustand/vanilla';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';
export interface ToastOptions { title?: string; duration?: number }
export interface ToastItem { id: number; message: string; tone: ToastTone; duration: number; title?: string }

/** Ported from the reference toast store. UI-only, bounded, never persisted. */
export function createToastStore() {
  let nextId = 0;
  return createStore<{
    items: ToastItem[];
    show: (message: string, tone: ToastTone, options?: ToastOptions) => number | undefined;
    dismiss: (id: number) => void;
    clear: () => void;
  }>()((set, get) => ({
    items: [],
    show: (message, tone, options = {}) => {
      message = message.trim();
      if (!message) return;
      const title = options.title?.trim() || undefined;
      const duplicate = get().items.find(item => item.message === message && item.tone === tone && item.title === title);
      if (duplicate) return duplicate.id;
      const duration = options.duration ?? (tone === 'warning' ? Infinity : tone === 'error' ? 7000 : 4000);
      const item = { id: ++nextId, message, title, tone, duration };
      set(state => ({ items: [...state.items, item].slice(-3) }));
      return item.id;
    },
    dismiss: id => set(state => ({ items: state.items.filter(item => item.id !== id) })),
    clear: () => { if (get().items.length) set({ items: [] }); },
  }));
}

export const toastStore = createToastStore();
const show = (message: string, tone: ToastTone, options?: ToastOptions) => {
  // Never enqueue per-request messages in a server-side module singleton.
  if (typeof window === 'undefined') return;
  return toastStore.getState().show(message, tone, options);
};
export const toast = {
  dismiss: (id: number) => toastStore.getState().dismiss(id),
  dismissAll: () => toastStore.getState().clear(),
  success: (message: string, options?: ToastOptions) => show(message, 'success', options),
  error: (message: string, options?: ToastOptions) => show(message, 'error', options),
  warning: (message: string, options?: ToastOptions) => show(message, 'warning', options),
  info: (message: string, options?: ToastOptions) => show(message, 'info', options),
};
