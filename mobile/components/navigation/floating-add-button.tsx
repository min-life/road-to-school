import { StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, type StaffTheme } from '@/constants/theme';

/** Clearance for the 58px button, bottom gap and space to reach the last list item. */
export const FLOATING_ADD_CONTENT_INSET = 90;

/** Shared presentation from the Tracking screen; callers own navigation and safe-area offsets. */
export function FloatingAddButton({ label, onPress, disabled = false, bottom = 16, right = 20, staffTheme }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  bottom?: number;
  right?: number;
  staffTheme?: StaffTheme;
}) {
  const buttons = staffTheme?.buttons;
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} activeOpacity={0.85}
    style={[styles.button, { bottom, right },
      disabled ? buttons?.disabled : buttons?.primary,
      disabled && !staffTheme && styles.disabled]}>
    <Ionicons name="add" size={32} color={(disabled ? buttons?.disabledText.color : buttons?.primaryText.color) ?? colors.foreground} accessible={false} />
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  button: { position: 'absolute', width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 6 },
  disabled: { opacity: 0.5 },
});
