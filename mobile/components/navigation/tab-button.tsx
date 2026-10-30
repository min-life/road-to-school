import type { ComponentProps } from 'react';
import { Link, Tabs, type Href } from 'expo-router';
import { Platform, Pressable, StyleSheet } from 'react-native';

type Options = Exclude<NonNullable<ComponentProps<typeof Tabs>['screenOptions']>, (...args: never[]) => unknown>;
type TabButtonProps = Parameters<NonNullable<Options['tabBarButton']>>[0];

/** Keep navigator-provided events, accessibility and Web links; no local tab state. */
export function TabButton({ href, style, children, ref: navigationRef, pressColor: _color, pressOpacity: _opacity,
  hoverEffect: _hover, ...props }: TabButtonProps) {
  const button = <Pressable {...props} ref={navigationRef as ComponentProps<typeof Pressable>['ref']} accessibilityRole="tab"
    aria-selected={props['aria-selected'] ?? props.accessibilityState?.selected}
    style={({ pressed }) => [style, styles.button, pressed && styles.pressed, props.disabled && styles.disabled]}>
    {children}
  </Pressable>;
  return Platform.OS === 'web' && href ? <Link href={href as Href} asChild>{button}</Link> : button;
}

const styles = StyleSheet.create({
  button: { minHeight: 48 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
});
