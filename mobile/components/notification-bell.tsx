import { TouchableOpacity, View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';
import { useNotifications } from '@/context/notifications-context';
import { navigationMetrics } from '@/constants/navigation';

export function NotificationBell({ style }: { style?: StyleProp<ViewStyle> }) {
  const { summary } = useNotifications();
  const router = useRouter();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Thông báo${summary ? `, ${summary.unreadCount} chưa đọc` : ''}`}
      onPress={() => router.push('/notifications')}
      style={[styles.button, style]}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="notifications-outline" size={23} color={colors.foreground} />
        {!!summary?.unreadCount && <View style={styles.dot} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: navigationMetrics.actionSize,
    height: navigationMetrics.actionSize,
    borderRadius: navigationMetrics.actionSize / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
});
