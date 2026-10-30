import { OtpHero } from '@/components/auth/otp-hero';
import { otpStyles } from '@/constants/otp-styles';
import { AppHeader } from '@/components/navigation/app-header';
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
      <AppHeader title="Xác thực OTP" onBack={() => router.back()} />

      <KeyboardScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {/* OTP Shield Icon */}
        <OtpHero />

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
            accessibilityLabel="Nhập mã OTP"
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
  content: {
    ...otpStyles.content,
  },
  title: {
    ...otpStyles.heading,
  },
  subtitle: {
    ...otpStyles.description,
  },
  phoneHighlight: {
    fontWeight: '700',
    color: '#1E293B',
  },
  errorBanner: {
    ...otpStyles.error,
  },
  errorText: {
    ...otpStyles.errorText,
  },
  otpInputContainer: {
    ...otpStyles.inputWrap,
  },
  otpInput: {
    ...otpStyles.codeInput,
  },
  hintText: {
    ...otpStyles.hint,
  },
  verifyButton: {
    ...otpStyles.button,
  },
  verifyButtonDisabled: {
    opacity: 0.4,
  },
  verifyButtonText: {
    ...otpStyles.buttonText,
  },
});
