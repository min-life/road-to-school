import { AppHeader } from '@/components/navigation/app-header';
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import { mobileApiClient, LeaveNoticeItemDto, LeaveNoticeStatus } from '@/services/api-client';

export default function LeaveNoticeDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const noticeId = params.id;

  const [notice, setNotice] = useState<LeaveNoticeItemDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!noticeId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await mobileApiClient.getLeaveNoticeDetail(noticeId);
      setNotice(res);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải thông tin báo nghỉ');
    } finally {
      setLoading(false);
    }
  }, [noticeId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleCancelNotice = () => {
    if (!notice) return;

    Alert.alert(
      'Hủy báo nghỉ',
      'Bạn có chắc chắn muốn hủy báo nghỉ cho chuyến xe này? Trạng thái điểm danh hoặc phân công sẽ được khôi phục.',
      [
        { text: 'Đóng', style: 'cancel' },
        {
          text: 'Xác nhận hủy',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              await mobileApiClient.cancelLeaveNotice(notice.id);
              Alert.alert('Thành công', 'Đã hủy báo nghỉ thành công.');
              fetchDetail();
            } catch (err: any) {
              Alert.alert('Lỗi', err?.message || 'Không thể hủy báo nghỉ. Vui lòng thử lại.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const renderStatusBadge = (status: LeaveNoticeStatus, kind?: string) => {
    if (kind === 'STUDENT') {
      if (status === 'RECORDED') {
        return (
          <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}>
            <Text style={[styles.badgeText, { color: '#15803D' }]}>Đã nhận</Text>
          </View>
        );
      }
      if (status === 'WITHDRAWN') {
        return (
          <View style={[styles.badge, { backgroundColor: '#F1F5F9' }]}>
            <Text style={[styles.badgeText, { color: '#64748B' }]}>Đã hủy</Text>
          </View>
        );
      }
    }

    switch (status) {
      case 'PENDING_REPLACEMENT':
        return (
          <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.badgeText, { color: '#B45309' }]}>Chờ phân công</Text>
          </View>
        );
      case 'RECORDED':
        return (
          <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}>
            <Text style={[styles.badgeText, { color: '#15803D' }]}>Đã ghi nhận</Text>
          </View>
        );
      case 'REPLACED':
        return (
          <View style={[styles.badge, { backgroundColor: '#DBEAFE' }]}>
            <Text style={[styles.badgeText, { color: '#1E40AF' }]}>Đã bố trí thay thế</Text>
          </View>
        );
      case 'WITHDRAWN':
        return (
          <View style={[styles.badge, { backgroundColor: '#F1F5F9' }]}>
            <Text style={[styles.badgeText, { color: '#64748B' }]}>Đã hủy</Text>
          </View>
        );
      case 'TRIP_CANCELLED':
        return (
          <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.badgeText, { color: '#B91C1C' }]}>Chuyến đã hủy</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.badge, { backgroundColor: '#F1F5F9' }]}>
            <Text style={[styles.badgeText, { color: '#475569' }]}>{status}</Text>
          </View>
        );
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Đang tải chi tiết báo nghỉ...</Text>
      </View>
    );
  }

  if (error || !notice) {
    return (
      <View style={styles.container}>
        <AppHeader title="Chi tiết báo nghỉ" onBack={() => router.back()} />

        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          <Text style={styles.errorTitle}>Không tìm thấy đơn báo nghỉ</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchDetail}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const subject =
    notice.kind === 'STUDENT' ? notice.studentName || 'Học sinh' : notice.reportedByName;

  const directionLabel =
    notice.direction === 'TO_SCHOOL' ? 'Chiều đi (Đến trường)' : 'Chiều về (Về trạm)';

  return (
    <View style={styles.container}>
      {/* Header */}
      <AppHeader title="Chi tiết báo nghỉ" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeaderRow}>
            <Text style={styles.statusTitle}>Trạng thái đơn</Text>
            {renderStatusBadge(notice.status, notice.kind)}
          </View>
          <Text style={styles.statusMeta}>
            Gửi lúc {new Date(notice.createdAt).toLocaleString('vi-VN')}
          </Text>
        </View>

        {/* Section 1: Subject Info */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={18} color="#D97706" />
            <Text style={styles.sectionTitle}>Thông tin đối tượng</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Đối tượng nghỉ:</Text>
            <Text style={styles.infoValue}>{subject}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Người báo nghỉ:</Text>
            <Text style={styles.infoValue}>{notice.reportedByName}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vai trò:</Text>
            <Text style={styles.infoValue}>
              {notice.kind === 'STUDENT'
                ? 'Học sinh'
                : notice.kind === 'DRIVER'
                ? 'Tài xế'
                : 'Giáo viên phụ xe'}
            </Text>
          </View>
        </View>

        {/* Section 2: Trip Info */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bus-outline" size={18} color="#D97706" />
            <Text style={styles.sectionTitle}>Thông tin chuyến xe</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tuyến xe:</Text>
            <Text style={styles.infoValue}>{notice.routeName}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Chiều tuyến:</Text>
            <Text style={styles.infoValue}>{directionLabel}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ngày phục vụ:</Text>
            <Text style={styles.infoValue}>{notice.serviceDate}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Trường học:</Text>
            <Text style={styles.infoValue}>{notice.schoolName}</Text>
          </View>

          {notice.scheduledStartTime && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Giờ dự kiến:</Text>
              <Text style={styles.infoValue}>
                {notice.scheduledStartTime.slice(0, 5)} - {notice.scheduledEndTime?.slice(0, 5) || ''}
              </Text>
            </View>
          )}
        </View>

        {/* Section 3: Replacement / Processing Info (if applicable) */}
        {notice.replacementUserName && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people-outline" size={18} color="#2563EB" />
              <Text style={styles.sectionTitle}>Nhân sự thay thế</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Người thay thế:</Text>
              <Text style={[styles.infoValue, { color: '#1E40AF', fontWeight: '700' }]}>
                {notice.replacementUserName}
              </Text>
            </View>

            {notice.processedByName && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Bố trí bởi:</Text>
                <Text style={styles.infoValue}>{notice.processedByName}</Text>
              </View>
            )}

            {notice.processedAt && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Thời gian:</Text>
                <Text style={styles.infoValue}>
                  {new Date(notice.processedAt).toLocaleString('vi-VN')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Section 4: Cancellation Info (if withdrawn or trip cancelled) */}
        {notice.cancelledAt && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
              <Text style={styles.sectionTitle}>Thông tin hủy</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Thời gian hủy:</Text>
              <Text style={styles.infoValue}>
                {new Date(notice.cancelledAt).toLocaleString('vi-VN')}
              </Text>
            </View>
          </View>
        )}

        {/* Action button if creator can cancel */}
        {notice.canCancelLeave && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancelNotice}
            disabled={cancelling}
            activeOpacity={0.85}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
                <Text style={styles.cancelBtnText}>Hủy báo nghỉ này</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF6',
  },
  content: {
    padding: 16,
    gap: 14,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  errorText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: '#FFCB56',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  statusMeta: {
    fontSize: 11,
    color: '#94A3B8',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
});
