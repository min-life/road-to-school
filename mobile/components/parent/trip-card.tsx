import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { UserAvatar } from '@/components/user-avatar';
import { parentHomeStyles } from '@/components/parent/home-styles';
import { colors } from '@/constants/theme';
import { useReducedMotionPreference } from '@/hooks/use-reduced-motion-preference';
import { journeyTones } from '@/constants/parent-journey';
import type { StudentJourneyBadge } from '@/utils/parent-journey-stage';

type Props = {
  studentName: string;
  avatarUrl?: string | null;
  schoolName: string;
  status: { label: string; bg: string; text: string };
  children: ReactNode;
  journey?: (active: boolean) => ReactNode;
  studentStatus?: StudentJourneyBadge;
  hasIncident?: boolean;
  attention?: boolean;
  stale?: boolean;
};

/** Owns disclosure only; the parent keeps trip data, permissions and action handlers. */
export function ParentTripCard({ studentName, avatarUrl, schoolName, status, children, journey, studentStatus, hasIncident, attention, stale }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const height = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotionPreference();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 360 || fontScale >= 1.4;
  const cardTone = studentStatus ? journeyTones[studentStatus.tone] : attention ? journeyTones.warning : undefined;
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;

  useEffect(() => {
    height.stopAnimation(); reveal.stopAnimation();
    const target = expanded ? contentHeight : 0;
    const finish = () => { if (!expandedRef.current) setVisible(false); };
    if (reduced) { height.setValue(target); reveal.setValue(expanded ? 1 : 0); finish(); return; }
    const animation = Animated.parallel([
      Animated.timing(height, { toValue: target, duration: expanded ? 260 : 200, easing: Easing.out(Easing.cubic), useNativeDriver: false, isInteraction: false }),
      Animated.timing(reveal, { toValue: expanded ? 1 : 0, duration: expanded ? 220 : 160, useNativeDriver: false, isInteraction: false }),
    ]);
    animation.start(({ finished }) => { if (finished) finish(); });
    return () => animation.stop();
  }, [expanded, contentHeight, height, reveal, reduced]);

  return (
    <View style={[parentHomeStyles.tripCard, styles.card, expanded && styles.expandedCard, cardTone && { borderColor: cardTone.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${studentName}, ${schoolName}, ${status.label}${studentStatus ? ', ' + studentStatus.label : ''}${hasIncident ? ', Chuyến có sự cố' : ''}${stale ? ', Chưa cập nhật đầy đủ' : ''}`}
        accessibilityHint={expanded ? 'Thu gọn thông tin chuyến xe' : 'Mở rộng thông tin chuyến xe'}
        accessibilityState={{ expanded }}
        aria-expanded={expanded}
        onPress={() => { setVisible(true); setExpanded(value => !value); }}
        style={({ pressed }) => [styles.summary, cardTone && { backgroundColor: cardTone.bg }, pressed && styles.pressed]}
      >
        {/* Student photo comes from the card, independently of the parent's profile photo. */}
        <UserAvatar avatarUrl={avatarUrl} fullName={studentName} size={48} />
        <View style={parentHomeStyles.identity}>
          <View style={[styles.nameStatusRow, stacked && styles.stacked]}>
            <Text style={[parentHomeStyles.studentName, styles.name]}>{studentName}</Text>
            <View style={[styles.status, stacked && styles.stackedStatus]}>
              <View style={[parentHomeStyles.statusPill, { backgroundColor: status.bg }]}>
                <Text style={[parentHomeStyles.statusPillText, { color: status.text }]}>
                  {status.label}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.schoolRow}>
            <Text style={[parentHomeStyles.metaText, styles.school]}>{schoolName}</Text>
            <Animated.View aria-hidden style={[styles.chevron, { transform: [{ rotate: reveal.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }]}>
              <Ionicons name="chevron-down" size={16} color={colors.navigationActive} accessible={false} />
            </Animated.View>
          </View>
          {(studentStatus || hasIncident || stale) && <View style={styles.studentTags}>
            {studentStatus && <View style={[styles.studentBadge, { backgroundColor: journeyTones[studentStatus.tone].bg, borderColor: journeyTones[studentStatus.tone].border }]}>
              <Ionicons name={studentStatus.icon} size={14} color={journeyTones[studentStatus.tone].text} accessible={false} />
              <Text style={[styles.studentBadgeText, { color: journeyTones[studentStatus.tone].text }]}>{studentStatus.label}</Text>
            </View>}
            {hasIncident && <View style={[styles.studentBadge, styles.incidentBadge]}>
              <Ionicons name="warning-outline" size={14} color={journeyTones.danger.text} accessible={false} />
              <Text style={[styles.studentBadgeText, styles.incidentText]}>Chuyến có sự cố</Text>
            </View>}
            {stale && <Text style={styles.stale}>Chưa cập nhật đầy đủ</Text>}
          </View>}
        </View>
      </Pressable>
      <Animated.View
        style={{ height, overflow: 'hidden' }}
        pointerEvents={expanded ? 'auto' : 'none'}
        accessibilityElementsHidden={!expanded}
        importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
        aria-hidden={!expanded}
      >
        <View style={[styles.details, !visible && styles.hidden]} onLayout={event => {
          const measured = event.nativeEvent.layout.height;
          if (measured > 0) setContentHeight(measured);
        }}>
          {journey?.(expanded)}
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    gap: 0,
    borderLeftWidth: 4,
  },
  expandedCard: { borderColor: colors.primary },
  studentTags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8 },
  studentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderRadius: 9, maxWidth: '100%' },
  studentBadgeText: { flexShrink: 1, fontSize: 11, lineHeight: 17, fontWeight: '700' },
  incidentBadge: { backgroundColor: journeyTones.danger.bg, borderColor: journeyTones.danger.border },
  incidentText: { color: journeyTones.danger.text },
  stale: { fontSize: 10, lineHeight: 16, color: colors.mutedText },
  stacked: { flexDirection: 'column', gap: 6 },
  stackedStatus: { maxWidth: '100%' },
  chevron: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.navigationHighlight, alignItems: 'center', justifyContent: 'center' },
  summary: {
    minHeight: 80,
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  nameStatusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  name: {
    flex: 1,
    minWidth: 0,
  },
  status: {
    maxWidth: '48%',
    flexShrink: 0,
  },
  schoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  school: {
    flex: 1,
    minWidth: 0,
    marginTop: 0,
  },
  details: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    padding: 16,
    gap: 14,
  },
  hidden: { display: 'none' },
  pressed: {
    opacity: 0.75,
  },
});
