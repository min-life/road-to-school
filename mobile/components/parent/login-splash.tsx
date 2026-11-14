import { Animated, Image, StyleSheet, View } from 'react-native';
import { AppLoadingSplash } from '@/components/app-loading-splash';

/** Presentation only. RoleSplash continues to own its transition timer. */
export function ParentLoginSplash({ progressWidth }: { progressWidth: Animated.AnimatedInterpolation<string> }) {
  return (
    <AppLoadingSplash
      message="Đang mở trang chủ..."
      progressWidth={progressWidth}
      illustration={
        <View style={styles.illustration}>
          <Image
            source={require('@/assets/images/brand/parent-splash.png')}
            style={styles.image}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="RoadToSchool dành cho phụ huynh"
          />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  illustration: { width: '100%', maxWidth: 240, aspectRatio: 1 },
  image: { width: '100%', height: '100%' },
});
