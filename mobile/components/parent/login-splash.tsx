import { Animated } from 'react-native';
import { AppLoadingSplash } from '@/components/app-loading-splash';

/** Presentation only. RoleSplash continues to own its transition timer. */
export function ParentLoginSplash({ progressWidth }: { progressWidth: Animated.AnimatedInterpolation<string> }) {
  return <AppLoadingSplash message="Đang mở trang chủ..." progressWidth={progressWidth} />;
}
