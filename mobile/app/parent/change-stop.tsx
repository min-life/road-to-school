import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/navigation/app-header';
import { TrackingEmptyState } from '@/components/parent/tracking-empty-state';
import { colors } from '@/constants/theme';
import { mobileApiClient, type ParentLinkedStudentItem } from '@/services/api-client';

/** Select a linked child, then reuse the existing address-request flow. */
export default function ChangeStopScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [students, setStudents] = useState<ParentLinkedStudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setStudents([]);
    mobileApiClient.getLinkedStudents().then(data => {
      if (active) setStudents(data);
    }).catch((failure: unknown) => {
      if (active) setError(failure instanceof Error ? failure.message : 'Không thể tải danh sách học sinh.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]));

  return <View style={styles.screen}>
    <AppHeader title="Đổi điểm đón/trả" subtitle="Chọn học sinh" onBack={() => router.back()} />
    {loading ? <View style={styles.state}><ActivityIndicator color={colors.navigationActive} /><Text style={styles.muted}>Đang tải học sinh...</Text></View>
      : error ? <View style={styles.state}><Text style={styles.error}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={() => setAttempt(value => value + 1)} style={styles.button}><Text style={styles.label}>Thử lại</Text></Pressable></View>
      : <FlatList data={students} keyExtractor={student => student.id} contentContainerStyle={[styles.list, { paddingBottom: 24 + insets.bottom }]}
        ListEmptyComponent={<TrackingEmptyState title="Chưa có học sinh liên kết" description={null}
          onLink={() => router.push('/parent/link-student')} />}
        renderItem={({ item }) => {
          const disabled = item.status !== 'AVAILABLE';
          return <Pressable accessibilityRole="button" accessibilityLabel={`Đổi điểm cho ${item.fullName}`}
            accessibilityState={{ disabled }} disabled={disabled}
            onPress={() => router.push({ pathname: '/parent/update-requests/address/[studentId]', params: { studentId: item.id } })}
            style={({ pressed }) => [styles.card, disabled && styles.disabled, pressed && styles.pressed]}>
            <View style={styles.icon}><Ionicons name="location-outline" size={24} color={colors.navigationActive} /></View>
            <View style={styles.copy}><Text style={styles.name}>{item.fullName}</Text><Text style={styles.muted}>{item.schoolName}</Text>
              {disabled && <Text style={styles.muted}>Học sinh đã bị vô hiệu hóa</Text>}</View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedText} />
          </Pressable>;
        }} />}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: 16, gap: 12, paddingBottom: 24 },
  state: { padding: 24, alignItems: 'center', gap: 16 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: colors.border, minHeight: 64 },
  copy: { flex: 1, minWidth: 0 },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.navigationHighlight, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, lineHeight: 23, color: colors.foreground, fontWeight: '700' },
  muted: { fontSize: 12, lineHeight: 18, color: colors.mutedText },
  error: { color: colors.error, textAlign: 'center' },
  button: { minHeight: 48, borderRadius: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.primary, justifyContent: 'center' },
  label: { fontSize: 14, color: colors.foreground, fontWeight: '700' },
  disabled: { opacity: 0.5 }, pressed: { opacity: 0.7 },
});
