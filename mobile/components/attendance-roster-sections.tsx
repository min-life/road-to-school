import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { attendantTheme, colors } from '../constants/theme';
import type { MobileTripDetailStop, TripAttendanceStudentItem } from '../services/api-client';
import { attendanceRosterGroups } from '../utils/attendance-roster';

export function AttendanceRosterSections({ students, stops, phase, targetStopId, showPriority, renderCard }: {
  students: readonly TripAttendanceStudentItem[];
  stops: readonly MobileTripDetailStop[];
  phase: 'boarding' | 'alighting';
  targetStopId?: string | null;
  showPriority: boolean;
  renderCard: (student: TripAttendanceStudentItem, highlighted: boolean) => ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const groups = attendanceRosterGroups(students, stops, phase, targetStopId);
  const pinned = showPriority ? groups.next : undefined;
  const pending = pinned || !groups.next ? groups.pending : [groups.next, ...groups.pending];
  const term = query.trim().toLocaleLowerCase('vi-VN');
  const matches = (student: TripAttendanceStudentItem) => !term || [student.fullName, student.studentCode, student.addressText]
    .some(value => value?.toLocaleLowerCase('vi-VN').includes(term));
  const remaining = pending.filter(matches);
  const completed = groups.completed.filter(matches);
  const doneLabel = phase === 'boarding' ? 'Đã xử lý' : 'Đã xuống xe';

  return <View style={styles.section}>
    {pinned && <View style={styles.section}>
      <Text style={styles.heading}>{groups.fromNavigation ? phase === 'boarding' ? 'Điểm đón tiếp theo' : 'Điểm trả tiếp theo' : 'Cần điểm danh'}</Text>
      {renderCard(pinned, true)}
    </View>}
    <Text style={styles.heading}>{pinned ? 'Các học sinh còn lại' : 'Danh sách học sinh'}</Text>
    <View style={styles.search}>
      <Ionicons name="search" size={16} color={colors.mutedText} />
      <TextInput style={styles.input} value={query} onChangeText={setQuery} placeholder="Tìm theo tên hoặc mã học sinh"
        placeholderTextColor={colors.mutedText} accessibilityLabel="Tìm học sinh" />
      {!!query && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Xóa tìm kiếm" onPress={() => setQuery('')} style={styles.clear}>
        <Ionicons name="close-circle" size={17} color={colors.mutedText} />
      </TouchableOpacity>}
    </View>
    {remaining.map(student => renderCard(student, false))}
    {term && !remaining.length && !completed.length && (!pinned || !matches(pinned)) && <Text style={styles.muted}>Không tìm thấy học sinh phù hợp.</Text>}
    {!term && !pinned && !pending.length && !groups.completed.length &&
      <Text style={styles.muted}>{phase === 'alighting' ? 'Chưa có học sinh nào có mặt trên xe.' : 'Chưa có học sinh trong danh sách.'}</Text>}
    {!!groups.completed.length && <>
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: expanded || !!term }}
        onPress={() => setExpanded(value => !value)} disabled={!!term} style={styles.disclosure}>
        <Text style={styles.heading}>{doneLabel} · {term ? completed.length : groups.completed.length}</Text>
        {!term && <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={attendantTheme.colors.primary} />}
      </TouchableOpacity>
      {(expanded || !!term) && completed.map(student => renderCard(student, false))}
    </>}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  heading: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  muted: { fontSize: 13, color: colors.mutedText },
  search: { minHeight: 44, borderColor: colors.border, borderWidth: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  input: { flex: 1, minHeight: 44, color: colors.foreground, fontSize: 14 },
  clear: { minWidth: 36, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  disclosure: { minHeight: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border },
});
