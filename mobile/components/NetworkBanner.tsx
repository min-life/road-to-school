import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors } from '@/constants/theme';

interface NetworkBannerProps {
  onRetry: () => void;
  isRetrying?: boolean;
}

export function NetworkBanner({ onRetry, isRetrying = false }: NetworkBannerProps) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <View style={styles.textContainer}>
        <Text style={styles.title}>Không thể kết nối máy chủ</Text>
        <Text style={styles.message}>Vui lòng kiểm tra lại đường truyền mạng của thiết bị.</Text>
      </View>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={onRetry}
        disabled={isRetrying}
        activeOpacity={0.7}
      >
        {isRetrying ? (
          <ActivityIndicator size="small" color={colors.foreground} />
        ) : (
          <Text style={styles.retryText}>Thử lại</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 99,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  message: {
    fontSize: 11,
    color: '#B45309',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.foreground,
  },
});
