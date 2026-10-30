import { AppHeader, HeaderAction } from '@/components/navigation/app-header';
import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useNotifications } from '@/context/notifications-context';
import { notificationApi, type NotificationList } from '@/services/notifications';
import { useActiveRefresh } from '@/hooks/use-active-refresh';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { open, refresh: refreshSummary } = useNotifications();
  const router = useRouter(), insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('ALL'), [cursor, setCursor] = useState<string | undefined>();
  const identity = `${user?.id}:${filter}:${cursor ?? ''}`;
  const [stored, setStored] = useState<{ identity: string; value: NotificationList } | null>(null);
  const [failure, setFailure] = useState<{ identity: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const data = stored?.identity === identity ? stored.value : null;
  const error = failure?.identity === identity ? failure.message : null;
  const { refresh, mutate } = useActiveRefresh(identity, async ({ isCurrent }) => {
    if (!user) return false;
    try { const value = await notificationApi.list(filter, cursor); if (isCurrent()) { setStored({ identity, value }); setFailure(null); } }
    catch (cause) { if (isCurrent()) setFailure({ identity, message: cause instanceof Error ? cause.message : 'Không thể tải thông báo' }); }
  }, 20000);
  async function readAll() {
    if (busy) return; setBusy(true);
    try { await mutate(() => notificationApi.read()); refreshSummary(); }
    catch { Alert.alert('Thông báo', 'Không thể đánh dấu đã đọc'); }
    finally { setBusy(false); }
  }
  return <View style={styles.container}>
    <AppHeader title="Thông báo" onBack={() => router.back()} actions={<HeaderAction icon="checkmark-done" label="Đánh dấu tất cả đã đọc" disabled={busy} onPress={() => { void readAll(); }} />} />
    <View style={styles.filters}>{[['ALL', 'Tất cả'], ['UNREAD', 'Chưa đọc']].map(([value, label]) => <TouchableOpacity key={value} onPress={() => { setFilter(value); setCursor(undefined); }} style={[styles.filter, filter === value && styles.selected]}><Text style={styles.text}>{label}</Text></TouchableOpacity>)}</View>
    {error && <TouchableOpacity onPress={refresh} style={styles.error}><Text style={{ color: colors.error }}>{error} · Thử lại</Text></TouchableOpacity>}
    {!data && !error && <ActivityIndicator color={colors.primary} style={{ margin: 32 }} />}
    {data && <FlatList data={data.items} keyExtractor={item => item.id} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      ListEmptyComponent={<Text style={[styles.muted, { textAlign: 'center', margin: 32 }]}>Chưa có thông báo</Text>}
      renderItem={({ item }) => <TouchableOpacity onPress={() => { void open(item.id).then(refresh); }} style={[styles.row, !item.readAt && styles.unread]}>
        <Ionicons name={item.type === 'INCIDENT' ? 'warning-outline' : 'notifications-outline'} size={22} color={colors.foreground} /><View style={{ flex: 1 }}><Text style={[styles.text, { fontWeight: item.readAt ? '500' : '700' }]}>{item.title}</Text>{!!item.body && <Text style={styles.muted}>{item.body}</Text>}<Text style={styles.time}>{new Date(item.createdAt).toLocaleDateString('vi-VN')} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></View>{!item.readAt && <View style={styles.dot} />}
      </TouchableOpacity>}
      ListFooterComponent={<View style={styles.filters}>{cursor && <TouchableOpacity style={styles.filter} onPress={() => setCursor(undefined)}><Text style={styles.link}>Mới nhất</Text></TouchableOpacity>}{data.hasMore && data.nextCursor && <TouchableOpacity style={styles.filter} onPress={() => setCursor(data.nextCursor ?? undefined)}><Text style={styles.link}>Thông báo cũ hơn →</Text></TouchableOpacity>}</View>} />}
  </View>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filters: { flexDirection: 'row', gap: 18, padding: 12, alignItems: 'center' }, filter: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.surface }, selected: { backgroundColor: colors.primary }, text: { fontSize: 14, color: colors.foreground }, muted: { color: colors.mutedText, fontSize: 12, marginTop: 4 }, link: { color: colors.foreground, fontWeight: '700', fontSize: 13 },
  row: { padding: 18, flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }, unread: { backgroundColor: colors.background }, time: { color: colors.mutedText, marginTop: 6, fontSize: 11 }, dot: { height: 7, width: 7, borderRadius: 4, backgroundColor: colors.error, marginTop: 5 }, error: { padding: 16 },
});
