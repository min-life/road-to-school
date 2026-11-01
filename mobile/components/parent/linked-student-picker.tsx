import { useState } from 'react';
import { ActivityIndicator, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ParentLinkedStudentItem } from '@/services/api-client';
import { colors } from '@/constants/theme';
import { TrackingEmptyState } from './tracking-empty-state';
import { UserAvatar } from '@/components/user-avatar';

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
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
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

    <Modal visible={visible && !disabled && !fixed} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <Pressable accessible={false} onPress={() => setVisible(false)}
        style={[styles.overlay, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        <View accessibilityViewIsModal onStartShouldSetResponder={() => true}
          style={[styles.modal, { maxHeight: height - insets.top - insets.bottom - 32 }]}>
          <View style={styles.modalHeader}>
            <Text accessibilityRole="header" style={styles.modalTitle}>Chọn học sinh</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Đóng chọn học sinh" onPress={() => setVisible(false)} style={styles.close}>
              <Ionicons name="close" size={22} color={colors.mutedText} />
            </Pressable>
          </View>
          <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
            {students.length === 0 ? <TrackingEmptyState title="Chưa có học sinh liên kết" description={null}
              onLink={() => { setVisible(false); onLink(); }} /> : students.map(student => {
              const unavailable = canSelectStudent ? !canSelectStudent(student) : student.status !== 'AVAILABLE';
              const active = student.id === selectedId;
              return <Pressable key={student.id} accessibilityRole="button"
                accessibilityLabel={`${student.fullName}, ${student.schoolName}${unavailable ? ', đã vô hiệu hóa' : ''}`}
                accessibilityState={{ selected: active, disabled: unavailable }} disabled={unavailable}
                onPress={() => { onSelect(student.id); setVisible(false); }}
                style={({ pressed }) => [styles.item, active && styles.selected, unavailable && styles.disabled, pressed && styles.pressed]}>
                <UserAvatar avatarUrl={student.avatarUrl} fullName={student.fullName || 'Học sinh'} size={40} />
                <View style={styles.copy}>
                  <Text style={[styles.itemTitle, active && styles.selectedTitle]}>{student.fullName}</Text>
                  <Text style={styles.itemMeta}>Mã: {student.code} · {student.schoolName}</Text>
                  {unavailable && <Text style={styles.itemMeta}>Học sinh đã bị vô hiệu hóa</Text>}
                </View>
                {active && <Ionicons name="checkmark-circle" size={20} color={colors.navigationActive} />}
              </Pressable>;
            })}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
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
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  modal: { width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: 20, padding: 20, flexShrink: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12 },
  modalTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.foreground },
  close: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12, minHeight: 48 },
  copy: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  itemMeta: { fontSize: 11, lineHeight: 16, color: colors.mutedText, marginTop: 1 },
  selected: { backgroundColor: '#FEF9C3' },
  selectedTitle: { color: '#92400E', fontWeight: '700' },
  disabled: { opacity: 0.5 }, pressed: { opacity: 0.7 },
});
