export const colors = {
  primary: '#FFCB56',
  background: '#FFFDF6',
  foreground: '#1E293B',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  mutedText: '#64748B',
  navigationActive: '#996300',
  navigationHighlight: '#FFF3D2',
  navigationShadow: '#17243B',
  success: '#10B981',
  error: '#EF4444',
} as const;

function createStaffTheme(primary: string, secondary: string, disabled: string, disabledText: string) {
  return {
    colors: { primary, secondary, disabled, disabledText },
    buttons: {
      primary: { backgroundColor: primary },
      primaryText: { color: colors.surface },
      secondary: { backgroundColor: secondary },
      secondaryText: { color: primary },
      selected: { backgroundColor: secondary, borderColor: primary },
      disabled: { backgroundColor: disabled },
      disabledText: { color: disabledText },
    },
  };
}

const driverTheme = createStaffTheme('#2563A6', '#EFF6FC', '#E7EDF3', '#51677B');
export const attendantTheme = createStaffTheme('#7956C2', '#F3EEFC', '#EDE8F3', '#635A72');
export type StaffTheme = ReturnType<typeof createStaffTheme>;

export function getStaffTheme(role?: string): StaffTheme | undefined {
  if (role === 'DRIVER') return driverTheme;
  if (role === 'BUS_ATTENDANT') return attendantTheme;
}

export type ThemeColors = typeof colors;
export default colors;
