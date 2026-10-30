import { ActivityIndicator, Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLogo } from '@/components/brand-logo';
import { colors } from '@/constants/theme';

type AppLoadingSplashProps = {
  message?: string;
  progressWidth?: Animated.AnimatedInterpolation<string>;
};

/** Presentation only; auth and RoleSplash own readiness and transition timing. */
export function AppLoadingSplash({ message = 'Đang tải...', progressWidth }: AppLoadingSplashProps) {
  return (
    <SafeAreaView style={styles.overlay}>
      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        <View style={styles.frame} accessibilityViewIsModal>
          <BrandLogo />
          <View style={styles.loading} accessible accessibilityRole="progressbar" accessibilityLabel={message}
            accessibilityState={{ busy: true }}>
            <Text style={styles.message}>{message}</Text>
            {progressWidth ? (
              <View style={styles.track} accessible={false}>
                <Animated.View style={[styles.fill, { width: progressWidth }]} />
              </View>
            ) : <ActivityIndicator size="small" color={colors.navigationActive} accessible={false} />}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  frame: { width: '100%', maxWidth: 320, alignItems: 'center', gap: 32 },
  loading: { width: '100%', maxWidth: 180, alignItems: 'center', gap: 16 },
  message: { fontSize: 13, lineHeight: 20, color: colors.mutedText, textAlign: 'center' },
  track: { width: '100%', height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: colors.navigationHighlight },
  fill: { height: '100%', borderRadius: 2, backgroundColor: colors.primary },
});
