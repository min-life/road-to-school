import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, type StaffTheme } from '../constants/theme';
import type { LocationSource } from '../services/trip-navigation';
import type { nextGuidance } from '../utils/trip-navigation';

interface Props {
  staffTheme?: StaffTheme;
  isDriver?: boolean;
  canPublish: boolean; testMode: boolean; mode: LocationSource | null;
  guidance: ReturnType<typeof nextGuidance>; message: string | null; targetName?: string;
  freshness?: string; historyLabel?: string; hasGaps?: boolean;
  hasLocalPosition?: boolean;
  showPlanned?: boolean; selectPlan?: (planned: boolean) => void;
  change: (source?: LocationSource) => Promise<void>;
  retry?: () => Promise<void>;
  canRetry?: boolean;
  speedKmh?: number;
  onIncreaseSpeed?: () => void;
  onDecreaseSpeed?: () => void;
}
export function TripNavigationControls(p: Props) {
  const { staffTheme } = p;
  const buttons = staffTheme?.buttons;
  const selectedStyle = buttons?.selected ?? styles.selected;
  const selectedText = buttons?.secondaryText;
  const speed = p.speedKmh ?? 30;
  const slowest = speed <= 10;
  const fastest = speed >= 120;
  const speedStyle = buttons?.secondary;
  const speedDisabled = buttons?.disabled ?? styles.speedBtnDisabled;
  const button = (title: string, source: LocationSource) => <Pressable key={source}
    accessibilityRole="button" accessibilityState={{ selected: p.mode === source }}
    onPress={() => { void p.change(source); }}
    style={[styles.button, p.testMode && styles.modeButton, p.mode === source && selectedStyle]}>
    <Text style={[styles.text, p.testMode && styles.modeText, p.mode === source && selectedText]}>{title}</Text></Pressable>;
  return <View style={styles.card}>
    {!!p.historyLabel && <Text style={styles.text}>{p.historyLabel}{p.hasGaps ? ' · Có đoạn chưa ghi nhận' : ''}</Text>}
    {p.selectPlan && <View style={styles.row}>
      <Pressable onPress={() => p.selectPlan?.(false)} style={[styles.button, !p.showPlanned && selectedStyle]}>
        <Text style={[styles.text, !p.showPlanned && selectedText]}>Hành trình ghi nhận</Text>
      </Pressable>
      <Pressable onPress={() => p.selectPlan?.(true)} style={[styles.button, p.showPlanned && selectedStyle]}>
        <Text style={[styles.text, p.showPlanned && selectedText]}>Tuyến dự kiến</Text>
      </Pressable>
    </View>}
    {!p.historyLabel && <Text style={styles.small}>
      {p.hasLocalPosition ? (p.mode === 'LIVE' ? 'GPS trực tiếp' : (p.mode ? 'Vị trí xe' : 'Sẵn sàng điều hướng'))
        : (p.freshness === 'NONE' ? 'Chưa có vị trí' : p.freshness === 'STALE' ? 'Mất cập nhật' : 'Vị trí xe')}
    </Text>}
    {!!p.message && (
      <View style={styles.messageRow}>
        <Text style={[styles.text, { flex: 1 }]}>
          {p.message === 'ROUTING_UNAVAILABLE' ? 'Chưa thể tải tuyến đường' : p.message}
        </Text>
        {p.canRetry && !!p.retry && (
          <Pressable accessibilityRole="button" onPress={() => { void p.retry?.(); }}
            style={[styles.retryBtn, buttons?.secondary]}>
            <Text style={[styles.retryText, selectedText]}>Thử lại</Text>
          </Pressable>
        )}
      </View>
    )}
    {p.guidance && <><Text style={styles.guidance}>{p.guidance.text.charAt(0).toUpperCase() + p.guidance.text.slice(1)} · {p.guidance.metres} m</Text>
      {!!p.guidance.streetName && <Text style={styles.small}>{p.guidance.streetName}</Text>}</>}
    {p.mode && !p.guidance && !p.message && <Text style={styles.small}>Đang cập nhật chỉ dẫn</Text>}
    {!!p.targetName && <Text numberOfLines={1} style={styles.small}>Điểm tiếp theo: {p.targetName}</Text>}
    {(p.canPublish || (p.testMode && !!p.mode)) && <View style={[styles.row, p.testMode && styles.modeRow]}>
      {p.canPublish && <>
      {!p.testMode && button('Điều hướng', 'LIVE')}
      {p.testMode && <>{button('Tự động di chuyển', 'TEST_AUTO')}{button('Lái thủ công', 'TEST_JOYSTICK')}</>}
      {!p.testMode && !!p.mode && <Pressable accessibilityRole="button" onPress={() => { void p.change(); }} style={styles.button}>
        <Text style={styles.text}>Dừng</Text></Pressable>}
      </>}
    {p.testMode && !!p.mode && (
        <View style={styles.speedStepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Giảm tốc độ"
            disabled={p.isDriver && slowest}
            onPress={p.onDecreaseSpeed}
            style={[styles.speedBtn, speedStyle, slowest && speedDisabled]}
          >
            <Text style={[styles.speedBtnText, selectedText, slowest && buttons?.disabledText]}>−</Text>
          </Pressable>
          <Text style={styles.speedValueText}>{speed} km/h</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tăng tốc độ"
            disabled={p.isDriver && fastest}
            onPress={p.onIncreaseSpeed}
            style={[styles.speedBtn, speedStyle, fastest && speedDisabled]}
          >
            <Text style={[styles.speedBtnText, selectedText, fastest && buttons?.disabledText]}>+</Text>
          </Pressable>
        </View>
    )}
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 10, gap: 5 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  messageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  button: { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, padding: 9, borderRadius: 10 },
  retryBtn: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  retryText: { color: colors.foreground, fontSize: 12, fontWeight: '700' },
  selected: { backgroundColor: colors.primary },
  text: { color: colors.foreground, fontSize: 12, fontWeight: '600' },
  small: { color: colors.mutedText, fontSize: 11 }, guidance: { color: colors.foreground, fontSize: 16, fontWeight: '700' },
  modeRow: { flexWrap: 'nowrap', alignItems: 'center', gap: 4 },
  modeButton: { flex: 1, minWidth: 0, paddingHorizontal: 4, alignItems: 'center' },
  modeText: { fontSize: 11, textAlign: 'center' },
  speedStepper: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.background, paddingHorizontal: 4, paddingVertical: 3, borderRadius: 8, borderColor: colors.border, borderWidth: 1 },
  speedBtn: { width: 26, height: 26, borderRadius: 6, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  speedBtnDisabled: { opacity: 0.4 },
  speedBtnText: { fontSize: 16, fontWeight: '700', color: colors.foreground, lineHeight: 18 },
  speedValueText: { fontSize: 11, fontWeight: '700', color: colors.foreground, minWidth: 48, textAlign: 'center' },
});
