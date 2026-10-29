'use client';

import { cloneElement, useId, type ComponentProps, type ReactElement, type ReactNode } from 'react';
import { Button } from './button';
import './filter-toolbar.css';

type FilterToolbarProps = ComponentProps<'div'> & {
  onReset?: () => void;
  hasActiveFilters?: boolean;
};

export function FilterToolbar({ className = '', children, onReset, hasActiveFilters, ...props }: FilterToolbarProps) {
  return <div role="group" aria-label="Bộ lọc" {...props} className={`ui-filter-toolbar ui-card ${className}`}>
    {children}
    {hasActiveFilters && onReset && <Button type="button" variant="ghost" className="ui-filter-reset" onClick={onReset}>Xóa bộ lọc</Button>}
  </div>;
}

/** A visible label and a single control; custom controls must forward id to their trigger. */
export function FilterField({ label, children, icon, grow = false }: {
  label: string;
  children: ReactElement<{ id?: string }>;
  icon?: ReactNode;
  grow?: boolean;
}) {
  const generatedId = useId();
  const id = children.props.id || generatedId;
  return <div className={`ui-filter-field${grow ? ' ui-filter-field-grow' : ''}`}>
    <label className="ui-filter-label" htmlFor={id}>{label}</label>
    <div className={`ui-filter-control${icon ? ' ui-filter-control-search' : ''}`}>
      {cloneElement(children, { id })}
      {icon && <span className="ui-filter-icon" aria-hidden="true">{icon}</span>}
    </div>
  </div>;
}
