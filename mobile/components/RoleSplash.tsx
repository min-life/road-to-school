import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { Role } from '@/services/api-client';
import { colors } from '@/constants/theme';

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

  let roleTitle = 'Người dùng';
  let roleIcon = '👤';

  switch (role) {
    case 'DRIVER':
      roleTitle = 'Tài xế';
      roleIcon = '🚗';
      break;
    case 'BUS_ATTENDANT':
      roleTitle = 'Nhân viên phụ trách xe';
      roleIcon = '📋';
      break;
    case 'PARENT':
      roleTitle = 'Phụ huynh học sinh';
      roleIcon = '👨‍👩‍👧';
      break;
  }

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          {role === 'DRIVER' ? (
            <Image
              source={require('@/assets/driver/Bus.png')}
              style={styles.busIcon}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.iconText}>{roleIcon}</Text>
          )}
        </View>

        <Text style={styles.roleTitle}>{roleTitle}</Text>
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
  busIcon: {
    width: 50,
    height: 50,
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
