'use client';

import { useState, type ReactNode } from 'react';
import * as Toast from '@radix-ui/react-toast';
import { useStore } from 'zustand';
import { CircleCheck, TriangleAlert, Info, X } from 'lucide-react';
import { toastStore, type ToastItem } from '@/stores/toast-store';
import './toast.css';

const icons = { success: CircleCheck, error: TriangleAlert, warning: TriangleAlert, info: Info };
const labels = { success: 'Thao tác thành công', error: 'Chưa hoàn tất thao tác', warning: 'Cần kiểm tra lại', info: 'Thông tin mới' };

function ToastMessage({ item }: { item: ToastItem }) {
  const [paused, setPaused] = useState(false);
  const Icon = icons[item.tone];
  return <Toast.Root className="rts-toast" data-tone={item.tone} data-paused={paused}
    duration={item.duration} type={item.tone === 'error' ? 'foreground' : 'background'}
    onPause={() => setPaused(true)} onResume={() => setPaused(false)}
    onOpenChange={open => { if (!open) toastStore.getState().dismiss(item.id); }}>
    <span className="rts-toast-icon"><Icon size={19} aria-hidden="true" /></span>
    <div className="rts-toast-content">
      <Toast.Title className="rts-toast-title">{item.title || labels[item.tone]}</Toast.Title>
      <Toast.Description className="rts-toast-message" title={item.message}>{item.message}</Toast.Description>
    </div>
    <Toast.Close className="rts-toast-close" aria-label="Đóng thông báo"><X size={16} aria-hidden="true" /></Toast.Close>
    {Number.isFinite(item.duration) && <div className="rts-toast-progress-track" aria-hidden="true"><div className="rts-toast-progress" style={{ animationDuration: `${item.duration}ms` }} /></div>}
  </Toast.Root>;
}

/** One viewport for the web app; survives navigation and stays above modal overlays. */
export default function ToastProvider({ children }: { children: ReactNode }) {
  const items = useStore(toastStore, state => state.items);
  return <Toast.Provider swipeDirection="right" label="Thông báo">
    {children}
    {items.map(item => <ToastMessage key={item.id} item={item} />)}
    <Toast.Viewport className="rts-toast-viewport" label="Thông báo ({hotkey})" />
  </Toast.Provider>;
}
