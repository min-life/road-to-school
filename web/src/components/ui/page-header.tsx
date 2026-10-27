import type { ComponentProps } from 'react';

export function PageHeader({ className = '', ...props }: ComponentProps<'div'>) {
  return <div {...props} className={`ui-page-header ${className}`} />;
}
