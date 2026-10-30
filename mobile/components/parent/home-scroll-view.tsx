import { cloneElement, type ReactNode, useRef, useState } from 'react';
import { Animated, Pressable, ScrollViewProps, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import { NotificationBell } from '@/components/notification-bell';
import { UserAvatar } from '@/components/user-avatar';

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
  const offset = useRef(new Animated.Value(0)).current;
  const [rowHeight, setRowHeight] = useState(48);
  const [labelHeight, setLabelHeight] = useState(22);
  const [viewport, setViewport] = useState(0);
  const [compact, setCompact] = useState(false);
  const collapsedHeight = insets.top + rowHeight + 24;
  const cardHeight = 12 + 48 + 8 + labelHeight + 12;
  const expandedHeight = collapsedHeight + 16 + cardHeight + 16;
  const distance = expandedHeight - collapsedHeight;
  const interpolate = (from: number, to: number) => offset.interpolate({
    inputRange: [0, distance], outputRange: [from, to], extrapolate: 'clamp',
  });
  const fade = offset.interpolate({ inputRange: [0, distance * 0.55, distance], outputRange: [1, 0, 0], extrapolate: 'clamp' });
  const actions = [
    { label: 'Báo nghỉ', icon: 'calendar-outline' as const, onPress: onOpenLeave },
    { label: 'Đổi điểm', icon: 'location-outline' as const, onPress: onChangeStop },
  ];

  return <View style={[style, styles.screen]} onLayout={event => setViewport(event.nativeEvent.layout.height)}>
    <Animated.ScrollView {...props} style={styles.scroll}
      refreshControl={refreshControl ? cloneElement(refreshControl, { progressViewOffset: expandedHeight }) : undefined}
      contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false}
      scrollEventThrottle={16}
      contentContainerStyle={[contentContainerStyle, { paddingTop: expandedHeight + 8,
        // Short/empty pages still have enough scroll travel to reach the compact header.
        minHeight: viewport + distance }]}
      onLayout={onLayout}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: offset } } }], {
        useNativeDriver: false,
        listener: event => {
          const y = (event as { nativeEvent: { contentOffset: { y: number } } }).nativeEvent.contentOffset.y;
          setCompact(previous => previous === (y >= distance * 0.55) ? previous : y >= distance * 0.55);
          onScroll?.(event as Parameters<NonNullable<ScrollViewProps['onScroll']>>[0]);
        },
      })}>
      {children}
    </Animated.ScrollView>

    <Animated.View style={[styles.header, { height: interpolate(expandedHeight, collapsedHeight),
      paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <View style={styles.frame}>
        <View style={styles.row} onLayout={event => setRowHeight(event.nativeEvent.layout.height)}>
          <Animated.View style={[styles.avatar, { transform: [{ scale: interpolate(1, 0.8) }] }]}>
            <UserAvatar avatarUrl={avatarUrl} fullName={fullName} size={48} />
          </Animated.View>
          <Animated.View pointerEvents="none" accessibilityElementsHidden={compact}
            importantForAccessibility={compact ? 'no-hide-descendants' : 'auto'} aria-hidden={compact}
            style={[styles.greeting, { opacity: fade }]}>
            <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>Xin chào{fullName ? `, ${fullName}` : ''}</Text>
            <Text numberOfLines={1} style={styles.subtitle}>Đồng hành cùng con mỗi ngày</Text>
          </Animated.View>
          {notification ?? <NotificationBell />}
        </View>
        <Animated.View style={[styles.actions, {
          top: interpolate(rowHeight + 30, 14 + (rowHeight - 48) / 2),
          left: interpolate(16, 76), right: interpolate(16, 76),
          height: interpolate(cardHeight, 48),
          paddingTop: interpolate(12, 0),
          backgroundColor: offset.interpolate({ inputRange: [0, distance], outputRange: [colors.surface, colors.background], extrapolate: 'clamp' }),
          shadowOpacity: interpolate(0.07, 0), elevation: interpolate(3, 0),
        }]}>
          {actions.map(action => <View key={action.label} style={styles.actionSlot}>
            <Pressable accessibilityRole="button" accessibilityLabel={action.label} onPress={action.onPress}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
              <Ionicons name={action.icon} size={22} color={colors.navigationActive} accessible={false} />
            </Pressable>
            <Animated.View pointerEvents="none" aria-hidden accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants" style={{ opacity: fade }}>
              <Text style={styles.label} numberOfLines={2}
                onLayout={event => {
                  const measuredHeight = event.nativeEvent.layout.height;
                  setLabelHeight(height => Math.max(height, measuredHeight));
                }}>{action.label}</Text>
            </Animated.View>
          </View>)}
        </Animated.View>
      </View>
    </Animated.View>
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
