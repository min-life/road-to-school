import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
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

export default function StudentDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const studentId = params.id;

  const [student, setStudent] = useState<ParentLinkedStudentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchStudentDetail = useCallback(async () => {
    if (!studentId) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await mobileApiClient.getLinkedStudentDetail(studentId);
      setStudent(data);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Không thể tải thông tin học sinh hoặc học sinh chưa được liên kết.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchStudentDetail();
  }, [fetchStudentDetail]);

  const handleUnlink = () => {
    if (!student) return;

    Alert.alert(
      'Xác nhận hủy liên kết',
      `Bạn có chắc chắn muốn hủy liên kết với học sinh ${student.fullName}? Sau khi hủy, học sinh sẽ không còn hiển thị trong danh sách theo dõi của bạn.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Hủy liên kết',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsUnlinking(true);
              await mobileApiClient.unlinkStudent(student.id);

              Alert.alert('Thành công', 'Đã hủy liên kết học sinh thành công.', [
                {
                  text: 'Đồng ý',
                  onPress: () => {
                    router.replace('/(tabs)/tracking');
                  },
                },
              ]);
            } catch (err: any) {
              Alert.alert('Lỗi', err?.message || 'Không thể hủy liên kết. Vui lòng thử lại.');
            } finally {
              setIsUnlinking(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Đang tải thông tin học sinh...</Text>
      </View>
    );
  }

  if (errorMessage || !student) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết học sinh</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Không tìm thấy học sinh</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchStudentDetail}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isAvailable = student.status === 'AVAILABLE';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={isUnlinking}
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hồ sơ học sinh</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        {/* SECTION 1 — THÔNG TIN HỌC SINH */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={18} color="#D97706" />
            <Text style={styles.sectionTitle}>Thông tin học sinh</Text>
          </View>

          {/* Profile Header */}
          <View style={styles.profileHeader}>
            {student.avatarUrl ? (
              <Image source={{ uri: student.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {(student.fullName || 'H').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.nameBlock}>
              <Text style={styles.fullName}>{student.fullName}</Text>
              <View style={styles.badgeRow}>
                {isAvailable ? (
                  <View style={styles.availableBadge}>
                    <Text style={styles.availableBadgeText}>Đang hoạt động</Text>
                  </View>
                ) : (
                  <View style={styles.disabledBadge}>
                    <Text style={styles.disabledBadgeText}>Đã vô hiệu hóa</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Detail Rows */}
          <View style={styles.detailRows}>
            {/* Trường học */}
            <View style={styles.row}>
              <View style={styles.rowLabelContainer}>
                <Ionicons name="school-outline" size={16} color={colors.mutedText} />
                <Text style={styles.rowLabel}>Trường học</Text>
              </View>
              <Text style={styles.rowValue}>{student.schoolName || 'Trường học'}</Text>
            </View>

            {/* Địa chỉ học sinh */}
            <View style={styles.row}>
              <View style={styles.rowLabelContainer}>
                <Ionicons name="location-outline" size={16} color={colors.mutedText} />
                <Text style={styles.rowLabel}>Địa chỉ đưa đón</Text>
              </View>
              <Text
                style={[
                  styles.rowValue,
                  !student.addressText && styles.noAddressValue,
                ]}
              >
                {student.addressText || 'Chưa có địa chỉ'}
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION 2 — THAO TÁC VỚI HỌC SINH */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings-outline" size={18} color="#475569" />
            <Text style={[styles.sectionTitle, { color: '#1E293B' }]}>
              Thao tác với học sinh
            </Text>
          </View>

          <View style={styles.actionsContainer}>
            {/* 1. Cập nhật thông tin học sinh */}
            <TouchableOpacity
              style={[
                styles.actionItemButton,
                !isAvailable && styles.actionItemButtonDisabled,
              ]}
              disabled={!isAvailable}
              onPress={() => {
                router.push({
                  pathname: '/parent/update-requests/information/[studentId]',
                  params: { studentId: student.id },
                });
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="person-outline" size={18} color="#D97706" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={[styles.actionTitle, !isAvailable && styles.actionTextDisabled]}>
                  Cập nhật thông tin học sinh
                </Text>
                <Text style={styles.actionSubtext}>
                  {isAvailable
                    ? 'Yêu cầu thay đổi tên học sinh hoặc số điện thoại'
                    : 'Không thể cập nhật khi học sinh bị vô hiệu hóa'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            {/* 2. Cập nhật địa chỉ đón trả */}
            <TouchableOpacity
              style={[
                styles.actionItemButton,
                !isAvailable && styles.actionItemButtonDisabled,
              ]}
              disabled={!isAvailable}
              onPress={() => {
                router.push({
                  pathname: '/parent/update-requests/address/[studentId]',
                  params: { studentId: student.id },
                });
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="location-outline" size={18} color="#2563EB" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={[styles.actionTitle, !isAvailable && styles.actionTextDisabled]}>
                  Cập nhật địa chỉ đón trả
                </Text>
                <Text style={styles.actionSubtext}>
                  {isAvailable
                    ? 'Yêu cầu thay đổi địa chỉ đón trả trên tuyến xe'
                    : 'Không thể cập nhật khi học sinh bị vô hiệu hóa'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            {/* 3. Tuyến đường đưa đón */}
            <TouchableOpacity
              style={styles.actionItemButton}
              onPress={() => {
                router.push({
                  pathname: '/parent/route-detail',
                  params: { studentId: student.id, studentName: student.fullName },
                });
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="bus-outline" size={18} color="#D97706" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Tuyến đường đưa đón</Text>
                <Text style={styles.actionSubtext}>
                  Lộ trình di chuyển, giờ đón/trả và xe dự kiến
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            {/* 4. Lịch học & Xe đưa đón */}
            <TouchableOpacity
              style={styles.actionItemButton}
              onPress={() => {
                router.push({
                  pathname: '/parent/schedule',
                  params: { studentId: student.id, studentName: student.fullName },
                });
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: '#E0E7FF' }]}>
                <Ionicons name="calendar-outline" size={18} color="#4F46E5" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Lịch học & Xe đưa đón</Text>
                <Text style={styles.actionSubtext}>
                  Lịch trình các chuyến xe đưa đón theo từng ngày trong tuần
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            {/* 5. Báo nghỉ */}
            <TouchableOpacity
              style={styles.actionItemButton}
              onPress={() => {
                router.push({
                  pathname: '/leave-notices',
                  params: { studentId: student.id, studentName: student.fullName },
                } as any);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="calendar-outline" size={18} color="#D97706" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Báo nghỉ</Text>
                <Text style={styles.actionSubtext}>
                  Xem lịch sử báo nghỉ và tạo báo nghỉ cho chuyến xe
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            {/* 6. Hủy liên kết học sinh */}
            <TouchableOpacity
              style={[styles.actionItemButton, styles.unlinkItemButton]}
              onPress={handleUnlink}
              disabled={isUnlinking}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: '#FEE2E2' }]}>
                {isUnlinking ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                )}
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={[styles.actionTitle, { color: '#DC2626' }]}>
                  Hủy liên kết học sinh
                </Text>
                <Text style={styles.actionSubtext}>
                  Gỡ học sinh khỏi danh sách theo dõi của phụ huynh
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#F87171" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: colors.mutedText,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.foreground,
    marginTop: 12,
  },
  errorText: {
    fontSize: 13,
    color: colors.mutedText,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.foreground,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.foreground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.primary,
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '800',
    color: '#92400E',
  },
  nameBlock: {
    flex: 1,
  },
  fullName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.foreground,
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  availableBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  availableBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  disabledBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  disabledBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  detailRows: {
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 14,
  },
  row: {
    gap: 4,
  },
  rowLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedText,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
    paddingLeft: 22,
  },
  noAddressValue: {
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  unlinkDescription: {
    fontSize: 13,
    color: colors.mutedText,
    lineHeight: 18,
    marginBottom: 16,
  },
  unlinkActionButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unlinkActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  actionsContainer: {
    gap: 10,
    marginTop: 6,
  },
  actionItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
  },
  actionItemButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#F1F5F9',
  },
  unlinkItemButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
    marginTop: 4,
  },
  actionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 6,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  actionTextDisabled: {
    color: '#94A3B8',
  },
  actionSubtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
});
