import type { ComponentProps } from 'react';

/** Status labels and domain color mapping remain with the caller. */
export function Badge({ className = '', ...props }: ComponentProps<'span'>) {
  return <span {...props} className={`ui-badge ${className}`} />;
}
