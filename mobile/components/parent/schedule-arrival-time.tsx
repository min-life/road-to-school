import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import { mobileApiClient, type MobileScheduleItem } from '@/services/api-client';
import { useActiveRefresh } from '@/hooks/use-active-refresh';
import type { RefreshContext } from '@/utils/refresh-loop';
import { journeyClock } from '@/utils/parent-journey';

/** The return route ends at the parking lot; its end time is not this child's arrival. */
export function ScheduleArrivalTime({ trip, studentId, identity }: {
  trip: MobileScheduleItem;
  studentId: string;
  identity: string;
}) {
  if (trip.direction === 'TO_SCHOOL') {
    return <ArrivalTimeRow label="Đến trường dự kiến" value={journeyClock(trip.scheduledEndTime)} />;
  }
  if (trip.isVirtual || !studentId) {
    return <ArrivalTimeRow label="Đến điểm trả dự kiến" value={null} />;
  }
  const scope = JSON.stringify([identity, studentId, trip.id, trip.routeId, trip.direction,
    trip.scheduledStartTime, trip.scheduledEndTime]);
  return <ReturnArrivalTime key={scope} scope={scope} trip={trip} studentId={studentId} />;
}

function ReturnArrivalTime({ scope, trip, studentId }: { scope: string; trip: MobileScheduleItem; studentId: string }) {
  const [time, setTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const fetchArrival = async ({ isCurrent }: RefreshContext) => {
    try {
      const detail = await mobileApiClient.getMobileTripDetail(trip.id);
      if (!isCurrent()) return;
      if (detail.id !== trip.id || detail.direction !== trip.direction) throw new Error('Trip scope changed');
      const stop = detail.stops.find(item => item.stopType === 'DROPOFF'
        && item.studentId === studentId && item.isMyChild === true);
      setTime(journeyClock(stop?.plannedArrivalTime));
      setFailed(false);
    } catch (failure) {
      if (!isCurrent()) return;
      setTime(null);
      setFailed(true);
      const status = (failure as { statusCode?: number })?.statusCode;
      if (status === 403 || status === 404) return false;
    } finally {
      if (isCurrent()) setLoading(false);
    }
  };
  const { refresh } = useActiveRefresh(scope, fetchArrival, 12000);
  return <ArrivalTimeRow label="Đến điểm trả dự kiến" value={time} loading={loading} failed={failed}
    onRetry={() => { setLoading(true); refresh(); }} />;
}

function ArrivalTimeRow({ label, value, loading = false, failed = false, onRetry }: {
  label: string; value: string | null; loading?: boolean; failed?: boolean; onRetry?: () => void;
}) {
  return <View style={styles.row}>
    <View style={styles.labelRow}>
      <Ionicons name="flag-outline" size={15} color={colors.navigationActive} accessible={false} />
      <Text style={styles.label}>{label}</Text>
    </View>
    {loading ? <View style={styles.loading}>
      <ActivityIndicator size="small" color={colors.navigationActive} />
      <Text style={styles.hint}>Đang tải...</Text>
    </View> : <Text style={[styles.value, !value && styles.hint]}>
      {failed ? 'Chưa tải được' : value || 'Chưa có giờ dự kiến'}
    </Text>}
    {failed && !loading && onRetry && <Pressable accessibilityRole="button"
      accessibilityLabel="Tải lại giờ đến điểm trả dự kiến"
      onPress={event => { event.stopPropagation(); onRetry(); }}
      style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
      <Ionicons name="refresh-outline" size={18} color={colors.navigationActive} accessible={false} />
    </Pressable>}
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, backgroundColor: colors.background,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, marginBottom: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexGrow: 1, flexBasis: 140, minWidth: 0 },
  label: { color: colors.mutedText, fontSize: 12, lineHeight: 18, flexShrink: 1 },
  value: { color: colors.foreground, fontSize: 14, lineHeight: 20, fontWeight: '700', maxWidth: '100%', flexShrink: 1 },
  hint: { color: colors.mutedText, fontSize: 12, lineHeight: 18, fontWeight: '400' },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  retry: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
});
