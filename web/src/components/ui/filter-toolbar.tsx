import type { ComponentProps } from 'react';

export function FilterToolbar({ className = '', ...props }: ComponentProps<'div'>) {
  return <div {...props} className={`ui-filter-toolbar ui-card ${className}`} />;
}
