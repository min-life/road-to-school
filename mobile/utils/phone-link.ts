/** Keep the supplied country prefix/leading zero; accept phone formatting, never URL commands. */
export function phoneDialUrl(phone: unknown): string | null {
  if (typeof phone !== 'string') return null;
  const value = phone.trim();
  if (!value || !/^\+?[\d\s().-]+$/u.test(value)) return null;
  const number = value.replace(/[\s().-]/gu, '');
  return /^\+?\d+$/u.test(number) ? `tel:${number}` : null;
}
