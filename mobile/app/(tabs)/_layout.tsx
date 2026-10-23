import React from 'react';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

export default function TabLayout() {
  const { user, isLoading } = useAuth();

  const isParent = user?.role === 'PARENT';
  const isDriverOrAttendant =
    user?.role === 'DRIVER' || user?.role === 'BUS_ATTENDANT';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#D97706', // Amber-600 for high-contrast on white/yellow
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTitleStyle: {
          color: colors.foreground,
          fontWeight: '700',
        },
      }}
    >
      {/* Tab 1: Trang chủ (Tất cả vai trò) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          headerTitle: 'RoadToSchool',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={22}
              color={focused ? '#D97706' : '#94A3B8'}
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
              color={focused ? '#D97706' : '#94A3B8'}
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
              color={focused ? '#D97706' : '#94A3B8'}
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
              color={focused ? '#D97706' : '#94A3B8'}
            />
          ),
        }}
      />
    </Tabs>
  );
}
