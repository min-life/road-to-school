'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import './lifecycle.css';

export function LifecycleDialog({ open, title, busy = false, onClose, children, footer }: {
  open: boolean; title: string; busy?: boolean; onClose: () => void; children: ReactNode; footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  if (!open) return null;
  return <dialog ref={ref} className="lifecycle-dialog" aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div className="lifecycle-dialog-panel">
      <header><h2 id={titleId}>{title}</h2><Button type="button" variant="ghost" size="icon" aria-label="Đóng" disabled={busy} onClick={onClose} autoFocus><X size={18} aria-hidden="true" /></Button></header>
      <div className="lifecycle-dialog-body">{children}</div>
      {footer && <footer>{footer}</footer>}
    </div>
  </dialog>;
}
