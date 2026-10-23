import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import { mobileApiClient } from '@/services/api-client';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={isVerifying}
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác thực OTP</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Verification Card */}
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="chatbubble-ellipses-outline" size={36} color="#D97706" />
          </View>

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
            <TouchableOpacity
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.foreground,
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13,
    color: colors.mutedText,
    textAlign: 'center',
  },
  maskedPhone: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
    marginTop: 4,
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  inputContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  otpInput: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 10,
    color: colors.foreground,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
    width: '100%',
  },
  timerRow: {
    marginBottom: 20,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  expiredText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  verifyButton: {
    backgroundColor: colors.primary,
    width: '100%',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 18,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendLabel: {
    fontSize: 13,
    color: colors.mutedText,
  },
  resendAction: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
  resendActionDisabled: {
    color: '#CBD5E1',
  },
});
