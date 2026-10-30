import { colors } from './theme';

export const journeyTones = {
  warning: { bg: '#FFF4DC', text: '#854D0E', border: '#D59A25' },
  info: { bg: '#EAF2FF', text: '#1D4ED8', border: '#93B4ED' },
  success: { bg: '#E9F8EF', text: '#166534', border: '#82C89D' },
  danger: { bg: '#FFF0F0', text: '#991B1B', border: '#E8A0A0' },
  purple: { bg: '#F1ECFF', text: '#6B21A8', border: '#C6AFE7' },
  neutral: { bg: colors.background, text: colors.mutedText, border: colors.border },
} as const;

export type JourneyTone = keyof typeof journeyTones;
