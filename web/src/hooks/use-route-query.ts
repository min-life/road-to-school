'use client';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

/** Hydrate list filters when a Dashboard/notification deep link changes, including same-page navigation. */
export function useRouteQuery(scope: string, apply: (query: URLSearchParams, isCurrent: () => boolean) => void) {
  const query = useSearchParams().toString();
  const applyRef = useRef(apply);
  useLayoutEffect(() => { applyRef.current = apply; }, [apply]);
  useEffect(() => {
    let current = true;
    applyRef.current(new URLSearchParams(query), () => current);
    return () => { current = false; };
  }, [query, scope]);
}
