import type { ComponentProps } from 'react';

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'default' | 'sm' | 'icon';
};

/** Presentation only: native type, events, disabled state and ref pass through. */
export function Button({ className = '', variant, size = 'default', ...props }: ButtonProps) {
  return <button {...props} data-variant={variant} data-size={size} className={`ui-button ${className}`} />;
}
