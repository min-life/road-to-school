import { AppAlert as Alert } from '@/services/app-alert';
import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, type StaffTheme } from '@/constants/theme';
import { phoneDialUrl } from '@/utils/phone-link';

/** Opens the system phone app; a missing number stays tappable to explain the error. */
export function TripContactCallButton({ phone, contactLabel, staffTheme }: {
  phone?: string | null;
  contactLabel: string;
  staffTheme?: StaffTheme;
}) {
  const buttons = staffTheme?.buttons;
  const [opening, setOpening] = useState(false);
  const openingRef = useRef(false);
  const iconColor = staffTheme?.colors.primary ?? colors.foreground;

  const handlePress = async () => {
    if (openingRef.current) return;
    if (typeof phone !== 'string' || !phone.trim()) {
      Alert.alert('Không có số điện thoại', `Chưa có số điện thoại của ${contactLabel}.`);
      return;
    }
    const url = phoneDialUrl(phone);
    if (!url) {
      Alert.alert('Số điện thoại không hợp lệ', `Không thể mở số điện thoại của ${contactLabel}.`);
      return;
    }
    openingRef.current = true;
    setOpening(true);
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Không thể mở bàn phím gọi điện', 'Vui lòng kiểm tra ứng dụng Điện thoại trên thiết bị.');
    } finally {
      openingRef.current = false;
      setOpening(false);
    }
  };

  return <Pressable accessibilityRole="button" accessibilityLabel={`Gọi ${contactLabel}`}
    accessibilityHint="Mở bàn phím gọi điện" accessibilityState={{ disabled: opening, busy: opening }}
    disabled={opening} onPress={handlePress}
    style={({ pressed }) => [styles.button, buttons?.secondary,
      pressed && styles.pressed, opening && (buttons?.disabled ?? styles.opening)]}>
    {opening ? <ActivityIndicator size="small" color={iconColor} />
      : <Ionicons name="call-outline" size={20} color={iconColor} accessible={false} />}
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  pressed: { opacity: 0.7 },
  opening: { opacity: 0.6 },
});
