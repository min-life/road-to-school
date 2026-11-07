import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { navigationMetrics as metrics } from '@/constants/navigation';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function HeaderAction({ icon, label, onPress, disabled = false }: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed, disabled && styles.disabled]}>
      <Ionicons name={icon} size={metrics.iconSize} color={colors.foreground} />
    </Pressable>
  );
}

export type AppHeaderProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  actions?: ReactNode;
  onBack?: () => void;
  backDisabled?: boolean;
  /** Set 0 only when a parent already owns the top safe area. */
  topInset?: number;
};

/** In-flow header: consumes the top inset once, never overlays screen content. */
export function AppHeader({ title, subtitle, leading, actions, onBack, backDisabled, topInset }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.surface, { paddingTop: topInset ?? insets.top,
      paddingLeft: insets.left, paddingRight: insets.right }]}>
      <View style={styles.row}>
        {onBack ? <HeaderAction icon="arrow-back" label="Quay lại" onPress={onBack} disabled={backDisabled} /> : leading}
        <View style={styles.copy}>
          <Text accessibilityRole="header" numberOfLines={2} style={styles.title}>{title}</Text>
          {!!subtitle && <Text numberOfLines={2} style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {!!actions && <View style={styles.actions}>{actions}</View>}
      </View>
    </View>
  );
}

export const headerActionStyles = StyleSheet.create({
  textButton: { minHeight: metrics.actionSize, justifyContent: 'center', paddingHorizontal: 10,
    borderRadius: 24, backgroundColor: colors.navigationHighlight },
  text: { color: colors.foreground, fontSize: 12, fontWeight: '700' },
});

const styles = StyleSheet.create({
  surface: { flexShrink: 0, backgroundColor: colors.background, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  row: { minHeight: metrics.headerMinHeight, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  copy: { flex: 1, minWidth: 0 },
  title: { color: colors.foreground, fontSize: 19, lineHeight: 25, fontWeight: '700' },
  subtitle: { color: colors.mutedText, fontSize: 12, lineHeight: 18, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  action: { width: metrics.actionSize, height: metrics.actionSize, borderRadius: metrics.actionSize / 2,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
});
