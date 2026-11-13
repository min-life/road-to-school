import type { ComponentProps } from 'react';

export function Textarea({ className = '', ...props }: ComponentProps<'textarea'>) {
  return <textarea {...props} className={`ui-textarea ${className}`} />;
}
