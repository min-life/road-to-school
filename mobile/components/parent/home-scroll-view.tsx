import { cloneElement, type ReactNode, useState } from 'react';
import { Pressable, ScrollView, ScrollViewProps, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import { NotificationBell } from '@/components/notification-bell';
import { UserAvatar } from '@/components/user-avatar';

const COLLAPSE_THRESHOLD = 8;

type Props = ScrollViewProps & {
  fullName?: string;
  avatarUrl?: string | null;
  onOpenLeave?: () => void;
  onChangeStop?: () => void;
  /** Optional presentation slot; the app uses its existing NotificationBell by default. */
  notification?: ReactNode;
};

/** V1 expanded/compact presentation. Owns scrolling only; no business requests. */
export function ParentHomeScrollView({ fullName, avatarUrl, onOpenLeave, onChangeStop,
  notification, refreshControl, style, contentContainerStyle, onScroll, onLayout, children, ...props }: Props) {
  const insets = useSafeAreaInsets();
  const [rowHeight, setRowHeight] = useState(48);
  const [labelHeight, setLabelHeight] = useState(22);
  const [viewport, setViewport] = useState(0);
  const [compact, setCompact] = useState(false);
  const collapsedHeight = insets.top + rowHeight + 24;
  const cardHeight = 12 + 48 + 8 + labelHeight + 12;
  const expandedHeight = collapsedHeight + 16 + cardHeight + 16;
  const headerHeight = compact ? collapsedHeight : expandedHeight;
  const actions = [
    { label: 'Báo nghỉ', icon: 'calendar-outline' as const, onPress: onOpenLeave },
    { label: 'Đổi điểm', icon: 'location-outline' as const, onPress: onChangeStop },
  ];

  return <View style={[style, styles.screen]} onLayout={event => setViewport(event.nativeEvent.layout.height)}>
    <ScrollView {...props} style={styles.scroll}
      refreshControl={refreshControl ? cloneElement(refreshControl, { progressViewOffset: expandedHeight }) : undefined}
      contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false}
      scrollEventThrottle={16}
      contentContainerStyle={[contentContainerStyle, { paddingTop: headerHeight + 8,
        // A short/empty page needs only enough travel to cross the snap threshold.
        minHeight: viewport + COLLAPSE_THRESHOLD + 1 }]}
      onLayout={onLayout}
      onScroll={event => {
        const y = event.nativeEvent.contentOffset.y;
        // Commit the whole header at once; never drag the utility background across the avatar.
        // Reopen only at the top so small movements around the collapse threshold cannot flicker.
        setCompact(previous => previous ? y > 0 : y > COLLAPSE_THRESHOLD);
        onScroll?.(event);
      }}>
      {children}
    </ScrollView>

    <View style={[styles.header, { height: headerHeight,
      paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <View style={styles.frame}>
        <View style={styles.row} onLayout={event => setRowHeight(event.nativeEvent.layout.height)}>
          <View style={[styles.avatar, { transform: [{ scale: compact ? 0.8 : 1 }] }]}>
            <UserAvatar avatarUrl={avatarUrl} fullName={fullName} size={48} />
          </View>
          <View pointerEvents="none" accessibilityElementsHidden={compact}
            importantForAccessibility={compact ? 'no-hide-descendants' : 'auto'} aria-hidden={compact}
            style={[styles.greeting, { opacity: compact ? 0 : 1 }]}>
            <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>Xin chào{fullName ? `, ${fullName}` : ''}</Text>
            <Text numberOfLines={1} style={styles.subtitle}>Đồng hành cùng con mỗi ngày</Text>
          </View>
          {notification ?? <NotificationBell />}
        </View>
        <View style={[styles.actions, {
          top: compact ? 14 + (rowHeight - 48) / 2 : rowHeight + 30,
          left: compact ? 76 : 16, right: compact ? 76 : 16,
          height: compact ? 48 : cardHeight,
          paddingTop: compact ? 0 : 12,
          backgroundColor: compact ? colors.background : colors.surface,
          shadowOpacity: compact ? 0 : 0.07, elevation: compact ? 0 : 3,
        }]}>
          {actions.map(action => <View key={action.label} style={styles.actionSlot}>
            <Pressable accessibilityRole="button" accessibilityLabel={action.label} onPress={action.onPress}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
              <Ionicons name={action.icon} size={22} color={colors.navigationActive} accessible={false} />
            </Pressable>
            <View pointerEvents="none" aria-hidden accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants" style={{ opacity: compact ? 0 : 1 }}>
              <Text style={styles.label} numberOfLines={2}
                onLayout={event => {
                  const measuredHeight = event.nativeEvent.layout.height;
                  setLabelHeight(height => Math.max(height, measuredHeight));
                }}>{action.label}</Text>
            </View>
          </View>)}
        </View>
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    backgroundColor: colors.background, overflow: 'hidden', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  frame: { width: '100%', maxWidth: 560, alignSelf: 'center', flex: 1 },
  row: { paddingTop: 0, marginTop: 14, marginHorizontal: 16, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  greeting: { flex: 1, minWidth: 0 },
  title: { color: colors.foreground, fontSize: 19, lineHeight: 25, fontWeight: '700' },
  subtitle: { color: colors.mutedText, fontSize: 12, lineHeight: 18, marginTop: 2 },
  actions: { position: 'absolute', borderRadius: 16, flexDirection: 'row', justifyContent: 'space-evenly',
    shadowColor: colors.navigationShadow, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8 },
  actionSlot: { flex: 1, alignItems: 'center' },
  action: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.navigationHighlight, alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 8, paddingHorizontal: 4, fontSize: 11, lineHeight: 18, fontWeight: '700', color: colors.foreground, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
