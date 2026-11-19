import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { attendantTheme, colors } from '../constants/theme';
import { useRfidAttendance, type RfidMutation } from '../hooks/use-rfid-attendance';
import type { RfidPhase } from '../services/rfid-attendance';
import { isRfidPending, phaseLabel, rfidOutcome } from '../utils/rfid-attendance';
import { RfidAttendancePanel } from './rfid-attendance-panel';

type Props = { identity: string; tripId: string; phaseFilter: RfidPhase; runMutation: RfidMutation; onUpdated: () => void };

/** The caller supplies the assigned attendant scope; Drivers keep the existing read-only roster. */
export function RfidAttendanceEntry(props: Props) {
  const [expanded, setExpanded] = useState(false);
  const { identity, tripId, phaseFilter, runMutation, onUpdated } = props;
  const reader = useRfidAttendance(identity, tripId, runMutation, onUpdated);
  const serverEvent = reader.data?.pendingEvent === undefined ? reader.data?.data.find(item =>
    item.phase === phaseFilter && isRfidPending(item.state)) : reader.data.pendingEvent;
  const event = reader.held?.event ?? serverEvent;
  const needsAction = !reader.denied && event?.phase === phaseFilter &&
    isRfidPending(event.state);
  const latest = reader.view === 'queue' && reader.page === 1
    ? reader.data?.data.find(item => item.phase === phaseFilter && item.state !== 'WAITING_CONFIRMATION')
    : undefined;
  const ready = !reader.error && reader.data?.reader.status === 'READY' && reader.data.phase === phaseFilter;
  const reason = reader.data?.reader.reason;
  const label = reader.error ? 'Chưa đọc được trạng thái thiết bị'
    : !reader.data ? 'Đang tải trạng thái…'
    : reader.data.reader.status === 'NO_DEVICE' ? 'Xe chưa gắn thiết bị'
    : !reader.data.phase ? 'Chưa mở pha điểm danh'
    : reason === 'TRIP_NOT_ELIGIBLE' ? 'Chuyến chưa đủ điều kiện RFID'
    : reason === 'DEVICE_UNREACHABLE' ? 'Chưa nhận kết nối từ thiết bị'
    : reader.data.phase !== phaseFilter ? `Thiết bị đang ở pha ${phaseLabel(reader.data.phase)}`
    : ready ? `Sẵn sàng cho lượt ${phaseLabel(phaseFilter)}` : 'Chờ thiết bị xác nhận chuyến';
  const canRetry = !!reader.error || (!!reader.data && !ready && reason !== 'NO_DEVICE');

  return (
    <View style={styles.section}>
      <View style={[styles.status, ready ? styles.ready : styles.wait]}>
        <Text accessibilityLiveRegion="polite" style={styles.label}>RFID · {label}</Text>
        {!expanded && !needsAction && latest && <Text accessibilityLiveRegion="polite" style={styles.help}>
          {[latest.studentName, rfidOutcome(latest)].filter(Boolean).join(' · ')}
        </Text>}
        {!ready && <Text style={styles.help}>{phaseFilter === 'BOARDING' ? 'Có thể dùng QR hoặc điểm danh tay khi pha điểm danh cho phép.' : 'Có thể điểm danh xuống xe bằng tay khi pha điểm danh cho phép.'}</Text>}
        {reader.held && reader.held.event.phase !== phaseFilter && <Text style={styles.help}>
          Quay lại pha {phaseLabel(reader.held.event.phase)} để kiểm tra lượt quẹt đang đối soát.
        </Text>}
        <View style={styles.actions}>
          {canRetry && <TouchableOpacity accessibilityRole="button" onPress={reader.retry} style={styles.action}>
            <Text style={styles.actionText}>Kiểm tra lại</Text>
          </TouchableOpacity>}
          <TouchableOpacity testID="rfid-attendance-toggle" accessibilityRole="button" accessibilityState={{ expanded }}
            disabled={!!reader.busyId} onPress={() => setExpanded(previous => !previous)} style={styles.action}>
            <Text style={styles.actionText}>{expanded ? 'Thu gọn lượt quẹt' : 'Xem lượt quẹt'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      {(expanded || needsAction) && <RfidAttendancePanel reader={reader} phaseFilter={phaseFilter} compact={!expanded} />}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8, marginBottom: 12 },
  status: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingTop: 9 },
  ready: { backgroundColor: '#F0FAF5', borderColor: '#BEE2CC' },
  wait: { backgroundColor: '#FFF8E9', borderColor: '#F2D593' },
  label: { fontSize: 13, fontWeight: '700', color: colors.foreground },
  help: { fontSize: 12, color: colors.mutedText, marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  action: { minHeight: 44, justifyContent: 'center' },
  actionText: { fontSize: 13, fontWeight: '700', color: attendantTheme.colors.primary },
});
