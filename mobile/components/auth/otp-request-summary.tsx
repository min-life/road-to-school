import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';

type SummaryRow = { label: string; value: string; stacked?: boolean };

/** Read-only review of the submitted draft; never owns OTP or request payloads. */
export function OtpRequestSummary({ title, subjectLabel, subjectName, rows }: {
  title: string;
  subjectLabel: string;
  subjectName?: string;
  rows: readonly SummaryRow[];
}) {
  return <View style={styles.card}>
    <View style={styles.header}>
      <View style={styles.icon}><Ionicons name="document-text-outline" size={18} color={colors.navigationActive} accessible={false} /></View>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    </View>
    <View style={styles.subject}>
      <Text style={styles.label}>{subjectLabel}</Text>
      <Text style={styles.subjectName}>{subjectName?.trim() || 'Chưa có thông tin'}</Text>
    </View>
    <View style={styles.rows}>
      {rows.map(row => <View key={row.label} style={row.stacked ? styles.stacked : styles.row}>
        <Text style={[styles.label, !row.stacked && styles.rowLabel]}>{row.label}</Text>
        <Text style={[styles.value, !row.stacked && styles.rowValue]}>{row.value}</Text>
      </View>)}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  card: { width: '100%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 20, padding: 16, marginVertical: 12, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.navigationHighlight, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, minWidth: 0, color: colors.foreground, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  subject: { gap: 4, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  subjectName: { color: colors.foreground, fontSize: 16, lineHeight: 23, fontWeight: '700' },
  rows: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stacked: { gap: 4 },
  label: { color: colors.mutedText, fontSize: 12, lineHeight: 20 },
  rowLabel: { width: '34%' },
  value: { color: colors.foreground, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  rowValue: { flex: 1, minWidth: 0 },
});
