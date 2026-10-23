import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import 'react-native-reanimated';
import { colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { BusLogo } from '@/components/BusLogo';
import { RoleSplash } from '@/components/RoleSplash';
import { NetworkBanner } from '@/components/NetworkBanner';

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

  // Xử lý điều hướng bảo vệ theo trạng thái xác thực
  useEffect(() => {
    if (isLoading || splashRole) return;

    const inAuthGroup = segments[0] === '(auth)';

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
  }, [isLoading, isAuthenticated, segments, splashRole, user, router]);

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
  if (isLoading) {
    return (
      <View style={styles.appSplashContainer}>
        <BusLogo size={76} />
        <Text style={styles.appSplashTitle}>RoadToSchool</Text>
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={{ marginTop: 24 }}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Screen M8: Network Banner nếu mất kết nối máy chủ */}
      {isNetworkError && <NetworkBanner onRetry={retryConnection} />}

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
        <RootNavigation />
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  appSplashContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appSplashTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.foreground,
    marginTop: 16,
    letterSpacing: -0.5,
  },
});
