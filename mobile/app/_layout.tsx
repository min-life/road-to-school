import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View, Alert } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import { colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { AppLoadingSplash } from '@/components/app-loading-splash';
import { RoleSplash } from '@/components/RoleSplash';
import { NetworkBanner } from '@/components/NetworkBanner';
import { useNavigationReopen } from '@/hooks/use-navigation-reopen';
import { NotificationsProvider, useNotifications } from '@/context/notifications-context';
import { OnboardingProvider, useOnboarding } from '@/context/onboarding-context';
import { getOnboardingDestination } from '@/utils/onboarding-route';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Ngăn màn hình splash gốc tự ẩn cho tới khi nạp xong font
SplashScreen.preventAutoHideAsync();

const RoadToSchoolTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.foreground,
    border: colors.border,
  },
};

function RootNavigation() {
  const insets = useSafeAreaInsets();
  const {
    user,
    isLoading,
    isAuthenticated,
    isNetworkError,
    sessionExpiredMessage,
    splashRole,
    onSplashFinish,
    retryConnection,
    clearSessionExpired,
  } = useAuth();

  const segments = useSegments();
  const router = useRouter();
  const { navigationPending } = useNotifications();
  const onboarding = useOnboarding();
  useNavigationReopen(user?.id, user?.role, !isLoading && isAuthenticated && !splashRole && !navigationPending);

  // Xử lý điều hướng bảo vệ theo trạng thái xác thực
  useEffect(() => {
    if (isLoading || splashRole || !onboarding.ready) return;

    const inAuthGroup = segments[0] === '(auth)';
    const onboardingDestination = getOnboardingDestination({
      ready: onboarding.ready,
      completed: onboarding.completed,
      authenticated: isAuthenticated,
      inAuthGroup,
      authScreen: inAuthGroup ? segments[1] : undefined,
    });
    if (onboardingDestination) {
      router.replace(onboardingDestination === 'onboarding' ? '/(auth)/onboarding' : '/(auth)/login');
      return;
    }

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Kiểm tra vai trò: Chặn tài khoản Web cố đăng nhập Mobile
      if (user?.role === 'SYSTEM_ADMIN' || user?.role === 'SCHOOL_ADMIN') {
        router.replace('/(auth)/login');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [isLoading, isAuthenticated, segments, splashRole, user, router, onboarding.ready, onboarding.completed]);

  // Hiển thị thông báo khi phiên đăng nhập bị thu hồi hoặc hết hạn
  useEffect(() => {
    if (sessionExpiredMessage) {
      Alert.alert(
        'Phiên đăng nhập hết hạn',
        sessionExpiredMessage,
        [{ text: 'Đồng ý', onPress: clearSessionExpired }],
        { cancelable: false },
      );
    }
  }, [sessionExpiredMessage, clearSessionExpired]);

  // Screen M1: Application Splash (chỉ hiển thị khi đang nạp font hoặc khôi phục phiên)
  if (isLoading || !onboarding.ready) {
    return <AppLoadingSplash />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Screen M8: Network Banner nếu mất kết nối máy chủ */}
      {isNetworkError && <NetworkBanner onRetry={retryConnection} />}

      {/* Banner owns the top inset while visible; screens below must not add it twice. */}
      <SafeAreaInsetsContext.Provider value={isNetworkError ? { ...insets, top: 0 } : insets}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="parent/link-student" options={{ headerShown: false }} />
        <Stack.Screen name="parent/verify-otp" options={{ headerShown: false }} />
        <Stack.Screen name="parent/student-detail/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', title: 'Thông tin' }}
        />
      </Stack>
      </SafeAreaInsetsContext.Provider>

      {/* Screen M5: Mobile Role Splash 1.2s sau Manual Login */}
      {splashRole && (
        <RoleSplash role={splashRole} onFinish={onSplashFinish} />
      )}
    </View>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={RoadToSchoolTheme}>
      <AuthProvider>
        <OnboardingProvider>
          <NotificationsProvider><RootNavigation /></NotificationsProvider>
        </OnboardingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
