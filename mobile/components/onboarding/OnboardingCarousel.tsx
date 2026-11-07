import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, ActivityIndicator, FlatList, Image, Pressable,
  ScrollView, StyleSheet, Text, useWindowDimensions, View,
  type NativeScrollEvent, type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import { onboardingSlides } from '@/constants/onboarding';

interface Props {
  saving: boolean;
  error: string | null;
  onComplete: () => Promise<void>;
  onContinueWithoutSaving: () => void;
}

export function OnboardingCarousel({ saving, error, onComplete, onContinueWithoutSaving }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pageWidth = Math.max(1, Math.min(width - insets.left - insets.right, 600));
  const imageHeight = Math.min(280, Math.max(120, (height - insets.top - insets.bottom - 180) / 2));
  const list = useRef<FlatList<(typeof onboardingSlides)[number]>>(null);
  const [active, setActive] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(true);
  const last = active === onboardingSlides.length - 1;

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (!cancelled) setReduceMotion(value);
    }).catch(() => { /* Default to no motion when the preference is unavailable. */ });
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { cancelled = true; listener.remove(); };
  }, []);

  function select(index: number) {
    const next = Math.max(0, Math.min(index, onboardingSlides.length - 1));
    setActive(next);
    list.current?.scrollToOffset({ offset: next * pageWidth, animated: !reduceMotion });
  }

  function onScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setActive(Math.max(0, Math.min(
      Math.round(event.nativeEvent.contentOffset.x / pageWidth), onboardingSlides.length - 1,
    )));
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={[styles.frame, { width: pageWidth }]}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button" disabled={saving} onPress={() => { void onComplete(); }}
            style={({ pressed }) => [styles.skip, pressed && styles.pressed, saving && styles.disabled]}
          >
            <Text style={styles.skipLabel}>Bỏ qua</Text>
          </Pressable>
        </View>

        <FlatList
          key={pageWidth} ref={list} data={onboardingSlides} horizontal pagingEnabled
          initialNumToRender={4} initialScrollIndex={active} keyExtractor={item => item.id}
          getItemLayout={(_, index) => ({ length: pageWidth, offset: pageWidth * index, index })}
          showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScrollEnd}
          extraData={active} style={styles.pages}
          renderItem={({ item, index }) => (
            <ScrollView
              style={{ width: pageWidth }} contentContainerStyle={styles.slide}
              showsVerticalScrollIndicator={false} directionalLockEnabled
              accessibilityElementsHidden={index !== active}
              importantForAccessibility={index === active ? 'auto' : 'no-hide-descendants'}
            >
              <Image source={item.image} style={[styles.image, { height: imageHeight }]} resizeMode="contain" accessible={false} />
              <View style={styles.copy}>
                <Text accessibilityRole="header" style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
            </ScrollView>
          )}
        />

        <View style={styles.footer}>
          <View style={styles.pagination} accessibilityRole="tablist" accessibilityLabel="Trang giới thiệu">
            {onboardingSlides.map((slide, index) => (
              <Pressable
                key={slide.id} accessibilityRole="tab" accessibilityLabel={`Trang ${index + 1}: ${slide.title}`}
                accessibilityState={{ selected: index === active }} onPress={() => select(index)}
                style={styles.dotTarget}
              >
                <View style={[styles.dot, index === active && styles.activeDot]} />
              </Pressable>
            ))}
          </View>
          {error && (
            <View style={styles.error} accessibilityRole="alert">
              <Text style={styles.errorText}>{error}</Text>
              <Pressable accessibilityRole="button" onPress={onContinueWithoutSaving} style={styles.fallback}>
                <Text style={styles.fallbackLabel}>Tiếp tục không lưu</Text>
              </Pressable>
            </View>
          )}
          <Pressable
            accessibilityRole="button" accessibilityState={{ busy: saving, disabled: saving }} disabled={saving}
            onPress={() => { if (last || error) void onComplete(); else select(active + 1); }}
            style={({ pressed }) => [styles.primary, pressed && styles.pressed, saving && styles.disabled]}
          >
            {saving ? <ActivityIndicator color={colors.foreground} accessibilityLabel="Đang lưu" /> : (
              <>
                <Text style={styles.primaryLabel}>{error ? 'Thử lại' : last ? 'Bắt đầu' : 'Tiếp theo'}</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.foreground} accessible={false} />
              </>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  frame: { flex: 1, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 24, paddingTop: 4 },
  skip: { minHeight: 48, minWidth: 80, alignItems: 'flex-end', justifyContent: 'center' },
  skipLabel: { color: colors.mutedText, fontSize: 14, fontWeight: '600' },
  pages: { flex: 1 },
  slide: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  image: { width: '100%' },
  copy: { marginTop: 24, alignItems: 'center' },
  title: { color: colors.foreground, fontSize: 26, fontWeight: '700', lineHeight: 36, textAlign: 'center' },
  description: { color: colors.mutedText, fontSize: 16, lineHeight: 25, textAlign: 'center', marginTop: 16, maxWidth: 400 },
  footer: { paddingHorizontal: 24, paddingBottom: 12 },
  pagination: { flexDirection: 'row', justifyContent: 'center', marginBottom: 12 },
  dotTarget: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 9, height: 9, borderRadius: 9, backgroundColor: colors.border },
  activeDot: { width: 24, backgroundColor: colors.primary },
  primary: { minHeight: 52, borderRadius: 26, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  primaryLabel: { color: colors.foreground, fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.8 }, disabled: { opacity: 0.6 },
  error: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  errorText: { color: colors.error, fontSize: 13, lineHeight: 20 },
  fallback: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  fallbackLabel: { color: colors.foreground, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
});
