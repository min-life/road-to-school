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

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [channel, setChannel] = useState<'SMS' | 'EMAIL'>('SMS');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { registerRequestOtp } = useAuth();
  const router = useRouter();

  const handleNext = async () => {
    setError(null);
    const trimmedName = fullName.trim();
    const trimmedIdentifier = identifier.trim();

    if (trimmedName.length < 2) {
      setError('Họ và tên phải có tối thiểu 2 ký tự');
      return;
    }

    if (!trimmedIdentifier) {
      setError(
        channel === 'SMS'
          ? 'Vui lòng nhập số điện thoại'
          : 'Vui lòng nhập địa chỉ email',
      );
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có tối thiểu 6 ký tự');
      return;
    }

    if (password !== confirmPassword) {
      setError('Xác nhận mật khẩu không trùng khớp');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Gửi yêu cầu nhận mã OTP (tuyệt đối chưa tạo User trong DB)
      await registerRequestOtp(trimmedIdentifier);

      // 2. Chuyển tiếp dữ liệu đăng ký sang màn hình xác minh OTP
      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          identifier: trimmedIdentifier,
          fullName: trimmedName,
          password,
          confirmPassword,
        },
      });
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Không thể gửi mã xác minh. Vui lòng thử lại.');
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
          {/* Header & Back Button */}
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
            source={require('@/assets/images/auth/register.jpg')}
            style={styles.heroImage}
            resizeMode="contain"
            accessible={false}
          />
          <Text style={styles.headerTitle} accessibilityRole="header">Đăng ký Phụ huynh</Text>

          <Text style={styles.subtitle}>
            Tạo tài khoản để theo dõi lộ trình và xe buýt của con
          </Text>

          {/* Error Banner */}
          {error && (
            <View style={styles.errorBanner} accessibilityRole="alert">
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Form Fields */}
          <View style={styles.formGroup}>
            {/* <Text style={styles.label}>Họ và tên Phụ huynh</Text> */}
            <View style={styles.inputShell}>
              <Ionicons name="person-outline" size={20} color={colors.mutedText} accessible={false} />
              <TextInput
                style={styles.input}
                accessibilityLabel="Họ và tên"
                placeholder="Họ và tên"
                placeholderTextColor={colors.mutedText}
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (error) setError(null);
                }}
                editable={!isSubmitting}
              />
            </View>
          </View>

          {/* Channel Selector */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Hình thức nhận mã xác thực</Text>
            <View style={styles.channelContainer} accessibilityRole="radiogroup" accessibilityLabel="Hình thức nhận mã xác thực">
              <TouchableOpacity
                accessibilityRole="radio"
                accessibilityState={{ checked: channel === 'SMS' }}
                style={[
                  styles.channelTab,
                  channel === 'SMS' && styles.channelTabActive,
                ]}
                onPress={() => {
                  setChannel('SMS');
                  setIdentifier('');
                  if (error) setError(null);
                }}
              >
                <Text
                  style={[
                    styles.channelTabText,
                    channel === 'SMS' && styles.channelTabTextActive,
                  ]}
                >
                  Số điện thoại
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="radio"
                accessibilityState={{ checked: channel === 'EMAIL' }}
                style={[
                  styles.channelTab,
                  channel === 'EMAIL' && styles.channelTabActive,
                ]}
                onPress={() => {
                  setChannel('EMAIL');
                  setIdentifier('');
                  if (error) setError(null);
                }}
              >
                <Text
                  style={[
                    styles.channelTabText,
                    channel === 'EMAIL' && styles.channelTabTextActive,
                  ]}
                >
                  Email
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            {/* <Text style={styles.label}>
              {channel === 'SMS' ? 'Số điện thoại' : 'Địa chỉ Email'}
            </Text> */}
            <View style={styles.inputShell}>
              <Ionicons name={channel === 'SMS' ? 'call-outline' : 'mail-outline'} size={20} color={colors.mutedText} accessible={false} />
              <TextInput
                style={styles.input}
                accessibilityLabel={channel === 'SMS' ? 'Số điện thoại' : 'Địa chỉ Email'}
                placeholder={channel === 'SMS' ? 'Số điện thoại' : 'Địa chỉ Email'}
                placeholderTextColor={colors.mutedText}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType={channel === 'SMS' ? 'phone-pad' : 'email-address'}
                value={identifier}
                onChangeText={(text) => {
                  setIdentifier(text);
                  if (error) setError(null);
                }}
                editable={!isSubmitting}
              />
            </View>
          </View>

          {/* Mật khẩu */}
          <View style={styles.formGroup}>
            {/* <Text style={styles.label}>Mật khẩu (tối thiểu 6 ký tự)</Text> */}
            <View style={styles.passwordInputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.mutedText} accessible={false} />
              <TextInput
                style={styles.passwordInput}
                accessibilityLabel="Mật khẩu (tối thiểu 6 ký tự)"
                placeholder="Mật khẩu (tối thiểu 6 ký tự)"
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

          {/* Xác nhận mật khẩu */}
          <View style={styles.formGroup}>
            {/* <Text style={styles.label}>Xác nhận lại mật khẩu</Text> */}
            <View style={styles.passwordInputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.mutedText} accessible={false} />
              <TextInput
                style={styles.passwordInput}
                accessibilityLabel="Xác nhận lại mật khẩu"
                placeholder="Xác nhận lại mật khẩu"
                placeholderTextColor={colors.mutedText}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (error) setError(null);
                }}
                editable={!isSubmitting}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                accessibilityRole="button"
                accessibilityLabel={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.mutedText}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleNext}
            accessibilityRole="button"
            accessibilityState={{ busy: isSubmitting, disabled: isSubmitting }}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <View style={styles.buttonLoadingRow}>
                <ActivityIndicator size="small" color={colors.foreground} />
                <Text style={styles.submitButtonText}>Đang gửi mã xác thực...</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>Tiếp tục</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <TouchableOpacity
            style={styles.loginLink}
            accessibilityRole="button"
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.7}
          >
            <Text style={styles.loginLinkText}>
              Đã có tài khoản? <Text style={styles.loginLinkBold}>Đăng nhập</Text>
            </Text>
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
  heroImage: { width: '100%', aspectRatio: 1.25, maxHeight: 210, alignSelf: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '700', lineHeight: 38, color: colors.foreground, marginBottom: 8 },
  subtitle: { fontSize: 15, lineHeight: 24, color: colors.mutedText, marginBottom: 24 },
  errorBanner: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.error, borderRadius: 12,
    padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20,
  },
  errorText: { fontSize: 14, color: colors.error, flex: 1, lineHeight: 20 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 8 },
  channelContainer: {
    flexDirection: 'row', backgroundColor: colors.surface, borderColor: colors.border,
    borderWidth: 1, borderRadius: 16, padding: 4, gap: 4,
  },
  channelTab: {
    flex: 1, minHeight: 48, paddingVertical: 12, paddingHorizontal: 8,
    alignItems: 'center', justifyContent: 'center', borderRadius: 12,
  },
  channelTabActive: { backgroundColor: colors.primary },
  channelTabText: { fontSize: 14, lineHeight: 22, fontWeight: '600', color: colors.mutedText, textAlign: 'center' },
  channelTabTextActive: { color: colors.foreground },
  inputShell: {
    flexDirection: 'row', alignItems: 'center', minHeight: 54, borderWidth: 1,
    borderColor: colors.border, borderRadius: 14, paddingLeft: 14, backgroundColor: colors.surface,
  },
  input: { flex: 1, minWidth: 0, minHeight: 54, paddingHorizontal: 12, paddingVertical: 14, fontSize: 16, color: colors.foreground },
  passwordInputContainer: {
    flexDirection: 'row', alignItems: 'center', minHeight: 54, borderWidth: 1,
    borderColor: colors.border, borderRadius: 14, paddingLeft: 14, backgroundColor: colors.surface,
  },
  passwordInput: { flex: 1, minWidth: 0, minHeight: 54, paddingHorizontal: 12, paddingVertical: 14, fontSize: 16, color: colors.foreground },
  eyeButton: { minWidth: 48, minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  submitButton: {
    backgroundColor: colors.primary, minHeight: 52, borderRadius: 26, paddingHorizontal: 20,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  submitButtonDisabled: { opacity: 0.5 },
  buttonLoadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8 },
  submitButtonText: { fontSize: 16, fontWeight: '700', color: colors.foreground, textAlign: 'center' },
  loginLink: { marginTop: 20, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  loginLinkText: { fontSize: 14, lineHeight: 22, color: colors.mutedText, textAlign: 'center' },
  loginLinkBold: { fontWeight: '700', color: colors.foreground },
});
