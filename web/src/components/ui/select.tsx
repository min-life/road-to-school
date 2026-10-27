import type { ComponentProps } from 'react';

/** Native select keeps its existing value and onChange contract. */
export function Select({ className = '', ...props }: ComponentProps<'select'>) {
  return <select {...props} className={`ui-select ${className}`} />;
}
