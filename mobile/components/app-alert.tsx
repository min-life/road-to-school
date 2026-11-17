import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type ComponentRef, type ReactNode } from 'react';
import { AccessibilityInfo, BackHandler, Keyboard, Modal as NativeModal, Platform, Pressable,
  ScrollView, StyleSheet, Text, View, findNodeHandle, useWindowDimensions, type ModalProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, getStaffTheme } from '@/constants/theme';
import { journeyTones } from '@/constants/parent-journey';
import { useAuth } from '@/context/auth-context';
import { appAlertStore } from '@/services/app-alert';
import { appAlertTone, type AppAlertRequest } from '@/utils/app-alert-store';

function useHostRequest(host?: string) {
  const snapshot = useSyncExternalStore(appAlertStore.subscribe, appAlertStore.getSnapshot, appAlertStore.getSnapshot);
  return { request: snapshot.hosts.at(-1) === host ? snapshot.queue[0] : undefined,
    hasAlert: snapshot.queue.length > 0 };
}

/** Root JS overlay avoids presenting a second native modal during a form's dismissal. */
export function AppAlertRoot({ children }: { children: ReactNode }) {
  const { request, hasAlert } = useHostRequest();
  return <View style={styles.scope}>
    <View style={styles.scope} accessibilityElementsHidden={hasAlert}
      importantForAccessibility={hasAlert ? 'no-hide-descendants' : 'auto'} aria-hidden={hasAlert}>
      {children}
    </View>
    {request && <AppAlertSurface key={request.id} request={request} />}
  </View>;
}

/** Hosts app alerts inside the currently visible native form/QR/picker modal. */
export function AppModal({ children, visible = true, onRequestClose, ...props }: ModalProps) {
  const host = useId();
  const { request, hasAlert } = useHostRequest(host);
  useLayoutEffect(() => visible ? appAlertStore.registerHost(host) : undefined, [host, visible]);
  return <NativeModal {...props} visible={visible} onRequestClose={event => {
    if (request) { appAlertStore.dismiss(request.id); return; }
    onRequestClose?.(event);
  }}>
    <View style={styles.scope}>
      <View style={styles.scope} accessibilityElementsHidden={hasAlert}
        importantForAccessibility={hasAlert ? 'no-hide-descendants' : 'auto'} aria-hidden={hasAlert}>
        {children}
      </View>
      {request && <AppAlertSurface key={request.id} request={request} />}
    </View>
  </NativeModal>;
}

function AppAlertSurface({ request }: { request: AppAlertRequest }) {
  const { user } = useAuth();
  const staffTheme = getStaffTheme(user?.role);
  const insets = useSafeAreaInsets();
  const { height, width, fontScale } = useWindowDimensions();
  const card = useRef<ComponentRef<typeof View>>(null);
  const heading = useRef<ComponentRef<typeof Text>>(null);
  const actions = useRef<(ComponentRef<typeof View> | null)[]>([]);
  const [focused, setFocused] = useState<number | null>(null);
  const destructive = request.buttons.some(button => button.style === 'destructive');
  const tone = appAlertTone(request.title, destructive);
  const palette = tone === 'info' || tone === 'warning' ? journeyTones.warning : journeyTones[tone];
  const icon = tone === 'success' ? 'checkmark-circle-outline' : tone === 'danger' ? 'alert-circle-outline'
    : tone === 'warning' ? 'warning-outline' : 'information-circle-outline';
  const preferred = Math.max(0, request.buttons.findIndex(button => destructive ? button.style === 'cancel' : button.style !== 'cancel'));
  const stacked = request.buttons.length > 2 || width < 360 || fontScale >= 1.4;

  useEffect(() => {
    const previous = Platform.OS === 'web' ? document.activeElement as HTMLElement | null : null;
    Keyboard.dismiss();
    const frame = requestAnimationFrame(() => {
      if (Platform.OS === 'web') {
        const button = actions.current[preferred] as unknown as HTMLElement | null;
        const container = card.current as unknown as HTMLElement | null;
        const bounds = container?.getBoundingClientRect(), actionBounds = button?.getBoundingClientRect();
        // Long messages open at their heading instead of auto-scrolling to the last button.
        if (bounds && actionBounds && actionBounds.top >= bounds.top && actionBounds.bottom <= bounds.bottom) button?.focus();
        else container?.focus();
      } else {
        const target = findNodeHandle(heading.current);
        if (target) AccessibilityInfo.setAccessibilityFocus(target);
      }
    });
    const back = BackHandler.addEventListener('hardwareBackPress', () => { appAlertStore.dismiss(request.id); return true; });
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); appAlertStore.dismiss(request.id); }
      if (event.key !== 'Tab') return;
      const container = card.current as unknown as HTMLElement | null;
      const focusable = Array.from(container?.querySelectorAll<HTMLElement>('[tabindex="0"],button') ?? []);
      if (!focusable.length) return;
      event.preventDefault();
      const current = focusable.indexOf(document.activeElement as HTMLElement);
      focusable[(current + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length].focus();
    };
    if (Platform.OS === 'web') document.addEventListener('keydown', keydown, true);
    return () => {
      cancelAnimationFrame(frame); back.remove();
      if (Platform.OS === 'web') {
        document.removeEventListener('keydown', keydown, true);
        if (previous && document.contains(previous)) previous.focus?.();
      }
    };
  }, [request.id, preferred]);

  return <View style={[styles.overlay, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16,
    paddingLeft: insets.left + 16, paddingRight: insets.right + 16 }]}>
    <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={() => appAlertStore.dismiss(request.id)} />
    <View ref={card} role="alertdialog" aria-modal accessibilityViewIsModal tabIndex={Platform.OS === 'web' ? -1 : undefined}
      accessibilityLabel={request.title} accessibilityHint={request.message}
      onAccessibilityEscape={() => appAlertStore.dismiss(request.id)}
      style={[styles.card, { maxHeight: Math.max(0, height - insets.top - insets.bottom - 32) }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={[styles.icon, { backgroundColor: palette.bg }]}>
          <Ionicons name={icon} size={30} color={palette.text} accessible={false} />
        </View>
        <Text ref={heading} accessibilityRole="header" style={styles.title}>{request.title}</Text>
        {!!request.message && <Text style={styles.message}>{request.message}</Text>}
        <View style={[styles.actions, stacked && styles.stacked]}>
          {request.buttons.map((button, index) => <Pressable key={index} ref={node => { actions.current[index] = node; }}
            accessibilityRole="button" onPress={() => appAlertStore.press(request.id, index)}
            onFocus={() => setFocused(index)} onBlur={() => setFocused(null)}
            style={({ pressed }) => [styles.button, stacked && styles.stackedButton,
              staffTheme?.buttons.primary,
              button.style === 'cancel' && styles.cancel, button.style === 'destructive' && styles.destructive,
              focused === index && { borderColor: staffTheme?.colors.disabledText ?? colors.navigationActive },
              pressed && styles.pressed]}>
            <Text style={[styles.buttonText, staffTheme?.buttons.primaryText,
              button.style === 'cancel' && styles.cancelText,
              button.style === 'destructive' && styles.destructiveText]}>{button.text || 'Đã hiểu'}</Text>
          </Pressable>)}
        </View>
      </ScrollView>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  scope: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, elevation: 1000,
    backgroundColor: 'rgba(15,23,42,0.48)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', maxWidth: 420, borderRadius: 24, backgroundColor: colors.surface, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border, shadowColor: colors.navigationShadow,
    shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.16, shadowRadius: 24, elevation: 12 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { padding: 24, alignItems: 'center', gap: 16 },
  icon: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.foreground, fontSize: 20, lineHeight: 28, fontWeight: '800', textAlign: 'center' },
  message: { color: colors.mutedText, fontSize: 14, lineHeight: 22, textAlign: 'center', alignSelf: 'stretch' },
  actions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 4 },
  stacked: { flexDirection: 'column' },
  button: { flex: 1, minHeight: 48, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 16,
    borderWidth: 2, borderColor: 'transparent', backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  stackedButton: { flex: 0 },
  buttonText: { color: colors.foreground, fontSize: 14, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
  cancel: { backgroundColor: colors.surface, borderColor: colors.border },
  cancelText: { color: colors.mutedText },
  destructive: { backgroundColor: journeyTones.danger.text },
  destructiveText: { color: colors.surface },
  pressed: { opacity: 0.75 },
});
