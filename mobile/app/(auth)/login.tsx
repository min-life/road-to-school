import { KeyboardScrollView } from '@/components/keyboard-scroll-view';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Platform,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/auth-context';
import { colors } from '@/constants/theme';
import { ApiError } from '@/services/api-client';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    setError(null);
    const trimmed = identifier.trim();

    if (!trimmed) {
      setError('Vui lòng nhập email hoặc số điện thoại');
      return;
    }

    if (!password) {
      setError('Vui lòng nhập mật khẩu');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(trimmed, password);
      // Khi login thành công, AuthProvider kích hoạt RoleSplash 1.2s rồi tự điều hướng vào (tabs)
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Đăng nhập không thành công. Vui lòng thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <View
        style={styles.keyboardContainer}
      >
        <KeyboardScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.header}>
              <Image
                source={require('@/assets/images/auth/login.jpg')}
                style={styles.heroImage}
                resizeMode="contain"
                accessible={false}
              />
              <Text style={styles.loginTitle} accessibilityRole="header">Đăng nhập</Text>
            </View>

            {/* Error Banner */}
            {error && (
              <View style={styles.errorBanner} accessibilityRole="alert">
                <Ionicons name="alert-circle" size={18} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Form Fields */}
            <View style={styles.formGroup}>
              <View style={styles.inputShell}>
                <Ionicons name="person-outline" size={20} color={colors.mutedText} accessible={false} />
                <TextInput
                  style={styles.input}
                  autoFocus={false}
                  accessibilityLabel="Email hoặc Số điện thoại"
                  placeholder="Email hoặc số điện thoại"
                  placeholderTextColor={colors.mutedText}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  value={identifier}
                  onChangeText={(text) => {
                    setIdentifier(text);
                    if (error) setError(null);
                  }}
                  editable={!isSubmitting}
                />
              </View>
            </View>

            <View style={styles.formGroup}>

              <View style={styles.passwordInputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.mutedText} accessible={false} />
                <TextInput
                  style={styles.passwordInput}
                  autoFocus={false}
                  accessibilityLabel="Mật khẩu"
                  placeholder="Mật khẩu"
                  placeholderTextColor={colors.mutedText}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (error) setError(null);
                  }}
                  editable={!isSubmitting}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.mutedText}
                  />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              style={styles.forgotButton}
              onPress={() => router.push('/(auth)/forgot-password')}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (isSubmitting || !identifier.trim() || !password) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={handleLogin}
              accessibilityRole="button"
              accessibilityState={{ busy: isSubmitting, disabled: isSubmitting || !identifier.trim() || !password }}
              disabled={isSubmitting || !identifier.trim() || !password}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <View style={styles.buttonLoadingRow}>
                  <ActivityIndicator size="small" color={colors.foreground} />
                  <Text style={styles.submitButtonText}>Đang đăng nhập...</Text>
                </View>
              ) : (
                <Text style={styles.submitButtonText}>Đăng nhập</Text>
              )}
            </TouchableOpacity>

            {/* Parent Registration Link */}
            <TouchableOpacity
              style={styles.registerLink}
              accessibilityRole="button"
              onPress={() => router.push('/(auth)/register')}
              activeOpacity={0.7}
            >
              <Text style={styles.registerLinkText}>
                Chưa có tài khoản?{' '}
                <Text style={styles.registerLinkBold}>Đăng ký</Text>
              </Text>
            </TouchableOpacity>
          </View>

        </KeyboardScrollView>
      </View>
    </SafeAreaView>
  );
}

// Explicit defaults prevent recycled native inputs retaining another field's typography.
const inputTypography: TextStyle = {
  fontFamily: Platform.select({ ios: 'system-ui', android: 'sans-serif' }),
  fontWeight: '400',
  fontStyle: 'normal',
  letterSpacing: 0,
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  keyboardContainer: { flex: 1 },
  scrollContainer: { flexGrow: 1, alignItems: 'center', paddingVertical: 16 },
  card: { width: '100%', maxWidth: 430, paddingHorizontal: 24, paddingBottom: 24 },
  header: { marginBottom: 24 },
  heroImage: { width: '100%', aspectRatio: 1.12, maxHeight: 285, alignSelf: 'center', marginBottom: 16 },
  loginTitle: { fontSize: 28, fontWeight: '700', lineHeight: 38, color: colors.foreground },
  errorBanner: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.error,
    borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20,
  },
  errorText: { fontSize: 14, color: colors.error, flex: 1, lineHeight: 20 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 8 },
  inputShell: {
    minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 13,
    paddingLeft: 14, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center',
  },
  input: { ...inputTypography, flex: 1, minWidth: 0, minHeight: 52, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15, color: colors.foreground },
  passwordInputContainer: {
    flexDirection: 'row', alignItems: 'center', minHeight: 52, borderWidth: 1,
    borderColor: colors.border, borderRadius: 13, paddingLeft: 14, backgroundColor: colors.surface,
  },
  passwordInput: { ...inputTypography, flex: 1, minWidth: 0, minHeight: 52, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15, color: colors.foreground },
  eyeButton: { minWidth: 48, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  forgotButton: { alignSelf: 'flex-end', minHeight: 48, justifyContent: 'center', paddingHorizontal: 8, marginTop: -8 },
  forgotPasswordText: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  submitButton: {
    backgroundColor: colors.primary, minHeight: 52, borderRadius: 26,
    paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16,
  },
  submitButtonDisabled: { opacity: 0.5 },
  buttonLoadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8 },
  submitButtonText: { fontSize: 16, fontWeight: '700', color: colors.foreground, textAlign: 'center' },
  registerLink: { marginTop: 24, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  registerLinkText: { fontSize: 14, lineHeight: 22, color: colors.mutedText, textAlign: 'center' },
  registerLinkBold: { fontWeight: '700', color: colors.foreground },
});
