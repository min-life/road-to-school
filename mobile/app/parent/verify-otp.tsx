import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OtpHero } from '@/components/auth/otp-hero';
import { otpStyles } from '@/constants/otp-styles';
import { AppHeader } from '@/components/navigation/app-header';
import { KeyboardScrollView } from '@/components/keyboard-scroll-view';
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import { mobileApiClient } from '@/services/api-client';

export default function VerifyOtpScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    challengeId: string;
    maskedPhone: string;
    expiresInSeconds: string;
    studentCode: string;
  }>();

  const [challengeId, setChallengeId] = useState(params.challengeId || '');
  const [maskedPhone, setMaskedPhone] = useState(params.maskedPhone || 'Số điện thoại giám hộ');
  const [studentCode] = useState(params.studentCode || '');

  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Timer countdown
  const initialSeconds = parseInt(params.expiresInSeconds || '300', 10);
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);

  useEffect(() => {
    if (secondsRemaining <= 0) return;

    const intervalId = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [secondsRemaining]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleVerify = async () => {
    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      setErrorMessage('Vui lòng nhập mã OTP.');
      return;
    }

    if (cleanOtp.length < 4 || cleanOtp.length > 8) {
      setErrorMessage('Mã OTP thường gồm 6 chữ số.');
      return;
    }

    try {
      setIsVerifying(true);
      setErrorMessage(null);

      const res = await mobileApiClient.verifyLinkOtp(challengeId, cleanOtp);

      Alert.alert(
        'Thành công',
        `Đã hoàn tất liên kết với học sinh ${res.fullName} (${res.code}).`,
        [
          {
            text: 'Về danh sách',
            onPress: () => {
              router.replace('/(tabs)/tracking');
            },
          },
        ]
      );
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Mã OTP không chính xác hoặc đã hết hạn. Vui lòng thử lại.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (!studentCode || isResending || secondsRemaining > 0) return;

    try {
      setIsResending(true);
      setErrorMessage(null);

      const res = await mobileApiClient.requestLinkOtp(studentCode);
      setChallengeId(res.challengeId);
      setMaskedPhone(res.maskedPhone);
      setSecondsRemaining(res.expiresInSeconds || 300);
      setOtp('');

      Alert.alert('Đã gửi lại OTP', 'Mã xác thực mới đã được gửi tới số điện thoại người giám hộ.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View
      style={styles.container}
    >
      {/* Header */}
      <AppHeader title="Xác thực OTP" onBack={() => router.back()} backDisabled={isVerifying} />

      <KeyboardScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {/* Verification Card */}
        <View style={styles.card}>
          <OtpHero />

          <Text style={styles.cardTitle}>Nhập mã xác thực</Text>
          <Text style={styles.cardDescription}>
            Mã OTP gồm 6 chữ số đã được gửi đến số điện thoại:
          </Text>
          <Text style={styles.maskedPhone}>{maskedPhone}</Text>

          {/* Error Banner */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* OTP Input */}
          <View style={styles.inputContainer}>
            <TextInput
              accessibilityLabel="Nhập mã OTP"
              style={styles.otpInput}
              value={otp}
              onChangeText={(val) => {
                setOtp(val.replace(/[^0-9]/g, ''));
                setErrorMessage(null);
              }}
              placeholder="000000"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={8}
              autoFocus
              editable={!isVerifying}
            />
          </View>

          {/* Expiry Timer */}
          <View style={styles.timerRow}>
            {secondsRemaining > 0 ? (
              <View style={styles.timerBadge}>
                <Ionicons name="time-outline" size={14} color="#D97706" />
                <Text style={styles.timerText}>
                  Hiệu lực còn: {formatTimer(secondsRemaining)}
                </Text>
              </View>
            ) : (
              <Text style={styles.expiredText}>Mã OTP đã hết hiệu lực</Text>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              (!otp.trim() || isVerifying) && styles.verifyButtonDisabled,
            ]}
            onPress={handleVerify}
            disabled={!otp.trim() || isVerifying}
            activeOpacity={0.85}
          >
            {isVerifying ? (
              <ActivityIndicator size="small" color={colors.foreground} />
            ) : (
              <Text style={styles.verifyButtonText}>Xác nhận liên kết</Text>
            )}
          </TouchableOpacity>

          {/* Resend Link */}
          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Không nhận được mã? </Text>
            <TouchableOpacity style={otpStyles.linkButton}
              onPress={handleResendOtp}
              disabled={secondsRemaining > 0 || isResending}
            >
              {isResending ? (
                <ActivityIndicator size="small" color="#D97706" />
              ) : (
                <Text
                  style={[
                    styles.resendAction,
                    secondsRemaining > 0 && styles.resendActionDisabled,
                  ]}
                >
                  Gửi lại mã
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    ...otpStyles.content,
  },
  card: {
    ...otpStyles.section,
  },
  cardTitle: {
    ...otpStyles.heading,
  },
  cardDescription: {
    ...otpStyles.description,
    marginBottom: 0,
  },
  maskedPhone: {
    ...otpStyles.destination,
  },
  errorBox: {
    ...otpStyles.error,
  },
  errorText: {
    ...otpStyles.errorText,
  },
  inputContainer: {
    ...otpStyles.inputWrap,
  },
  otpInput: {
    ...otpStyles.codeInput,
  },
  timerRow: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.navigationHighlight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timerText: {
    ...otpStyles.meta,
    color: colors.navigationActive,
    fontWeight: "600",
  },
  expiredText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  verifyButton: {
    ...otpStyles.button,
    marginBottom: 12,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    ...otpStyles.buttonText,
  },
  resendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  resendLabel: {
    ...otpStyles.meta,
  },
  resendAction: {
    ...otpStyles.link,
  },
  resendActionDisabled: {
    color: '#CBD5E1',
  },
});
