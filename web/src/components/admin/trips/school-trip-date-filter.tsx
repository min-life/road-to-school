'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { displayDate } from '@/lib/school-lifecycle';
import '../common/lifecycle.css';

function localDay(value?: string) {
  if (!value) return undefined;
  const day = new Date(`${value}T00:00:00`);
  return Number.isNaN(day.getTime()) ? undefined : day;
}

export function SchoolTripDateFilter({ id, label, value, min, max, error, onChange }: {
  id: string; label: string; value: string; min?: string; max?: string; error?: string;
  onChange: (date: string) => void;
}) {
  const popupId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const firstDay = localDay(min);
  const lastDay = localDay(max);
  const selected = localDay(value);
  const initialMonth = min && value < min ? firstDay : max && value > max ? lastDay : selected;

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      if (!trigger.current || !popup.current) return;
      const bounds = trigger.current.getBoundingClientRect();
      const panel = popup.current;
      const below = window.innerHeight - bounds.bottom - 18;
      const above = bounds.top - 18;
      const placeAbove = below < panel.scrollHeight && above > below;
      panel.style.maxHeight = `${Math.max(0, placeAbove ? above : below)}px`;
      panel.style.left = `${Math.max(12, Math.min(bounds.left, window.innerWidth - panel.offsetWidth - 12))}px`;
      panel.style.top = `${placeAbove ? bounds.top - panel.offsetHeight - 6 : bounds.bottom + 6}px`;
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  return <div>
    <Button id={id} ref={trigger} type="button" variant="outline" popoverTarget={popupId}
      aria-label={`${label}, ${value ? displayDate(value) : 'chọn ngày'}`}
      aria-haspopup="dialog" aria-expanded={open} aria-controls={popupId}
      aria-invalid={!!error || undefined} aria-describedby={error ? `${id}-error` : undefined}>
      <span>{value ? displayDate(value) : 'dd/mm/yyyy'}</span>
      <CalendarDays size={16} aria-hidden="true" />
    </Button>
    {error && <p id={`${id}-error`} role="alert" className="school-trip-date-error">{error}</p>}
    <div id={popupId} ref={popup} popover="auto" role="dialog" aria-label={label}
      className="lifecycle-calendar-popover" onToggle={event => setOpen(event.newState === 'open')}>
      {open && <Calendar mode="single" required autoFocus showLunar={false}
        defaultMonth={initialMonth ?? firstDay} selected={selected} startMonth={firstDay} endMonth={lastDay}
        disabled={[...(firstDay ? [{ before: firstDay }] : []), ...(lastDay ? [{ after: lastDay }] : [])]}
        onSelect={day => {
          const date = [day.getFullYear(), day.getMonth() + 1, day.getDate()]
            .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, '0')).join('-');
          onChange(date);
          popup.current?.hidePopover();
          trigger.current?.focus({ preventScroll: true });
        }} />}
    </div>
  </div>;
}
