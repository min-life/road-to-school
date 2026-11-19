import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { attendantTheme, colors } from '../constants/theme';
import type { useRfidAttendance } from '../hooks/use-rfid-attendance';
import type {
  RfidPhase,
} from '../services/rfid-attendance';
import {
  isRfidPending,
  phaseLabel,
  rfidOutcome,
} from '../utils/rfid-attendance';

export function RfidAttendancePanel({
  reader: r,
  phaseFilter,
  compact,
}: {
  reader: ReturnType<typeof useRfidAttendance>;
  phaseFilter: RfidPhase;
  compact: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const rows = r.data?.data.filter((item) => item.phase === phaseFilter) ?? [];
  const selected = rows.find((item) => item.scanId === selectedId) ?? rows[0];
  const serverPending = r.data?.pendingEvent === undefined ? r.data?.data.find(item =>
    item.phase === phaseFilter && isRfidPending(item.state)) : r.data.pendingEvent;
  const heldForOtherPhase = r.held && r.held.event.phase !== phaseFilter;
  const event = heldForOtherPhase ? undefined : [r.held?.event, serverPending, compact ? undefined : selected].find(item => item?.phase === phaseFilter);
  const pending = !!r.held || (!!event && isRfidPending(event.state));
  const busy = !!r.busyId;
  return (
    <View style={styles.panel} testID="rfid-attendance-panel">
      <View style={styles.row}>
        <Ionicons name="radio-outline" size={19} color={colors.foreground} />
        <Text style={styles.title}>Thẻ RFID · {phaseLabel(phaseFilter)}</Text>
      </View>
      {r.denied ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {r.error}
        </Text>
      ) : (
        <>
          {!compact && <View style={styles.row}>
            {(['queue', 'history'] as const).map((view) => (
              <TouchableOpacity
                key={view}
                accessibilityRole="tab"
                accessibilityState={{
                  selected: r.view === view,
                  disabled: busy || pending || r.loading,
                }}
                disabled={busy || pending || r.loading}
                style={[styles.smallButton, r.view === view && styles.active]}
                onPress={() => {
                  setSelectedId(null);
                  r.clearMessage();
                  r.setView(view);
                }}
              >
                <Text style={[styles.buttonText, r.view === view && attendantTheme.buttons.secondaryText]}>
                  {view === 'queue' ? 'Vừa quẹt' : 'Lịch sử'}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Tải lại lượt quẹt RFID"
              disabled={busy}
              style={styles.iconButton}
              onPress={r.retry}
            >
              <Ionicons name="refresh" size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>}
          {!compact && r.loading && (
            <ActivityIndicator
              color={colors.foreground}
              accessibilityLabel="Đang tải lượt quẹt"
            />
          )}
          {!!r.error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {r.error}
            </Text>
          )}
          {!!r.message && (
            <Text accessibilityLiveRegion="polite" style={styles.notice}>
              {r.message}
            </Text>
          )}
          {event && (
            <View style={styles.detail}>
              <Text style={styles.student}>
                {event.studentName || 'Không xác định học sinh'}
              </Text>
              {!!event.studentCode && (
                <Text style={styles.muted}>{event.studentCode}</Text>
              )}
              <Text style={styles.muted}>
                {phaseLabel(event.phase)} ·{' '}
                {new Date(event.scannedAt).toLocaleTimeString('vi-VN')}
              </Text>
              <Text
                accessibilityLiveRegion="polite"
                style={event.state === 'REJECTED' ? styles.error : styles.muted}
              >
                {r.held?.unknown
                  ? 'Chưa rõ kết quả. Kiểm tra lại đúng lượt này.'
                  : pending
                    ? 'Đang đối soát kết quả'
                    : rfidOutcome(event)}
              </Text>
              {pending && (
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={busy}
                  style={[styles.primary, busy && styles.disabled]}
                  onPress={() => void r.checkResult(event)}
                >
                  <Text style={[styles.buttonText, busy ? attendantTheme.buttons.disabledText : attendantTheme.buttons.primaryText]}>
                    {busy ? 'Đang kiểm tra…' : 'Kiểm tra kết quả'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {!compact && !r.loading && !rows.length && !event && (
            <Text style={styles.muted}>
              Chưa có lượt {phaseLabel(phaseFilter)}.
            </Text>
          )}
          {!compact && <ScrollView
            style={styles.queue}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {rows.map((item) => (
              <TouchableOpacity
                key={item.scanId}
                accessibilityRole="button"
                accessibilityState={{
                  selected: event?.scanId === item.scanId,
                  disabled: busy || pending || r.loading,
                }}
                disabled={busy || pending || r.loading}
                style={[
                  styles.queueItem,
                  event?.scanId === item.scanId && styles.active,
                ]}
                onPress={() => {
                  setSelectedId(item.scanId);
                  r.clearMessage();
                }}
              >
                <Text numberOfLines={1} style={[styles.buttonText, event?.scanId === item.scanId && attendantTheme.buttons.secondaryText]}>
                  {item.studentName || 'Thẻ không hợp lệ'}
                </Text>
                <Text style={styles.muted}>
                  {new Date(item.scannedAt).toLocaleTimeString('vi-VN')} ·{' '}
                  {isRfidPending(item.state) ? 'Đang đối soát' : rfidOutcome(item)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>}
          {!compact && !!r.data && r.data.total > r.data.limit && (
            <View style={styles.row}>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={r.page <= 1 || busy || pending || r.loading}
                style={[
                  styles.smallButton,
                  (r.page <= 1 || busy || pending || r.loading) &&
                    styles.disabled,
                ]}
                onPress={() => {
                  setSelectedId(null);
                  r.setPage(r.page - 1);
                }}
              >
                <Text style={styles.buttonText}>Trước</Text>
              </TouchableOpacity>
              <Text style={styles.muted}>
                {r.page}/{Math.max(1, Math.ceil(r.data.total / r.data.limit))}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={
                  r.page * r.data.limit >= r.data.total ||
                  busy ||
                  pending ||
                  r.loading
                }
                style={[
                  styles.smallButton,
                  (r.page * r.data.limit >= r.data.total ||
                    busy ||
                    pending ||
                    r.loading) &&
                    styles.disabled,
                ]}
                onPress={() => {
                  setSelectedId(null);
                  r.setPage(r.page + 1);
                }}
              >
                <Text style={styles.buttonText}>Tiếp</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  panel: {
    padding: 14,
    marginBottom: 14,
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  title: { flexShrink: 1, fontSize: 15, fontWeight: '700', color: colors.foreground },
  student: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  muted: { fontSize: 12, color: colors.mutedText },
  ready: { fontSize: 12, color: '#047857' },
  error: { fontSize: 13, color: '#B91C1C' },
  notice: {
    padding: 10,
    backgroundColor: colors.background,
    color: colors.foreground,
    borderRadius: 8,
    fontSize: 13,
  },
  detail: {
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },
  primary: {
    maxWidth: '100%',
    flexShrink: 1,
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: attendantTheme.colors.primary,
    borderRadius: 10,
  },
  smallButton: {
    maxWidth: '100%',
    flexShrink: 1,
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },
  iconButton: {
    width: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { flexShrink: 1, textAlign: 'center', color: colors.foreground, fontSize: 13, fontWeight: '600' },
  queue: { maxHeight: 160 },
  queueItem: {
    padding: 10,
    gap: 4,
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderRadius: 8,
  },
  active: attendantTheme.buttons.secondary,
  disabled: attendantTheme.buttons.disabled,
});
