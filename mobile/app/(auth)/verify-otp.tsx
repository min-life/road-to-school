import { KeyboardScrollView } from '@/components/keyboard-scroll-view';
import React, { useState, useEffect, useRef } from 'react';
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

export default function VerifyOtpScreen() {
  const params = useLocalSearchParams<{
    identifier?: string;
    fullName?: string;
    password?: string;
    confirmPassword?: string;
  }>();

  const identifier = params.identifier || '';
  const fullName = params.fullName || '';
  const password = params.password || '';
  const confirmPassword = params.confirmPassword || '';

  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(300); // 5 phút TTL
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const inputRef = useRef<any>(null);
  const { registerVerify, registerRequestOtp } = useAuth();
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

  const handleVerify = async () => {
    setError(null);
    const trimmedOtp = otp.trim();

    if (trimmedOtp.length !== 6) {
      setError('Vui lòng nhập đủ 6 chữ số mã xác thực');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerVerify({
        identifier,
        fullName,
        password,
        confirmPassword,
        otp: trimmedOtp,
      });

      // Tự động đăng nhập thành công vào ứng dụng (không hiển thị Role Splash)
      router.replace('/(tabs)');
    } catch (err: any) {
      if (err instanceof ApiError) {
        // Quyết định PO: Không giới hạn số lần nhập sai, không khóa mã
        setError(err.message);
      } else {
        setError('Xác thực không thành công. Vui lòng thử lại.');
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
      await registerRequestOtp(identifier);
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
          {/* Header & Back Button */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityLabel="Quay lại"
            >
              <Ionicons name="arrow-back" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Xác thực mã OTP</Text>
            <View style={{ width: 24 }} />
          </View>

          <Text style={styles.subtitle}>
            Mã xác thực gồm 6 chữ số đã được gửi đến:{'\n'}
            <Text style={styles.identifierText}>{identifier}</Text>
          </Text>

          {/* Error Banner */}
          {error && (
            <View style={styles.errorBanner} accessibilityRole="alert">
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* OTP Input Fields (6-box interactive visualization) */}
          <TouchableOpacity
            style={styles.otpBoxesRow}
            activeOpacity={1}
            onPress={() => inputRef.current?.focus()}
          >
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const char = otp[index] || '';
              const isFocused = otp.length === index;
              return (
                <View
                  key={index}
                  style={[
                    styles.otpBox,
                    isFocused && styles.otpBoxFocused,
                    char ? styles.otpBoxFilled : null,
                  ]}
                >
                  <Text style={styles.otpChar}>{char}</Text>
                </View>
              );
            })}
            {/* Hidden full-width numeric TextInput */}
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={(text) => {
                const numeric = text.replace(/[^0-9]/g, '');
                setOtp(numeric);
                if (error) setError(null);
              }}
              autoFocus
              editable={!isSubmitting}
            />
          </TouchableOpacity>

          {/* Countdown & Resend */}
          <View style={styles.countdownRow}>
            {countdown > 0 ? (
              <Text style={styles.countdownText}>
                Mã có hiệu lực trong: <Text style={styles.countdownBold}>{formatCountdown(countdown)}</Text>
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResend}
                disabled={isResending}
                activeOpacity={0.7}
              >
                {isResending ? (
                  <ActivityIndicator size="small" color="#D97706" />
                ) : (
                  <Text style={styles.resendText}>Gửi lại mã xác thực</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (isSubmitting || otp.length !== 6) && styles.submitButtonDisabled,
            ]}
            onPress={handleVerify}
            disabled={isSubmitting || otp.length !== 6}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <View style={styles.buttonLoadingRow}>
                <ActivityIndicator size="small" color={colors.foreground} />
                <Text style={styles.submitButtonText}>Đang xác thực...</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>Xác nhận & Đăng ký</Text>
            )}
          </TouchableOpacity>
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
    marginBottom: 12,
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
  subtitle: {
    fontSize: 13,
    color: colors.mutedText,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  identifierText: {
    fontWeight: '700',
    color: colors.foreground,
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
    marginBottom: 20,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    flex: 1,
    lineHeight: 18,
  },
  otpBoxesRow: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFocused: {
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
  },
  otpBoxFilled: {
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  otpChar: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.foreground,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  countdownRow: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  countdownText: {
    fontSize: 13,
    color: colors.mutedText,
  },
  countdownBold: {
    fontWeight: '700',
    color: colors.foreground,
  },
  resendText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
  submitButton: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
});
