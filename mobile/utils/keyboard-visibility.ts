/** Return only the distance needed to reveal a field, in viewport coordinates. */
export function getFocusScrollDelta(
  fieldTop: number, fieldHeight: number, viewportTop: number, viewportBottom: number, gap = 12,
): number {
  const available = viewportBottom - viewportTop;
  if (available <= 0 || fieldHeight <= 0) return 0;
  const clearance = Math.min(gap, available / 4);
  const top = viewportTop + clearance;
  const bottom = viewportBottom - clearance;
  // Tall multiline editors keep their top visible; the native editor scrolls its caret internally.
  if (fieldHeight > bottom - top) return fieldTop - top;
  if (fieldTop < top) return fieldTop - top;
  return Math.max(0, fieldTop + fieldHeight - bottom);
}
