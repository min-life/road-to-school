/** Match a contiguous substring in one display field, ignoring Vietnamese marks and case. */
export function matchesSearchText(query: string, fields: readonly (string | null | undefined)[]): boolean {
  const normalize = (value: string) => value.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ');
  if (!query.trim()) return true;
  const search = normalize(query).trim();
  if (!search) return false;
  return fields.some(field => typeof field === 'string' && normalize(field).includes(search));
}
