import { KeyboardScrollView } from '@/components/keyboard-scroll-view';
import React, { useState, useEffect } from 'react';
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
  ParentLinkedStudentDetail,
} from '@/services/api-client';

export default function CreateInformationRequestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ studentId: string }>();
  const studentId = params.studentId;

  const [student, setStudent] = useState<ParentLinkedStudentDetail | null>(null);
  const [isLoadingStudent, setIsLoadingStudent] = useState(true);

  // Form fields
  const [proposedFullName, setProposedFullName] = useState('');
  const [proposedGuardianPhone, setProposedGuardianPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    mobileApiClient
      .getLinkedStudentDetail(studentId)
      .then((data) => {
        setStudent(data);
        setProposedFullName(data.fullName || '');
      })
      .catch((err) => {
        Alert.alert('Lỗi', err?.message || 'Không thể tải thông tin học sinh.');
      })
      .finally(() => {
        setIsLoadingStudent(false);
      });
  }, [studentId]);

  const handleSubmit = async () => {
    if (!student || !studentId) return;

    const trimmedName = proposedFullName.trim();
    const trimmedPhone = proposedGuardianPhone.trim();

    // Determine what changed
    const proposedData: Record<string, any> = {};

    if (trimmedName && trimmedName !== student.fullName) {
      proposedData.fullName = trimmedName;
    }

    if (trimmedPhone) {
      // Validate phone format
      const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
      if (!phoneRegex.test(trimmedPhone)) {
        Alert.alert(
          'Số điện thoại không hợp lệ',
          'Vui lòng nhập đúng định dạng số điện thoại Việt Nam (ví dụ: 0912345678).'
        );
        return;
      }
      proposedData.guardianPhone = trimmedPhone;
    }

    if (Object.keys(proposedData).length === 0) {
      Alert.alert(
        'Chưa có thay đổi',
        'Vui lòng nhập họ tên mới hoặc số điện thoại mới khác với thông tin hiện tại.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const otpRes = await mobileApiClient.requestStudentUpdateOtp(studentId, {
        type: 'INFORMATION_UPDATE',
        proposedData,
      });

      // Navigate to OTP verification screen
      router.push({
        pathname: '/parent/create-request/verify-otp',
        params: {
          studentId,
          type: 'INFORMATION_UPDATE',
          challengeId: otpRes.challengeId,
          maskedPhone: otpRes.maskedPhone,
          proposedDataJson: JSON.stringify(proposedData),
        },
      });
    } catch (err: any) {
      Alert.alert(
        'Không thể gửi mã xác thực',
        err?.message || 'Không thể gửi yêu cầu mã OTP. Vui lòng thử lại sau.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đổi thông tin học sinh</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoadingStudent ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
        </View>
      ) : (
        <KeyboardScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Notice Card */}
          <View style={styles.noticeCard}>
            <Ionicons name="information-circle-outline" size={18} color="#B45309" />
            <Text style={styles.noticeText}>
              Yêu cầu cập nhật sẽ được gửi tới Ban giám hiệu nhà trường phê duyệt sau khi xác thực OTP thành công.
            </Text>
          </View>

          {/* Current Student Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Thông tin hiện tại</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Họ và tên học sinh:</Text>
              <Text style={styles.infoValue}>{student?.fullName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mã học sinh:</Text>
              <Text style={styles.infoValueCode}>{student?.code}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Trường học:</Text>
              <Text style={styles.infoValue}>{student?.schoolName}</Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Đề xuất thông tin mới</Text>

            {/* Proposed Full Name */}
            <Text style={styles.fieldLabel}>Họ và tên mới của học sinh</Text>
            <TextInput
              style={styles.textInput}
              value={proposedFullName}
              onChangeText={setProposedFullName}
              placeholder="Nhập họ và tên học sinh"
              placeholderTextColor="#94A3B8"
            />
            <Text style={styles.fieldHint}>
              Để nguyên nếu không có nhu cầu đổi họ tên học sinh.
            </Text>

            {/* Proposed Guardian Phone */}
            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
              Số điện thoại người giám hộ mới
            </Text>
            <TextInput
              style={styles.textInput}
              value={proposedGuardianPhone}
              onChangeText={setProposedGuardianPhone}
              placeholder="Nhập số điện thoại (ví dụ: 0912345678)"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
            />
            <Text style={styles.fieldHint}>
              Để trống nếu không có nhu cầu đổi số điện thoại người giám hộ.
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#1E293B" />
            ) : (
              <View style={styles.submitRow}>
                <Text style={styles.submitButtonText}>Tiếp tục xác thực OTP</Text>
                <Ionicons name="arrow-forward" size={18} color="#1E293B" />
              </View>
            )}
          </TouchableOpacity>
        </KeyboardScrollView>
      )}
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
    padding: 16,
    gap: 14,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
    color: colors.mutedText,
    marginTop: 10,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    gap: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  infoValueCode: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#B45309',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  fieldHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  submitButton: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  submitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
});
