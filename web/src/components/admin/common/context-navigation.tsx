'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ComponentProps } from 'react';
import { ArrowLeftIcon } from '@/components/icons';
import { backLabel, safeAdminReturnTo, withReturnTo } from '@/lib/back-navigation';

export function useBackDestination(fallback: string) {
  const pathname = usePathname();
  const query = useSearchParams();
  const href = safeAdminReturnTo(query.get('returnTo'), pathname) || fallback;
  return { href, label: backLabel(href) };
}

/** Forward links carry the source URL, including the parent's own return destination. */
export function ContextLink({ href, source, ...props }: Omit<ComponentProps<typeof Link>, 'href'> & {
  href: string;
  source?: string;
}) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  return <Link {...props} href={withReturnTo(href, source || `${pathname}${query ? `?${query}` : ''}`)} />;
}

export function BackLink({ fallback, className = '' }: { fallback: string; className?: string }) {
  const { href, label } = useBackDestination(fallback);
  return <Link href={href} title={label} className={`inline-flex max-w-full items-center gap-1.5 ${className}`}>
    <ArrowLeftIcon className="w-4 h-4" />
    <span>{label}</span>
  </Link>;
}
