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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/auth-context';
import { colors } from '@/constants/theme';
import { ApiError } from '@/services/api-client';

export default function ForgotPasswordScreen() {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { forgotPasswordRequestOtp } = useAuth();
  const router = useRouter();

  const handleRequestOtp = async () => {
    setError(null);
    const trimmed = identifier.trim();

    if (!trimmed) {
      setError('Vui lòng nhập email hoặc số điện thoại');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await forgotPasswordRequestOtp(trimmed);

      // Chuyển sang màn hình đặt lại mật khẩu với thông báo trung tính
      router.push({
        pathname: '/(auth)/reset-password',
        params: {
          identifier: trimmed,
          initialMessage: res.message,
        },
      });
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Không thể gửi yêu cầu mã xác minh. Vui lòng thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.keyboardContainer}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <KeyboardScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityLabel="Quay lại"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <View style={{ width: 24 }} />
          </View>

          <Image
            source={require('@/assets/images/auth/forget-password.jpg')}
            style={styles.heroImage}
            resizeMode="contain"
            accessible={false}
          />
          <Text style={styles.headerTitle} accessibilityRole="header">Quên mật khẩu</Text>

          <Text style={styles.subtitle}>
            Nhập email hoặc số điện thoại liên kết với tài khoản để nhận mã xác minh OTP.
          </Text>

          {/* Error Banner */}
          {error && (
            <View style={styles.errorBanner} accessibilityRole="alert">
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Input Identifier */}
          <View style={styles.formGroup}>
            <View style={styles.inputShell}>
              <Ionicons name="person-outline" size={20} color={colors.mutedText} accessible={false} />
              <TextInput
                style={styles.input}
                accessibilityLabel="Email hoặc Số điện thoại"
                placeholder="Email hoặc Số điện thoại"
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
                autoFocus={false}
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (isSubmitting || !identifier.trim()) && styles.submitButtonDisabled,
            ]}
            onPress={handleRequestOtp}
            accessibilityRole="button"
            accessibilityState={{ busy: isSubmitting, disabled: isSubmitting || !identifier.trim() }}
            disabled={isSubmitting || !identifier.trim()}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <View style={styles.buttonLoadingRow}>
                <ActivityIndicator size="small" color={colors.foreground} />
                <Text style={styles.submitButtonText}>Đang gửi yêu cầu...</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>Gửi mã xác thực</Text>
            )}
          </TouchableOpacity>

          {/* Back to Login */}
          <TouchableOpacity
            style={styles.backLink}
            accessibilityRole="button"
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.7}
          >
            <Text style={styles.backLinkText}>Quay lại đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </KeyboardScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: { flex: 1, backgroundColor: colors.background },
  scrollContainer: { flexGrow: 1, alignItems: 'center', paddingVertical: 8 },
  card: { width: '100%', maxWidth: 430, paddingHorizontal: 24, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { minWidth: 48, minHeight: 48, justifyContent: 'center' },
  heroImage: { width: '78%', aspectRatio: 1, maxHeight: 245, alignSelf: 'center', marginTop: 8, marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '700', lineHeight: 38, color: colors.foreground, marginBottom: 8 },
  subtitle: { fontSize: 15, color: colors.mutedText, marginBottom: 24, lineHeight: 24 },
  errorBanner: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.error, borderRadius: 12,
    padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20,
  },
  errorText: { fontSize: 14, color: colors.error, flex: 1, lineHeight: 20 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 8 },
  inputShell: {
    minHeight: 54, borderWidth: 1, borderColor: colors.border, borderRadius: 14,
    paddingLeft: 14, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center',
  },
  input: { flex: 1, minWidth: 0, minHeight: 54, paddingHorizontal: 12, paddingVertical: 14, fontSize: 16, color: colors.foreground },
  submitButton: {
    backgroundColor: colors.primary, minHeight: 52, borderRadius: 26, paddingHorizontal: 20,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  submitButtonDisabled: { opacity: 0.5 },
  buttonLoadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8 },
  submitButtonText: { fontSize: 16, fontWeight: '700', color: colors.foreground, textAlign: 'center' },
  backLink: { marginTop: 16, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  backLinkText: { fontSize: 14, fontWeight: '600', color: colors.foreground, textAlign: 'center' },
});
