export const colors = {
  primary: '#FFCB56',
  background: '#FFFDF6',
  foreground: '#1E293B',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  mutedText: '#64748B',
  success: '#10B981',
  error: '#EF4444',
} as const;

export type ThemeColors = typeof colors;
export default colors;
