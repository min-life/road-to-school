import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OtpHero } from '@/components/auth/otp-hero';
import { otpStyles } from '@/constants/otp-styles';
import { AppHeader } from '@/components/navigation/app-header';
import { KeyboardScrollView } from '@/components/keyboard-scroll-view';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import { mobileApiClient, MaskedContactChannel } from '@/services/api-client';

export default function LeaveNoticeOtpScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    challengeId: string;
    maskedChannels: string;
    expiresInSeconds: string;
    tripId: string;
    studentId?: string;
    reason?: string;
    subjectName?: string;
    routeName?: string;
    serviceDate?: string;
    direction?: string;
  }>();

  const [challengeId, setChallengeId] = useState(params.challengeId || '');
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse masked contact channels
  const channels: MaskedContactChannel[] = React.useMemo(() => {
    try {
      return params.maskedChannels ? JSON.parse(params.maskedChannels) : [];
    } catch {
      return [];
    }
  }, [params.maskedChannels]);

  // Countdown timer in seconds
  const initialSeconds = parseInt(params.expiresInSeconds || '60', 10);
  const [countdown, setCountdown] = useState(Math.min(initialSeconds, 60));

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleResend = async () => {
    if (countdown > 0 || resending) return;

    setResending(true);
    setError(null);

    try {
      const res = await mobileApiClient.requestLeaveNoticeOtp({
        tripId: params.tripId,
        studentId: params.studentId || undefined,
      });

      setChallengeId(res.challengeId);
      setCountdown(60);
      setOtp('');
      Alert.alert('Đã gửi lại mã', 'Mã xác thực mới đã được gửi tới thông tin liên hệ của bạn.');
    } catch (err: any) {
      const msg = err?.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại sau.';
      setError(msg);
      Alert.alert('Lỗi', msg);
    } finally {
      setResending(false);
    }
  };

  const handleConfirm = async () => {
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setError('Vui lòng nhập đầy đủ 6 chữ số mã OTP');
      return;
    }

    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      await mobileApiClient.confirmLeaveNotice({
        challengeId,
        otp: cleanOtp,
        tripId: params.tripId,
        studentId: params.studentId || undefined,
        reason: params.reason || undefined,
      });

      Alert.alert(
        'Báo nghỉ thành công',
        'Đơn báo nghỉ đã được ghi nhận vào hệ thống.',
        [
          {
            text: 'Xem lịch sử',
            onPress: () => {
              router.replace('/leave-notices' as any);
            },
          },
        ],
        { cancelable: false }
      );
    } catch (err: any) {
      const msg = err?.message || 'Mã OTP không đúng hoặc đã hết hạn';
      setError(msg);
      Alert.alert('Xác nhận thất bại', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View
      style={styles.container}
    >
      {/* Header */}
      <AppHeader title="Xác nhận OTP" onBack={() => router.back()} />

      <KeyboardScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {/* Context Card */}
        <View style={styles.infoCard}>
          <OtpHero />

          <Text style={styles.infoTitle}>Nhập mã xác thực</Text>

          <View style={styles.destinationList}>
            {channels.map((ch, idx) => (
              <View key={idx} style={styles.destinationItem}>
                <Ionicons
                  name={ch.channel === 'EMAIL' ? 'mail-outline' : 'chatbox-ellipses-outline'}
                  size={15}
                  color="#64748B"
                />
                <Text style={styles.destinationText}>
                  {ch.destination}
                  {ch.isConsole ? (
                    <Text style={styles.consoleBadge}> (SMS console)</Text>
                  ) : null}
                </Text>
              </View>
            ))}
          </View>

          <Text style={styles.infoSubtext}>
            Mã OTP gồm 6 chữ số đã được gửi tới thông tin liên hệ trên. Vui lòng nhập để hoàn tất báo nghỉ.
          </Text>
        </View>

        {/* OTP Input */}
        <View style={styles.inputContainer}>
          <TextInput
            accessibilityLabel="Nhập mã OTP"
            style={styles.otpInput}
            value={otp}
            onChangeText={(txt) => {
              const num = txt.replace(/[^0-9]/g, '').slice(0, 6);
              setOtp(num);
              if (error) setError(null);
            }}
            placeholder="000000"
            placeholderTextColor="#CBD5E1"
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
        </View>

        {/* Error message */}
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Resend row */}
        <View style={styles.resendRow}>
          {countdown > 0 ? (
            <Text style={styles.countdownText}>
              Gửi lại mã sau <Text style={{ fontWeight: '700' }}>{countdown}s</Text>
            </Text>
          ) : (
            <TouchableOpacity style={otpStyles.linkButton} onPress={handleResend} disabled={resending}>
              {resending ? (
                <ActivityIndicator size="small" color="#D97706" />
              ) : (
                <Text style={styles.resendBtnText}>Gửi lại mã OTP</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (otp.length !== 6 || submitting) && styles.submitBtnDisabled,
          ]}
          onPress={handleConfirm}
          disabled={otp.length !== 6 || submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#1E293B" />
          ) : (
            <Text style={styles.submitBtnText}>Xác nhận báo nghỉ</Text>
          )}
        </TouchableOpacity>
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
    gap: 12,
  },
  infoCard: {
    ...otpStyles.section,
  },
  infoTitle: {
    ...otpStyles.heading,
  },
  destinationList: {
    gap: 6,
    marginVertical: 8,
    width: "100%",
  },
  destinationItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: "100%",
  },
  destinationText: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "600",
    color: colors.foreground,
  },
  consoleBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
  },
  infoSubtext: {
    ...otpStyles.description,
    marginBottom: 0,
  },
  inputContainer: {
    ...otpStyles.inputWrap,
  },
  otpInput: {
    ...otpStyles.codeInput,
  },
  errorBox: {
    ...otpStyles.error,
  },
  errorText: {
    ...otpStyles.errorText,
  },
  resendRow: {
    alignItems: "center",
  },
  countdownText: {
    ...otpStyles.meta,
  },
  resendBtnText: {
    ...otpStyles.link,
  },
  submitBtn: {
    ...otpStyles.button,
  },
  submitBtnDisabled: {
    ...otpStyles.disabled,
  },
  submitBtnText: {
    ...otpStyles.buttonText,
  },
});
