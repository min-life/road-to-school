import type { ComponentProps, CSSProperties } from 'react';
import './table.css';

/** Native table; callers retain overflow wrappers, columns and all data behavior. */
export function Table({ className = '', minWidth, style, ...props }: ComponentProps<'table'> & { minWidth?: number }) {
  return <table {...props} style={{ '--table-min-width': minWidth ? `${minWidth}px` : undefined, ...style } as CSSProperties} className={`ui-table ${className}`} />;
}
