import { KeyboardScrollView } from '@/components/keyboard-scroll-view';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/auth-context';
import { colors } from '@/constants/theme';
import { ApiError } from '@/services/api-client';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{
    identifier?: string;
    initialMessage?: string;
  }>();

  const identifier = params.identifier || '';
  const initialMessage = params.initialMessage || '';

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [countdown, setCountdown] = useState(300);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const { resetPassword, forgotPasswordRequestOtp } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const handleResetPassword = async () => {
    setError(null);
    const trimmedOtp = otp.trim();

    if (trimmedOtp.length !== 6) {
      setError('Vui lòng nhập đủ 6 chữ số mã xác thực OTP');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có tối thiểu 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không trùng khớp');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword({
        identifier,
        otp: trimmedOtp,
        newPassword,
        confirmPassword,
      });

      setSuccess(true);
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 2000);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Đặt lại mật khẩu không thành công. Vui lòng thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;
    setError(null);
    setIsResending(true);
    try {
      await forgotPasswordRequestOtp(identifier);
      setCountdown(300);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Không thể gửi lại mã xác thực. Vui lòng thử lại.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View
      style={styles.keyboardContainer}
    >
      <KeyboardScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityLabel="Quay lại"
            >
              <Ionicons name="arrow-back" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Đặt lại mật khẩu</Text>
            <View style={{ width: 24 }} />
          </View>

          {success ? (
            <View style={styles.successContainer}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark-circle" size={48} color={colors.success} />
              </View>
              <Text style={styles.successTitle}>Đặt lại mật khẩu thành công!</Text>
              <Text style={styles.successMessage}>
                Mật khẩu của bạn đã được cập nhật. Đang chuyển về màn hình đăng nhập...
              </Text>
              <TouchableOpacity
                style={styles.loginNowButton}
                onPress={() => router.replace('/(auth)/login')}
              >
                <Text style={styles.loginNowText}>Đăng nhập ngay</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Anti-Enumeration Feedback Banner */}
              {initialMessage ? (
                <View style={styles.infoBanner}>
                  <Ionicons name="information-circle" size={18} color="#92400E" />
                  <Text style={styles.infoText}>{initialMessage}</Text>
                </View>
              ) : null}

              {/* Error Banner */}
              {error && (
                <View style={styles.errorBanner} accessibilityRole="alert">
                  <Ionicons name="alert-circle" size={18} color={colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* OTP Field */}
              <View style={styles.formGroup}>
                <View style={styles.otpHeaderRow}>
                  <Text style={styles.label}>Mã xác thực OTP (6 số)</Text>
                  {countdown > 0 ? (
                    <Text style={styles.countdownText}>
                      Hết hạn: <Text style={styles.countdownBold}>{formatCountdown(countdown)}</Text>
                    </Text>
                  ) : (
                    <TouchableOpacity onPress={handleResend} disabled={isResending}>
                      <Text style={styles.resendText}>Gửi lại mã</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder="000000"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={(text) => {
                    const numeric = text.replace(/[^0-9]/g, '');
                    setOtp(numeric);
                    if (error) setError(null);
                  }}
                  editable={!isSubmitting}
                />
              </View>

              {/* New Password */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Mật khẩu mới (tối thiểu 6 ký tự)</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="••••••••"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showNewPassword}
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      if (error) setError(null);
                    }}
                    editable={!isSubmitting}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    <Ionicons
                      name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm New Password */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="••••••••"
                    placeholderTextColor="#94A3B8"
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
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleResetPassword}
                disabled={isSubmitting || otp.length !== 6 || newPassword.length < 6}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <View style={styles.buttonLoadingRow}>
                    <ActivityIndicator size="small" color={colors.foreground} />
                    <Text style={styles.submitButtonText}>Đang cập nhật...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>Hoàn tất đặt lại mật khẩu</Text>
                )}
              </TouchableOpacity>

              {/* Back to Login */}
              <TouchableOpacity
                style={styles.backLink}
                onPress={() => router.replace('/(auth)/login')}
                activeOpacity={0.7}
              >
                <Text style={styles.backLinkText}>Quay lại đăng nhập</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
  },
  infoBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
    lineHeight: 17,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    flex: 1,
    lineHeight: 18,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 6,
  },
  otpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  countdownText: {
    fontSize: 12,
    color: colors.mutedText,
  },
  countdownBold: {
    fontWeight: '700',
    color: colors.foreground,
  },
  resendText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.foreground,
    backgroundColor: '#FAFAFA',
  },
  otpInput: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    height: 48,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.foreground,
  },
  eyeButton: {
    paddingHorizontal: 14,
    height: '100%',
    justifyContent: 'center',
  },
  submitButton: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  buttonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  backLink: {
    marginTop: 18,
    alignItems: 'center',
    paddingVertical: 4,
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedText,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIconCircle: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 13,
    color: colors.mutedText,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  loginNowButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  loginNowText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
});
