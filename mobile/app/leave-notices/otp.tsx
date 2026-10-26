import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import { mobileApiClient, MaskedContactChannel } from '@/services/api-client';

export default function LeaveNoticeOtpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác nhận OTP</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        {/* Context Card */}
        <View style={styles.infoCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="key-outline" size={28} color="#D97706" />
          </View>

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
            <TouchableOpacity onPress={handleResend} disabled={resending}>
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
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
  },
  content: {
    padding: 20,
    gap: 20,
    alignItems: 'center',
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  destinationList: {
    gap: 4,
    marginVertical: 4,
    alignItems: 'center',
  },
  destinationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  destinationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  consoleBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
  },
  infoSubtext: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  inputContainer: {
    width: '100%',
    alignItems: 'center',
  },
  otpInput: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFCB56',
    paddingVertical: 14,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 10,
    color: '#1E293B',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
  },
  errorText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '500',
  },
  resendRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  countdownText: {
    fontSize: 13,
    color: '#64748B',
  },
  resendBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
    textDecorationLine: 'underline',
  },
  submitBtn: {
    width: '100%',
    backgroundColor: '#FFCB56',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
});
