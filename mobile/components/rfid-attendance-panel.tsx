import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../constants/theme';
import {
  useRfidAttendance,
  type RfidMutation,
} from '../hooks/use-rfid-attendance';
import type {
  RfidAttendanceEvent,
  RfidPhase,
} from '../services/rfid-attendance';
import {
  canConfirmRfid,
  isRfidPending,
  phaseLabel,
  rfidOutcome,
} from '../utils/rfid-attendance';

export function RfidAttendancePanel({
  identity,
  tripId,
  phaseFilter,
  runMutation,
  onUpdated,
  onInteractionChange,
}: {
  identity: string;
  tripId: string;
  phaseFilter: RfidPhase;
  runMutation: RfidMutation;
  onUpdated: () => void;
  onInteractionChange?: (locked: boolean) => void;
}) {
  const r = useRfidAttendance(identity, tripId, runMutation, onUpdated);
  const [selected, setSelected] = useState<RfidAttendanceEvent | null>(null);
  useEffect(() => {
    setSelected((previous) => {
      if (r.denied) return null;
      if (!previous)
        return r.data?.data.find((item) => item.phase === phaseFilter) ?? null;
      return (
        r.data?.data.find((item) => item.scanId === previous.scanId) ?? previous
      );
    });
  }, [r.data, r.denied, phaseFilter]);
  useEffect(() => {
    if (r.lastEvent) setSelected(r.lastEvent);
  }, [r.lastEvent]);
  const serverPending = r.data?.data.find((item) => isRfidPending(item.state));
  const event = r.held?.event ?? serverPending ?? selected;
  const pending = !!r.held || (!!event && isRfidPending(event.state));
  const busy = !!r.busyId;
  useEffect(() => {
    onInteractionChange?.(busy || pending);
  }, [busy, pending, onInteractionChange]);
  const rows = r.data?.data.filter((item) => item.phase === phaseFilter) ?? [];
  const readerLabel =
    r.data?.reader.status === 'READY'
      ? 'Đã nhận đúng chuyến'
      : r.data?.reader.status === 'NO_DEVICE'
        ? 'Chưa gắn thiết bị'
        : 'Chưa sẵn sàng';
  const remaining = event
    ? Math.max(
        0,
        Math.ceil((new Date(event.expiresAt).getTime() - r.serverNow) / 1000),
      )
    : 0;
  const confirmable =
    !!event &&
    canConfirmRfid(event, r.data?.phase ?? null, r.serverNow) &&
    event.phase === phaseFilter;
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
          <Text
            style={
              r.data?.reader.status === 'READY' ? styles.ready : styles.muted
            }
          >
            {readerLabel}
          </Text>
          {r.data?.phase && r.data.phase !== phaseFilter && (
            <Text style={styles.muted}>
              Chuyến đang nhận lượt {phaseLabel(r.data.phase)}.
            </Text>
          )}
          <View style={styles.row}>
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
                  setSelected(null);
                  r.clearMessage();
                  r.setView(view);
                }}
              >
                <Text style={styles.buttonText}>
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
          </View>
          {r.loading && (
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
                    : event.state === 'WAITING_CONFIRMATION'
                      ? remaining
                        ? `Chờ xác nhận · còn ${remaining}s`
                        : 'Lượt quẹt đã hết hạn'
                      : rfidOutcome(event)}
              </Text>
              {pending ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={busy}
                  style={[styles.primary, busy && styles.disabled]}
                  onPress={() => void r.confirm(event)}
                >
                  <Text style={styles.buttonText}>
                    {busy ? 'Đang kiểm tra…' : 'Kiểm tra kết quả'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.row}>
                  {['WAITING_CONFIRMATION', 'REJECTED', 'EXPIRED'].includes(
                    event.state,
                  ) && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      disabled={busy}
                      style={[styles.smallButton, busy && styles.disabled]}
                      onPress={() => void r.dismiss(event)}
                    >
                      <Text style={styles.buttonText}>Bỏ qua</Text>
                    </TouchableOpacity>
                  )}
                  {event.state === 'WAITING_CONFIRMATION' && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Xác nhận ${phaseLabel(event.phase)} cho ${event.studentName || 'học sinh'}`}
                      disabled={busy || r.loading || !confirmable || !!r.error}
                      style={[
                        styles.primary,
                        (busy || r.loading || !confirmable || !!r.error) &&
                          styles.disabled,
                      ]}
                      onPress={() => void r.confirm(event)}
                    >
                      <Text style={styles.buttonText}>
                        {busy
                          ? 'Đang xử lý…'
                          : `Xác nhận ${phaseLabel(event.phase)}`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}
          {!r.loading && !rows.length && !event && (
            <Text style={styles.muted}>
              Chưa có lượt {phaseLabel(phaseFilter)}.
            </Text>
          )}
          <ScrollView
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
                  setSelected(item);
                  r.clearMessage();
                }}
              >
                <Text numberOfLines={1} style={styles.buttonText}>
                  {item.studentName || 'Thẻ không hợp lệ'}
                </Text>
                <Text style={styles.muted}>
                  {new Date(item.scannedAt).toLocaleTimeString('vi-VN')} ·{' '}
                  {isRfidPending(item.state)
                    ? 'Đang đối soát'
                    : item.state === 'WAITING_CONFIRMATION'
                      ? 'Chờ xác nhận'
                      : rfidOutcome(item)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {!!r.data && r.data.total > r.data.limit && (
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
                  setSelected(null);
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
                  setSelected(null);
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
    backgroundColor: colors.primary,
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
  active: { backgroundColor: colors.navigationHighlight },
  disabled: { opacity: 0.45 },
});
