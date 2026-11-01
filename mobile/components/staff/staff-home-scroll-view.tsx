import { cloneElement, type ReactElement, type ReactNode, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  ScrollViewProps,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { NotificationBell } from '@/components/notification-bell';
import { UserAvatar } from '@/components/user-avatar';
import { Role } from '@/services/api-client';

type StaffHomeScrollViewProps = ScrollViewProps & {
  fullName?: string;
  avatarUrl?: string | null;
  userRole?: Role;
  subTitle?: string;
  onOpenLeave?: () => void;
  onOpenIncident?: () => void;
  notification?: ReactNode;
  refreshControl?: ReactElement<any>;
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ROW_MARGIN_TOP = 14;
const TOP_BAR_HEIGHT = 48;
const CARD_HEIGHT = 86;

export function StaffHomeScrollView({
  fullName,
  avatarUrl,
  userRole,
  subTitle,
  onOpenLeave,
  onOpenIncident,
  notification,
  refreshControl,
  style,
  contentContainerStyle,
  onScroll,
  onLayout,
  children,
  ...props
}: StaffHomeScrollViewProps) {
  const insets = useSafeAreaInsets();
  const offset = useRef(new Animated.Value(0)).current;
  const [viewport, setViewport] = useState(0);

  const isDriver = userRole === 'DRIVER';
  const roleBadgeLabel = isDriver ? '🚌 TÀI XẾ' : '📋 GIÁO VIÊN XE';
  const defaultSub = isDriver ? 'Bãi xe trung tâm' : 'Trường học đối tác';
  const displaySub = subTitle || defaultSub;

  const collapsedHeight = insets.top + ROW_MARGIN_TOP + TOP_BAR_HEIGHT + 10;
  const expandedHeight = collapsedHeight + 14 + CARD_HEIGHT;
  const distance = expandedHeight - collapsedHeight;

  const interpolate = (from: number, to: number) =>
    offset.interpolate({
      inputRange: [0, distance],
      outputRange: [from, to],
      extrapolate: 'clamp',
    });

  // Fade out identity texts and action labels
  const fade = offset.interpolate({
    inputRange: [0, distance * 0.5, distance],
    outputRange: [1, 0, 0],
    extrapolate: 'clamp',
  });

  // Border and card background fade out completely so no box wraps icons in compact state
  const cardBorderWidth = offset.interpolate({
    inputRange: [0, distance * 0.4],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const cardBorderColor = offset.interpolate({
    inputRange: [0, distance * 0.4],
    outputRange: ['rgba(237, 232, 221, 1)', 'rgba(237, 232, 221, 0)'],
    extrapolate: 'clamp',
  });

  const cardBackground = offset.interpolate({
    inputRange: [0, distance * 0.4],
    outputRange: ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 0)'],
    extrapolate: 'clamp',
  });

  const cardShadowOpacity = offset.interpolate({
    inputRange: [0, distance * 0.4],
    outputRange: [0.07, 0],
    extrapolate: 'clamp',
  });

  const cardElevation = offset.interpolate({
    inputRange: [0, distance * 0.4],
    outputRange: [3, 0],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={[style, styles.screen]}
      onLayout={(event) => {
        const h = event.nativeEvent.layout.height;
        if (h > 0) setViewport(h);
      }}
    >
      <Animated.ScrollView
        {...props}
        style={styles.scroll}
        refreshControl={
          refreshControl
            ? cloneElement(refreshControl, {
                progressViewOffset: expandedHeight,
              })
            : undefined
        }
        bounces={true}
        alwaysBounceVertical={true}
        overScrollMode="always"
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        scrollEventThrottle={16}
        contentContainerStyle={[
          contentContainerStyle,
          {
            paddingTop: expandedHeight + 8,
            minHeight: (viewport || SCREEN_HEIGHT) + distance + 160,
            paddingBottom: 80,
          },
        ]}
        onLayout={onLayout}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: offset } } }],
          {
            useNativeDriver: false,
            listener: (event) => {
              onScroll?.(
                event as Parameters<
                  NonNullable<ScrollViewProps['onScroll']>
                >[0]
              );
            },
          }
        )}
      >
        {children}
      </Animated.ScrollView>

      {/* Animated Sticky & Collapsible Header */}
      <Animated.View
        style={[
          styles.header,
          {
            height: interpolate(expandedHeight, collapsedHeight),
            paddingTop: insets.top,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
      >
        <View style={styles.frame}>
          {/* Top Row: Avatar + Name/Role + Notification Bell */}
          <View style={styles.row}>
            <Animated.View
              style={[
                styles.avatarWrap,
                { transform: [{ scale: interpolate(1, 0.82) }] },
              ]}
            >
              <UserAvatar avatarUrl={avatarUrl} fullName={fullName} size={48} />
            </Animated.View>

            <Animated.View
              pointerEvents="none"
              style={[styles.identity, { opacity: fade }]}
            >
              <Text
                accessibilityRole="header"
                numberOfLines={1}
                style={styles.fullName}
              >
                {fullName || 'Nhân sự vận hành'}
              </Text>
              <View style={styles.badgeRow}>
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>{roleBadgeLabel}</Text>
                </View>
                <Text numberOfLines={1} style={styles.subText}>
                  • {displaySub}
                </Text>
              </View>
            </Animated.View>

            <View style={styles.bellWrap}>
              {notification ?? <NotificationBell />}
            </View>
          </View>

          {/* Quick Actions (Báo nghỉ & Sự cố) */}
          {/* In expanded state: White card with border & shadow below the row */}
          {/* In compact state: NO border, NO background box, strictly horizontally aligned with Avatar & Bell */}
          <Animated.View
            style={[
              styles.actionsContainer,
              {
                top: interpolate(
                  ROW_MARGIN_TOP + TOP_BAR_HEIGHT + 14,
                  ROW_MARGIN_TOP
                ),
                left: interpolate(16, 70),
                right: interpolate(16, 70),
                height: interpolate(CARD_HEIGHT, TOP_BAR_HEIGHT),
                borderWidth: cardBorderWidth,
                borderColor: cardBorderColor,
                backgroundColor: cardBackground,
                shadowOpacity: cardShadowOpacity,
                elevation: cardElevation,
              },
            ]}
          >
            {/* Slot 1: Báo nghỉ */}
            <View style={styles.actionSlot}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Báo nghỉ"
                onPress={onOpenLeave}
                style={({ pressed }) => [
                  styles.actionBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Image
                  source={require('@/assets/driver/leave.png')}
                  style={styles.actionIcon}
                  resizeMode="contain"
                />
              </Pressable>
              <Animated.View
                pointerEvents="none"
                style={[styles.labelContainer, { opacity: fade }]}
              >
                <Text style={styles.actionLabel} numberOfLines={1}>
                  Báo nghỉ
                </Text>
              </Animated.View>
            </View>

            {/* Slot 2: Sự cố */}
            <View style={styles.actionSlot}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Báo sự cố"
                onPress={onOpenIncident}
                style={({ pressed }) => [
                  styles.actionBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Image
                  source={require('@/assets/driver/Incident.png')}
                  style={styles.actionIcon}
                  resizeMode="contain"
                />
              </Pressable>
              <Animated.View
                pointerEvents="none"
                style={[styles.labelContainer, { opacity: fade }]}
              >
                <Text style={styles.actionLabel} numberOfLines={1}>
                  Sự cố
                </Text>
              </Animated.View>
            </View>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: colors.background,
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  frame: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    flex: 1,
  },
  row: {
    marginTop: ROW_MARGIN_TOP,
    marginHorizontal: 16,
    height: TOP_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
    marginRight: 8,
    justifyContent: 'center',
  },
  fullName: {
    color: colors.foreground,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  rolePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  rolePillText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    color: '#B45309',
  },
  subText: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 16,
    flexShrink: 1,
  },
  bellWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsContainer: {
    position: 'absolute',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    shadowColor: colors.navigationShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
  },
  actionSlot: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.navigationHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    width: 28,
    height: 28,
  },
  labelContainer: {
    position: 'absolute',
    top: 52,
    left: -20,
    right: -20,
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
