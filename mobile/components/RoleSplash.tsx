import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { Role } from '@/services/api-client';
import { colors } from '@/constants/theme';
import { AppLoadingSplash } from '@/components/app-loading-splash';
import { ParentLoginSplash } from '@/components/parent/login-splash';

interface RoleSplashProps {
  role: Role;
  onFinish: () => void;
  durationMs?: number;
}

export function RoleSplash({
  role,
  onFinish,
  durationMs = 1200,
}: RoleSplashProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: durationMs,
      useNativeDriver: false,
    }).start(() => {
      onFinish();
    });
  }, [durationMs, onFinish, progressAnim]);

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (role === 'PARENT') return <ParentLoginSplash progressWidth={barWidth} />;

  if (role === 'DRIVER' || role === 'BUS_ATTENDANT') {
    const isDriver = role === 'DRIVER';
    return (
      <AppLoadingSplash
        message="Đang mở trang chủ..."
        progressWidth={barWidth}
        illustration={
          <View style={styles.illustration}>
            <Image
              source={isDriver
                ? require('@/assets/driver/login-splash.png')
                : require('@/assets/images/brand/bus-attendant-splash.png')}
              style={styles.image}
              resizeMode="contain"
              accessibilityRole="image"
              accessibilityLabel={isDriver ? 'RoadToSchool dành cho tài xế' : 'RoadToSchool dành cho phụ xe'}
            />
          </View>
        }
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>👤</Text>
        </View>

        <Text style={styles.roleTitle}>Người dùng</Text>
        <Text style={styles.subtitle}>Đang khởi tạo không gian làm việc...</Text>

        {/* Loader bar */}
        <View style={styles.progressBarBackground}>
          <Animated.View style={[styles.progressBarFill, { width: barWidth }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  illustration: { width: '100%', maxWidth: 240, aspectRatio: 1 },
  image: { width: '100%', height: '100%' },
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255, 203, 86, 0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255, 203, 86, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconText: {
    fontSize: 40,
  },
  roleTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedText,
    marginBottom: 28,
    textAlign: 'center',
  },
  progressBarBackground: {
    width: 180,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
});
