import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { NotificationBell } from '@/components/notification-bell';
import { AppHeader } from '@/components/navigation/app-header';
import { TabButton } from '@/components/navigation/tab-button';
import { getTabBarMetrics, navigationMetrics, navigationShadow } from '@/constants/navigation';
import { useNavigationKeyboard } from '@/hooks/use-navigation-keyboard';

export default function TabLayout() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const hideWebTabBar = useNavigationKeyboard();

  const isParent = user?.role === 'PARENT';
  const isDriverOrAttendant =
    user?.role === 'DRIVER' || user?.role === 'BUS_ATTENDANT';

  return (
    <Tabs
      screenOptions={{
        header: ({ options, route }) => <AppHeader
          title={typeof options.headerTitle === 'string' ? options.headerTitle : options.title ?? route.name}
          leading={route.name === 'index' ? <Ionicons name="bus" size={28} color={colors.navigationActive} accessible={false} /> : undefined}
          actions={<NotificationBell />} />,
        tabBarButton: (props) => <TabButton {...props} />,
        tabBarHideOnKeyboard: true,
        tabBarLabelPosition: 'below-icon',
        tabBarActiveTintColor: colors.navigationActive,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarLabelStyle: { fontSize: navigationMetrics.tabLabelSize, lineHeight: 15, fontWeight: '600' },
        tabBarIconStyle: { marginBottom: 4 },
        tabBarStyle: {
          ...navigationShadow,
          ...getTabBarMetrics(insets.bottom, fontScale),
          ...(hideWebTabBar && { display: 'none', height: 0, paddingBottom: 0 }),
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: 10,
        },
      }}
    >
      {/* Tab 1: Trang chủ (Tất cả vai trò) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          headerShown: !isParent,
          headerTitle: 'RoadToSchool',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={22}
              color={focused ? colors.navigationActive : colors.mutedText}
            />
          ),
        }}
      />

      {/* Tab 2A: Theo dõi (Chỉ hiển thị cho PARENT) */}
      <Tabs.Screen
        name="tracking"
        options={{
          title: 'Theo dõi',
          headerShown: false,
          href: isParent ? undefined : null,
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'bus' : 'bus-outline'}
              size={22}
              color={focused ? colors.navigationActive : colors.mutedText}
            />
          ),
        }}
      />

      {/* Tab 2B: Lịch (Chỉ hiển thị cho DRIVER và BUS_ATTENDANT) */}
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Lịch',
          headerShown: false,
          href: isDriverOrAttendant ? undefined : null,
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={22}
              color={focused ? colors.navigationActive : colors.mutedText}
            />
          ),
        }}
      />

      {/* Ẩn route explore cũ */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />

      {/* Tab 3: Cá nhân (Shared Profile cho PARENT, DRIVER, BUS_ATTENDANT) */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Cá nhân',
          headerTitle: 'Hồ sơ cá nhân',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={22}
              color={focused ? colors.navigationActive : colors.mutedText}
            />
          ),
        }}
      />
    </Tabs>
  );
}
