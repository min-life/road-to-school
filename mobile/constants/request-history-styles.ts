import { StyleSheet } from 'react-native';
import { colors } from './theme';

/** Match the existing Leave history layout without changing request data/actions. */
export const requestHistoryStyles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  filters: { borderBottomColor: colors.border },
  filterPill: { paddingHorizontal: 12, paddingVertical: 5 },
  state: {
    flex: 0,
    padding: 0,
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  empty: { gap: 8 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16, fontWeight: '700', color: '#334155',
    marginTop: 0, textAlign: 'center',
  },
  emptySubtitle: {
    color: colors.mutedText, maxWidth: 260, lineHeight: 18,
    marginTop: 0, marginBottom: 8,
  },
  loadingText: { marginTop: 0 },
  disabled: { opacity: 0.5 },
  card: {
    borderRadius: 16, padding: 16, gap: 12,
    shadowOpacity: 0.04, marginBottom: 0,
  },
  cardHeader: { gap: 8, alignItems: 'flex-start', marginBottom: 0 },
  cardTypeRow: { flex: 1, minWidth: 0 },
  cardTypeTitle: { flexShrink: 1 },
  studentName: { fontSize: 15, marginBottom: 0 },
  summary: {
    backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10,
    marginBottom: 0,
  },
  footer: { borderTopColor: '#F1F5F9', paddingTop: 10, flexWrap: 'wrap', gap: 8 },
  pagination: { flexWrap: 'wrap', gap: 8 },
});
