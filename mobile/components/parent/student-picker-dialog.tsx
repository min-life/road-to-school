import { AppModal as Modal } from '@/components/app-alert';
import { useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { KeyboardScrollView } from '@/components/keyboard-scroll-view';
import { UserAvatar } from '@/components/user-avatar';
import { colors } from '@/constants/theme';
import type { ParentLinkedStudentItem } from '@/services/api-client';
import { matchesSearchText } from '@/utils/search-text';
import { TrackingEmptyState } from './tracking-empty-state';

type StudentPickerDialogProps = {
  students: ParentLinkedStudentItem[];
  selectedId: string;
  loading: boolean;
  error: string | null;
  canSelectStudent?: (student: ParentLinkedStudentItem) => boolean;
  onSelect: (studentId: string) => void;
  onClose: () => void;
  onRetry: () => void;
  onLink: () => void;
};

/** Mounted only while open so reopening always shows the complete linked list. */
export function StudentPickerDialog({ students, selectedId, loading, error, canSelectStudent,
  onSelect, onClose, onRetry, onLink }: StudentPickerDialogProps) {
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const availableHeight = Math.max(0, height - insets.top - insets.bottom - 32);
  const filtered = students.filter(student => matchesSearchText(query, [student.fullName, student.code, student.schoolName]));
  const close = () => { Keyboard.dismiss(); onClose(); };

  return <Modal visible transparent animationType="fade" onRequestClose={close}>
    <View style={[styles.overlay, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <Pressable accessible={false} onPress={close} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={[styles.modal, { height: Math.min(560, availableHeight) }]}>
        <View style={styles.header}>
          <View style={styles.headingIcon}><Ionicons name="people-outline" size={21} color={colors.navigationActive} accessible={false} /></View>
          <Text accessibilityRole="header" style={styles.title}>Chọn học sinh</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng chọn học sinh" onPress={close}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <Ionicons name="close" size={22} color={colors.mutedText} accessible={false} />
          </Pressable>
        </View>
        <KeyboardScrollView style={styles.body} contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[styles.search, searchFocused && styles.searchFocused]}>
            <Ionicons name="search-outline" size={20} color={colors.mutedText} accessible={false} />
            <TextInput value={query} onChangeText={setQuery} placeholder="Tên, mã hoặc trường học"
              placeholderTextColor={colors.mutedText} accessibilityLabel="Tìm học sinh theo tên, mã hoặc trường học"
              style={styles.searchInput} autoFocus={false} autoCorrect={false} autoCapitalize="none"
              onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
              returnKeyType="search" onSubmitEditing={Keyboard.dismiss} editable={!loading && !error} />
            {!!query && <Pressable accessibilityRole="button" accessibilityLabel="Xóa tìm kiếm" onPress={() => setQuery('')}
              style={({ pressed }) => [styles.clear, pressed && styles.pressed]}>
              <Ionicons name="close-circle" size={19} color={colors.mutedText} accessible={false} />
            </Pressable>}
          </View>
          {loading ? <View style={styles.state}><ActivityIndicator color={colors.navigationActive} /><Text style={styles.stateText}>Đang tải học sinh...</Text></View>
            : error ? <View style={styles.state}><Text accessibilityRole="alert" style={styles.error}>{error}</Text>
              <Pressable accessibilityRole="button" onPress={onRetry} style={styles.stateAction}><Text style={styles.actionText}>Thử lại</Text></Pressable></View>
            : students.length === 0 ? <TrackingEmptyState title="Chưa có học sinh liên kết" description={null}
              onLink={() => { close(); onLink(); }} />
            : <>
              <Text accessibilityLiveRegion="polite" style={styles.resultCount}>{filtered.length} học sinh</Text>
              {filtered.length === 0 ? <View style={styles.state}>
                <View style={styles.emptyIcon}><Ionicons name="search-outline" size={26} color={colors.mutedText} accessible={false} /></View>
                <Text style={styles.emptyTitle}>Không tìm thấy học sinh</Text>
                <Pressable accessibilityRole="button" onPress={() => setQuery('')} style={styles.stateAction}>
                  <Text style={styles.actionText}>Xóa tìm kiếm</Text>
                </Pressable>
              </View> : filtered.map(student => {
                const unavailable = canSelectStudent ? !canSelectStudent(student) : student.status !== 'AVAILABLE';
                const active = student.id === selectedId;
                return <Pressable key={student.id} accessibilityRole="button"
                  accessibilityLabel={`${student.fullName}, mã ${student.code}, ${student.schoolName}${unavailable ? ', đã vô hiệu hóa' : ''}`}
                  accessibilityState={{ selected: active, disabled: unavailable }} disabled={unavailable}
                  onPress={() => { onSelect(student.id); close(); }}
                  style={({ pressed }) => [styles.card, active && styles.selected, unavailable && styles.disabled, pressed && styles.pressed]}>
                  <UserAvatar avatarUrl={student.avatarUrl} fullName={student.fullName || 'Học sinh'} size={48} />
                  <View style={styles.copy}>
                    <Text style={styles.name}>{student.fullName}</Text>
                    <Text style={styles.code}>Mã: {student.code}</Text>
                    <View style={styles.schoolRow}>
                      <Ionicons name="school-outline" size={13} color={colors.mutedText} accessible={false} />
                      <Text style={styles.school}>{student.schoolName}</Text>
                    </View>
                    {unavailable && <Text style={styles.unavailable}>Học sinh đã bị vô hiệu hóa</Text>}
                    {active && <Text style={styles.selectedText}>Đang chọn</Text>}
                  </View>
                  <Ionicons name={unavailable ? 'lock-closed-outline' : active ? 'checkmark-circle' : 'ellipse-outline'} size={22}
                    color={active ? colors.navigationActive : colors.mutedText} accessible={false} />
                </Pressable>;
              })}
            </>}
        </KeyboardScrollView>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.48)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  modal: { width: '100%', maxWidth: 420, backgroundColor: colors.surface, borderRadius: 24, flexShrink: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 20, paddingRight: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border },
  headingIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.navigationHighlight, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, lineHeight: 24, fontWeight: '800', color: colors.foreground },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  content: { padding: 16, gap: 10 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 12, paddingRight: 4, minHeight: 50,
    backgroundColor: colors.background, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  searchFocused: { borderColor: colors.navigationActive },
  searchInput: { flex: 1, minWidth: 0, minHeight: 48, paddingVertical: 12, fontSize: 14, lineHeight: 20,
    fontWeight: '400', fontStyle: 'normal', letterSpacing: 0, color: colors.foreground },
  clear: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  resultCount: { color: colors.mutedText, fontSize: 12, lineHeight: 18, fontWeight: '600', marginTop: 4 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  selected: { backgroundColor: colors.navigationHighlight, borderColor: colors.navigationActive },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  name: { color: colors.foreground, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  code: { color: colors.mutedText, fontSize: 11, lineHeight: 16 },
  schoolRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  school: { flex: 1, minWidth: 0, color: colors.mutedText, fontSize: 12, lineHeight: 17 },
  selectedText: { fontSize: 11, lineHeight: 16, fontWeight: '700', color: colors.navigationActive },
  unavailable: { fontSize: 11, lineHeight: 16, color: colors.mutedText },
  disabled: { opacity: 0.55 }, pressed: { opacity: 0.7 },
  state: { paddingVertical: 24, alignItems: 'center', gap: 10 },
  emptyIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.foreground, fontSize: 15, lineHeight: 21, fontWeight: '700', textAlign: 'center' },
  stateText: { color: colors.mutedText, fontSize: 13, lineHeight: 19 },
  error: { color: colors.error, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  stateAction: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16 },
  actionText: { color: colors.navigationActive, fontSize: 13, fontWeight: '700' },
});
