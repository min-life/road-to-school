import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { displayDate, vietnamDate } from '@/lib/school-lifecycle';
import '../common/lifecycle.css';

export function SchoolEffectiveDateField({ id, label, value, max, disabled, onChange }: {
  id: string;
  label: string;
  value: string;
  max: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const popoverId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const today = vietnamDate();
  const isAvailable = today <= max;
  const isValid = isAvailable && value >= today && value <= max;
  const dateLabel = value === today ? `Hôm nay · ${displayDate(value)}`
    : value === vietnamDate(1) ? `Ngày mai · ${displayDate(value)}` : displayDate(value);
  const firstDay = new Date(`${today}T00:00:00`);
  const lastDay = new Date(`${max}T00:00:00`);
  const selected = isValid ? new Date(`${value}T00:00:00`) : undefined;

  const placePopover = useCallback(() => {
    const popover = popoverRef.current;
    const trigger = triggerRef.current;
    if (!popover || !trigger) return;
    const gutter = 12;
    const spacing = 6;
    const bounds = trigger.getBoundingClientRect();
    const below = window.innerHeight - bounds.bottom - gutter - spacing;
    const above = bounds.top - gutter - spacing;
    const placeAbove = below < popover.scrollHeight && above > below;
    popover.style.maxHeight = `${Math.max(0, placeAbove ? above : below)}px`;
    popover.style.left = `${Math.max(gutter, Math.min(bounds.right - popover.offsetWidth, window.innerWidth - popover.offsetWidth - gutter))}px`;
    popover.style.top = `${placeAbove ? bounds.top - spacing - popover.offsetHeight : bounds.bottom + spacing}px`;
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    placePopover();
    const redraw = (event: Event) => {
      if (event.target instanceof Node && popoverRef.current?.contains(event.target)) return;
      placePopover();
    };
    window.addEventListener('resize', redraw);
    window.addEventListener('scroll', redraw, true);
    return () => {
      window.removeEventListener('resize', redraw);
      window.removeEventListener('scroll', redraw, true);
    };
  }, [open, placePopover]);

  return <div className="school-effective-date-row">
    <span id={`${id}-label`} className="school-effective-date-label">{label}</span>
    <div className="school-effective-date-actions">
      {isAvailable && value > today && <button type="button" className="school-effective-date-link"
        disabled={disabled} onClick={() => {
          onChange(today);
          triggerRef.current?.focus({ preventScroll: true });
        }}>Về hôm nay</button>}
      <button id={id} ref={triggerRef} type="button" className="school-effective-date-trigger"
        aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="dialog" aria-expanded={open} aria-controls={popoverId}
        data-invalid={!isValid || undefined}
        aria-describedby={!isValid ? `${id}-error` : undefined}
        popoverTarget={popoverId} disabled={disabled || !isAvailable}>
        <CalendarDays size={16} aria-hidden="true" />
        <span id={`${id}-value`}>{dateLabel}</span>
      </button>
    </div>
    {!isValid && <p id={`${id}-error`} className="school-effective-date-error">
      {isAvailable ? `Chọn ngày từ hôm nay đến ${displayDate(max)}.` : 'Hợp đồng hiện tại không còn ngày áp dụng.'}
    </p>}
    <div ref={popoverRef} id={popoverId} popover="auto" role="dialog" aria-labelledby={`${id}-label`}
      className="lifecycle-calendar-popover" onToggle={event => setOpen(event.newState === 'open')}>
      {open && isAvailable && <Calendar mode="single" showLunar={false} autoFocus required
        defaultMonth={selected ?? firstDay} today={firstDay} startMonth={firstDay} endMonth={lastDay}
        selected={selected} disabled={{ before: firstDay, after: lastDay }}
        onSelect={day => {
          if (!day) return;
          const date = [day.getFullYear(), day.getMonth() + 1, day.getDate()]
            .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, '0')).join('-');
          if (date < today || date > max) return;
          onChange(date);
          popoverRef.current?.hidePopover();
          triggerRef.current?.focus({ preventScroll: true });
        }} />}
    </div>
  </div>;
}
