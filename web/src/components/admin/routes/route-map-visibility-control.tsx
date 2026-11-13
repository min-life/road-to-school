'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Layers } from 'lucide-react';
import './route-map-visibility-control.css';

export interface RouteVisibilityOption {
  id: string;
  name: string;
  direction: string;
  vehiclePlate?: string | null;
  color: string;
}

/** Presentation only: these checkboxes never select an assignment target. */
export function RouteMapVisibilityControl({ routes, hiddenIds, onToggle, onShowAll, onHideAll }: {
  routes: RouteVisibilityOption[];
  hiddenIds: Set<string>;
  onToggle: (id: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
}) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const shownCount = routes.filter(route => !hiddenIds.has(route.id)).length;
  const query = search.trim().toLocaleLowerCase('vi');
  const filtered = routes.filter(route => `${route.name} ${route.vehiclePlate ?? ''}`.toLocaleLowerCase('vi').includes(query));

  const positionPopover = useCallback(() => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(340, window.innerWidth - 24);
    const below = window.innerHeight - rect.bottom - 20;
    const above = rect.top - 20;
    const useAbove = below < 220 && above > below;
    const height = Math.min(460, Math.max(120, useAbove ? above : below));
    popover.style.width = `${width}px`;
    popover.style.maxHeight = `${height}px`;
    popover.style.left = `${Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))}px`;
    popover.style.top = `${useAbove ? Math.max(12, rect.top - Math.min(height, popover.scrollHeight) - 8) : rect.bottom + 8}px`;
  }, []);

  useEffect(() => {
    if (!open) return;
    const reposition = (event: Event) => {
      if (event.type === 'scroll' && event.target instanceof Node && popoverRef.current?.contains(event.target)) return;
      positionPopover();
    };
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    const observer = new ResizeObserver(positionPopover);
    if (popoverRef.current) observer.observe(popoverRef.current);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, positionPopover]);

  return <div className="route-map-visibility">
    <button ref={triggerRef} type="button" className="route-map-visibility-trigger" popoverTarget={id}
      aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={positionPopover}>
      <Layers size={15} aria-hidden="true" />Hiển thị tuyến ({shownCount}/{routes.length})<ChevronDown size={14} aria-hidden="true" />
    </button>
    <div ref={popoverRef} id={id} popover="auto" className="route-map-visibility-popover" role="dialog" aria-labelledby={`${id}-title`}
      onToggle={event => {
        const isOpen = event.newState === 'open';
        setOpen(isOpen);
        if (isOpen) {
          positionPopover();
          popoverRef.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus({ preventScroll: true });
        }
      }}>
      <header><h2 id={`${id}-title`}>Các tuyến trên bản đồ</h2>
        <button type="button" popoverTarget={id} popoverTargetAction="hide" aria-label="Đóng bộ chọn tuyến">×</button>
      </header>
      <div className="route-map-visibility-tools">
        <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm tuyến, biển số xe…" aria-label="Tìm tuyến hoặc biển số xe" />
        <div><button type="button" onClick={onShowAll} disabled={shownCount === routes.length}>Chọn tất cả</button>
          <button type="button" onClick={onHideAll} disabled={shownCount === 0}>Bỏ chọn tất cả</button>
          <span aria-live="polite">{shownCount}/{routes.length} tuyến</span>
        </div>
      </div>
      <div className="route-map-visibility-options">
        {(['TO_SCHOOL', 'TO_PARKING'] as const).map(direction => {
          const options = filtered.filter(route => route.direction === direction);
          return options.length > 0 && <fieldset key={direction}><legend>{direction === 'TO_SCHOOL' ? 'Chiều đi' : 'Chiều về'}</legend>
            {options.map(route => <label key={route.id}>
              <input type="checkbox" checked={!hiddenIds.has(route.id)} onChange={() => onToggle(route.id)} />
              <i style={{ backgroundColor: route.color }} aria-hidden="true" />
              <span><strong>{route.name}</strong>{route.vehiclePlate && <small>Xe {route.vehiclePlate}</small>}</span>
            </label>)}
          </fieldset>;
        })}
        {filtered.length === 0 && <p>Không tìm thấy tuyến.</p>}
      </div>
    </div>
  </div>;
}
