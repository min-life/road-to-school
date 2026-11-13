export type PaginationItem = number | 'ellipsis-start' | 'ellipsis-end';

/** A bounded window, with first/last pages always reachable. */
export function getPaginationItems(page: number, totalPages: number, windowSize = 5): PaginationItem[] {
  const count = Math.max(1, Math.floor(totalPages));
  const current = Math.min(count, Math.max(1, Math.floor(page)));
  const size = Math.max(1, Math.floor(windowSize));
  const start = Math.max(1, Math.min(current - Math.floor(size / 2), count - size + 1));
  const end = Math.min(count, start + size - 1);
  const items: PaginationItem[] = [];

  if (start > 1) items.push(1);
  if (start > 2) items.push('ellipsis-start');
  for (let value = start; value <= end; value++) items.push(value);
  if (end < count - 1) items.push('ellipsis-end');
  if (end < count) items.push(count);
  return items;
}
