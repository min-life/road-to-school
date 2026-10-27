import type { ComponentProps } from 'react';

/** No wrapper, column mapping, sorting or pagination is introduced. */
export function Table({ className = '', ...props }: ComponentProps<'table'>) {
  return <table {...props} className={`ui-table ${className}`} />;
}
