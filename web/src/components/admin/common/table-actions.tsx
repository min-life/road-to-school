'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { ContextLink } from './context-navigation';
import { Button } from '@/components/ui/button';
import './table-actions.css';

type RowAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
  danger?: boolean;
  warning?: boolean;
  disabled?: boolean;
  title?: string;
};
type MenuAction = { label: string; onClick: () => void; danger?: boolean; warning?: boolean; disabled?: boolean };

/** Callers own permission checks, destination URLs, confirmations and mutations. */
export function TableActions({ actions, more = [], label = 'Thao tác khác' }: {
  actions: RowAction[];
  more?: MenuAction[];
  label?: string;
}) {
  const menuId = useId();
  const showAll = actions.length + more.length <= 2;
  const visibleActions: RowAction[] = showAll ? [...actions, ...more] : actions;
  const menuActions = showAll ? [] : more;
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; maxHeight: number } | null>(null);
  const isOpen = position !== null && menuActions.length > 0;
  const close = (restoreFocus = false) => {
    setPosition(null);
    if (restoreFocus) trigger.current?.focus();
  };

  useLayoutEffect(() => {
    if (!isOpen || !trigger.current || !menu.current) return;
    const bounds = trigger.current.getBoundingClientRect();
    const naturalHeight = menu.current.scrollHeight + 2; // Include both borders.
    const below = Math.max(0, window.innerHeight - bounds.bottom - 18);
    const above = Math.max(0, bounds.top - 18);
    const opensBelow = below >= naturalHeight || below >= above;
    const maxHeight = opensBelow ? below : above;
    const height = Math.min(naturalHeight, maxHeight);
    setPosition({
      top: opensBelow ? bounds.bottom + 6 : bounds.top - height - 6,
      left: Math.max(12, Math.min(bounds.right - 200, window.innerWidth - 212)),
      maxHeight,
    });
  }, [isOpen, menuActions.length]);

  useEffect(() => {
    if (!isOpen) return;
    menu.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    const outside = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setPosition(null);
    };
    const dismiss = () => setPosition(null);
    const scroll = (event: Event) => { if (!menu.current?.contains(event.target as Node)) dismiss(); };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', scroll, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', scroll, true);
    };
  }, [isOpen]);

  const open = () => {
    const bounds = trigger.current?.getBoundingClientRect();
    if (!bounds) return;
    // Render for measurement; layout effect positions the real menu before paint.
    setPosition({ top: 12, left: 12, maxHeight: window.innerHeight - 24 });
  };
  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
    if (event.key === 'Tab') { close(true); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = [...(menu.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || [])];
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
      : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[index]?.focus();
  };

  return <div className="table-actions" onClick={event => event.stopPropagation()}>
    {visibleActions.map(action => action.href && !action.disabled
      ? <ContextLink key={action.label} href={action.href} title={action.title} className="ui-button" data-variant={action.danger ? 'danger' : action.primary ? 'primary' : 'outline'} data-tone={action.warning ? 'warning' : undefined} data-size="sm">{action.label}</ContextLink>
      : <Button key={action.label} type="button" size="sm" variant={action.danger ? 'danger' : action.primary ? 'primary' : 'outline'} data-tone={action.warning ? 'warning' : undefined} disabled={action.disabled} title={action.title} onClick={action.onClick}>{action.label}</Button>)}
    {menuActions.length > 0 && <Button ref={trigger} type="button" variant="outline" size="sm" className="table-actions-more" aria-label={label}
      aria-haspopup="menu" aria-expanded={isOpen} aria-controls={isOpen ? menuId : undefined}
      onClick={() => isOpen ? close(true) : open()} onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); open(); }
      }}><span aria-hidden="true">⋯</span></Button>}
    {isOpen && createPortal(<div ref={menu} id={menuId} role="menu" aria-label={label} className="table-actions-menu" style={position!}
      onKeyDown={onMenuKeyDown} onClick={event => event.stopPropagation()}>
      {menuActions.map(action => <button key={action.label} type="button" role="menuitem" disabled={action.disabled} data-danger={action.danger || undefined} data-tone={action.warning ? 'warning' : undefined}
        onClick={() => { close(true); action.onClick(); }}>{action.label}</button>)}
    </div>, document.body)}
  </div>;
}
