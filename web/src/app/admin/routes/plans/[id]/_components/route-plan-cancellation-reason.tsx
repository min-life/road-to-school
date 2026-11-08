'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import './route-plan-cancellation-reason.css';

export function RoutePlanCancellationReason({ reason }: { reason?: string | null }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const position = useCallback(() => {
    if (!trigger.current || !popup.current) return;
    const rect = trigger.current.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) { popup.current.hidePopover(); return; }
    const width = Math.min(360, window.innerWidth - 24);
    const below = window.innerHeight - rect.bottom - 20;
    const above = rect.top - 20;
    const useAbove = below < 200 && above > below;
    popup.current.style.width = `${width}px`;
    popup.current.style.maxHeight = `${Math.min(320, Math.max(0, useAbove ? above : below))}px`;
    popup.current.style.left = `${Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))}px`;
    popup.current.style.top = `${useAbove ? Math.max(12, rect.top - popup.current.offsetHeight - 8) : rect.bottom + 8}px`;
  }, []);
  useEffect(() => {
    if (!open) return;
    const reposition = (event: Event) => {
      if (event.target instanceof Node && popup.current?.contains(event.target)) return;
      position();
    };
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => { window.removeEventListener('resize', reposition); window.removeEventListener('scroll', reposition, true); };
  }, [open, position]);
  if (!reason?.trim()) return null;
  return <>
    <Button ref={trigger} type="button" variant="outline" size="sm" popoverTarget={id}
      aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={position}>
      <Info size={14} aria-hidden="true" />Lý do hủy
    </Button>
    <section ref={popup} id={id} popover="auto" role="dialog" aria-labelledby={`${id}-title`} className="route-plan-cancellation-popover"
      onToggle={event => {
        const visible = event.newState === 'open'; setOpen(visible);
        if (visible) { position(); popup.current?.querySelector('button')?.focus({ preventScroll: true }); }
      }}
      onKeyDownCapture={event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); popup.current?.hidePopover(); trigger.current?.focus({ preventScroll: true }); }
      }}>
      <header><h2 id={`${id}-title`}>Lý do hủy phương án</h2>
        <Button type="button" variant="ghost" size="icon" aria-label="Đóng lý do hủy"
          onClick={() => { popup.current?.hidePopover(); trigger.current?.focus({ preventScroll: true }); }}><X size={16} aria-hidden="true" /></Button>
      </header>
      <p tabIndex={0}>{reason}</p>
    </section>
  </>;
}
