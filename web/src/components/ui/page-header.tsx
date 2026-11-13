import type { ComponentProps, ReactNode } from 'react';
import './page-header.css';

type PageHeaderProps = Omit<ComponentProps<'div'>, 'title'> & {
  title?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, actions, children, className = '', ...props }: PageHeaderProps) {
  // Detail headers retain their existing breadcrumb, badges and custom content.
  if (title === undefined) return <div {...props} className={`ui-page-header ${className}`}>{children}</div>;

  return <div {...props} data-layout="list" className={`ui-page-header ui-list-page-header ${className}`}>
    <h1>{title}</h1>
    {actions && <div className="ui-page-header-actions">{actions}</div>}
    {children}
  </div>;
}
