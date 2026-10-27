import { KeyboardScrollView } from '@/components/keyboard-scroll-view';
import React, { useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import {
  mobileApiClient,
  RequestType,
} from '@/services/api-client';

export default function VerifyOtpRequestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    studentId: string;
    type: RequestType;
    challengeId: string;
    maskedPhone: string;
    proposedDataJson: string;
  }>();

  const { studentId, type, challengeId, maskedPhone, proposedDataJson } = params;

  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleVerify = async () => {
    const trimmedOtp = otp.trim();
    if (!trimmedOtp || trimmedOtp.length !== 6) {
      setErrorMessage('Vui lòng nhập đủ 6 chữ số mã OTP.');
      return;
    }

    let proposedData: Record<string, any>;
    try {
      proposedData = JSON.parse(proposedDataJson);
    } catch {
      setErrorMessage('Dữ liệu yêu cầu không hợp lệ. Vui lòng quay lại tạo mới.');
      return;
    }

    try {
      setIsVerifying(true);
      setErrorMessage(null);

      await mobileApiClient.verifyStudentUpdateOtp(studentId, {
        challengeId,
        otp: trimmedOtp,
        type,
        proposedData,
      });

      Alert.alert(
        'Gửi yêu cầu thành công',
        'Yêu cầu của bạn đã được ghi nhận ở trạng thái Chờ duyệt. Ban giám hiệu sẽ xem xét và phản hồi sớm nhất.',
        [
          {
            text: 'Xem danh sách yêu cầu',
            onPress: () => {
              if (type === 'ADDRESS_UPDATE') {
                router.replace({
                  pathname: '/parent/update-requests/address/[studentId]',
                  params: { studentId },
                });
              } else {
                router.replace({
                  pathname: '/parent/update-requests/information/[studentId]',
                  params: { studentId },
                });
              }
            },
          },
        ]
      );
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          'Mã xác thực không chính xác hoặc đã hết hạn. Vui lòng thử lại.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <View
      style={styles.container}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác thực OTP</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {/* OTP Shield Icon */}
        <View style={styles.iconCircle}>
          <Ionicons name="shield-checkmark" size={36} color="#D97706" />
        </View>

        <Text style={styles.title}>Nhập mã xác thực</Text>
        <Text style={styles.subtitle}>
          Mã xác thực 6 chữ số đã được gửi đến số điện thoại người giám hộ{' '}
          <Text style={styles.phoneHighlight}>{maskedPhone || 'của bạn'}</Text>.
        </Text>

        {/* Error banner */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#DC2626" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* OTP Input */}
        <View style={styles.otpInputContainer}>
          <TextInput
            style={styles.otpInput}
            value={otp}
            onChangeText={(val) => {
              setOtp(val.replace(/[^0-9]/g, '').slice(0, 6));
              setErrorMessage(null);
            }}
            placeholder="000000"
            placeholderTextColor="#CBD5E1"
            keyboardType="number-pad"
            maxLength={6}
            autoFocus={true}
          />
        </View>

        <Text style={styles.hintText}>
          Mã xác thực có hiệu lực trong vòng 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.
        </Text>

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.verifyButton, (otp.length < 6 || isVerifying) && styles.verifyButtonDisabled]}
          onPress={handleVerify}
          disabled={otp.length < 6 || isVerifying}
          activeOpacity={0.8}
        >
          {isVerifying ? (
            <ActivityIndicator size="small" color="#1E293B" />
          ) : (
            <Text style={styles.verifyButtonText}>Xác nhận & Gửi yêu cầu</Text>
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
    fontSize: 17,
    fontWeight: '700',
    color: colors.foreground,
  },
  content: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  phoneHighlight: {
    fontWeight: '700',
    color: '#1E293B',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    gap: 8,
    width: '100%',
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#B91C1C',
  },
  otpInputContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  otpInput: {
    width: 220,
    height: 56,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 10,
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
  },
  hintText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  verifyButton: {
    width: '100%',
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  verifyButtonDisabled: {
    opacity: 0.4,
  },
  verifyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
});
