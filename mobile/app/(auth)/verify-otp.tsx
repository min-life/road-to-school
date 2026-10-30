import { SafeAreaView } from 'react-native-safe-area-context';
import { OtpHero } from '@/components/auth/otp-hero';
import { otpStyles } from '@/constants/otp-styles';
import { KeyboardScrollView } from '@/components/keyboard-scroll-view';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
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
    <SafeAreaView style={styles.keyboardContainer} edges={['top', 'bottom', 'left', 'right']}>
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
          </View>
          <OtpHero />
          <Text accessibilityRole="header" style={styles.headerTitle}>Xác thực mã OTP</Text>

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
              accessibilityLabel="Nhập mã OTP"
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
              <TouchableOpacity style={otpStyles.linkButton}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    ...otpStyles.authContent,
  },
  card: {
    ...otpStyles.authFrame,
  },
  headerRow: {
    ...otpStyles.backRow,
  },
  backButton: {
    ...otpStyles.backButton,
  },
  headerTitle: {
    ...otpStyles.heading,
  },
  subtitle: {
    ...otpStyles.description,
  },
  identifierText: {
    fontWeight: "700",
    color: colors.foreground,
  },
  errorBanner: {
    ...otpStyles.error,
  },
  errorText: {
    ...otpStyles.errorText,
  },
  otpBoxesRow: {
    ...otpStyles.boxes,
  },
  otpBox: {
    ...otpStyles.box,
  },
  otpBoxFocused: {
    ...otpStyles.boxActive,
  },
  otpBoxFilled: {
    ...otpStyles.boxFilled,
  },
  otpChar: {
    ...otpStyles.character,
  },
  hiddenInput: {
    ...otpStyles.hiddenInput,
  },
  countdownRow: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  countdownText: {
    ...otpStyles.meta,
  },
  countdownBold: {
    fontWeight: '700',
    color: colors.foreground,
  },
  resendText: {
    ...otpStyles.link,
  },
  submitButton: {
    ...otpStyles.button,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  buttonLoadingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitButtonText: {
    ...otpStyles.buttonText,
  },
});
