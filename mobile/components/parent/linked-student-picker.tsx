import { useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ParentLinkedStudentItem } from '@/services/api-client';
import { colors } from '@/constants/theme';
import { UserAvatar } from '@/components/user-avatar';
import { StudentPickerDialog } from './student-picker-dialog';

type LinkedStudentPickerProps = {
  students: ParentLinkedStudentItem[];
  selectedId: string;
  loading: boolean;
  error: string | null;
  disabled?: boolean;
  fixed?: boolean;
  canSelectStudent?: (student: ParentLinkedStudentItem) => boolean;
  onSelect: (studentId: string) => void;
  onRetry: () => void;
  onLink: () => void;
};

/** Shared identity/dropdown/modal; each form retains its own selection policy and data. */
export function LinkedStudentPicker({ students, selectedId, loading, error, disabled = false,
  fixed = false, canSelectStudent, onSelect, onRetry, onLink }: LinkedStudentPickerProps) {
  const [visible, setVisible] = useState(false);
  const selected = students.find(student => student.id === selectedId);
  const blocked = loading || disabled || Boolean(error);
  const identity = <>
    {selected ? <UserAvatar avatarUrl={selected.avatarUrl} fullName={selected.fullName || 'Học sinh'} size={40} />
      : <Ionicons name="person-circle-outline" size={20} color={colors.navigationActive} />}
    <View style={styles.copy}>
      <Text style={styles.value}>{selected?.fullName || (fixed ? 'Học sinh' : 'Chọn học sinh')}</Text>
      {!!selected && <Text style={styles.itemMeta}>{[selected.code && `Mã: ${selected.code}`, selected.schoolName].filter(Boolean).join(' · ')}</Text>}
    </View>
    {fixed ? <View style={styles.fixedBadge}>
      <Ionicons name="lock-closed-outline" size={11} color={colors.mutedText} accessible={false} />
      <Text style={styles.fixedText}>Cố định</Text>
    </View> : loading ? <ActivityIndicator color={colors.navigationActive} />
      : <Ionicons name="chevron-down" size={18} color={colors.mutedText} />}
  </>;

  return <View style={styles.section}>
    <Text style={styles.label}>Học sinh</Text>
    {fixed ? <View style={styles.dropdown} accessibilityState={{ busy: loading }}>{identity}</View> : (
    <Pressable accessibilityRole="button" accessibilityLabel={selected
      ? [selected.fullName, selected.schoolName, selected.code && `Mã: ${selected.code}`].filter(Boolean).join(', ') : 'Chọn học sinh'}
      accessibilityState={{ disabled: blocked, expanded: visible }} disabled={blocked}
      onPress={() => { Keyboard.dismiss(); setVisible(true); }} style={({ pressed }) => [styles.dropdown, pressed && styles.pressed, blocked && styles.disabled]}>
      {identity}
    </Pressable>)}
    {error ? <View style={styles.message}>
      <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
      <Pressable accessibilityRole="button" disabled={disabled} onPress={onRetry} style={styles.retry}><Text style={styles.retryText}>Thử lại</Text></Pressable>
    </View> : !fixed && !loading && students.length === 0 ? <View style={styles.message}>
      <Text style={styles.muted}>Chưa có học sinh liên kết</Text>
      <Pressable accessibilityRole="button" disabled={disabled} onPress={onLink} style={styles.retry}><Text style={styles.retryText}>Liên kết học sinh</Text></Pressable>
    </View> : null}

    {visible && !disabled && !fixed && <StudentPickerDialog students={students} selectedId={selectedId}
      loading={loading} error={error} canSelectStudent={canSelectStudent} onSelect={onSelect}
      onClose={() => setVisible(false)} onRetry={onRetry} onLink={onLink} />}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5 },
  dropdown: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48 },
  value: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.foreground },
  fixedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 6, backgroundColor: '#F1F5F9', flexShrink: 0 },
  fixedText: { color: colors.mutedText, fontSize: 11, fontWeight: '600' },
  message: { alignItems: 'flex-start', gap: 4 },
  muted: { color: colors.mutedText, fontSize: 12 },
  error: { color: colors.error, fontSize: 12 },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  retryText: { color: colors.navigationActive, fontWeight: '700', fontSize: 13 },
  copy: { flex: 1, minWidth: 0 },
  itemMeta: { fontSize: 11, lineHeight: 16, color: colors.mutedText, marginTop: 1 },
  disabled: { opacity: 0.5 }, pressed: { opacity: 0.7 },
});
