import React, { useState, useEffect } from 'react';
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
import {
  mobileApiClient,
  StudentUpdateRequestDetail,
  RequestStatus,
} from '@/services/api-client';

export default function ParentRequestDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ requestId: string }>();
  const requestId = params.requestId;

  const [detail, setDetail] = useState<StudentUpdateRequestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancelRequest = () => {
    if (!detail || isCancelling) return;
    Alert.alert(
      'Hủy yêu cầu',
      'Bạn có chắc chắn muốn hủy yêu cầu cập nhật này không?',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy yêu cầu',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsCancelling(true);
              const updated = await mobileApiClient.cancelParentRequest(detail.id);
              setDetail(updated);
              Alert.alert('Thành công', 'Đã hủy yêu cầu thành công.');
            } catch (err: any) {
              Alert.alert('Lỗi', err?.message || 'Không thể hủy yêu cầu.');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (!requestId) return;

    let isMounted = true;
    mobileApiClient
      .getParentRequestDetail(requestId)
      .then((data) => {
        if (isMounted) setDetail(data);
      })
      .catch((err) => {
        if (isMounted) {
          setError(
            err?.message ||
              'Không thể tải chi tiết yêu cầu. Có thể bạn không còn quyền truy cập học sinh này.'
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [requestId]);

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <View style={[styles.badge, styles.pendingBadge]}>
            <Text style={styles.pendingBadgeText}>Chờ duyệt</Text>
          </View>
        );
      case 'APPROVED':
        return (
          <View style={[styles.badge, styles.approvedBadge]}>
            <Text style={styles.approvedBadgeText}>Đã duyệt</Text>
          </View>
        );
      case 'REJECTED':
        return (
          <View style={[styles.badge, styles.rejectedBadge]}>
            <Text style={styles.rejectedBadgeText}>Đã từ chối</Text>
          </View>
        );
      case 'CANCELLED':
        return (
          <View style={[styles.badge, styles.cancelledBadge]}>
            <Text style={styles.cancelledBadgeText}>Đã hủy</Text>
          </View>
        );
    }
  };

  const isAddress = detail?.type === 'ADDRESS_UPDATE';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết yêu cầu</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Đang tải chi tiết...</Text>
        </View>
      ) : error || !detail ? (
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Không thể tải yêu cầu</Text>
          <Text style={styles.errorText}>{error || 'Yêu cầu không tồn tại.'}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 24 },
          ]}
        >
          {/* Card: Status & Metadata */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.typeRow}>
                <View
                  style={[
                    styles.typeIconCircle,
                    { backgroundColor: isAddress ? '#DBEAFE' : '#FEF3C7' },
                  ]}
                >
                  <Ionicons
                    name={isAddress ? 'location-outline' : 'person-outline'}
                    size={20}
                    color={isAddress ? '#2563EB' : '#D97706'}
                  />
                </View>
                <View>
                  <Text style={styles.typeTitle}>
                    {isAddress ? 'Cập nhật địa chỉ' : 'Cập nhật thông tin'}
                  </Text>
                  <Text style={styles.studentNameText}>{detail.studentName}</Text>
                </View>
              </View>
              {getStatusBadge(detail.status)}
            </View>

            <View style={styles.metaDivider} />

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Ngày gửi yêu cầu</Text>
              <Text style={styles.metaValue}>
                {new Date(detail.createdAt).toLocaleString('vi-VN')}
              </Text>
            </View>

            {detail.reviewedAt && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Thời gian xử lý</Text>
                <Text style={styles.metaValue}>
                  {new Date(detail.reviewedAt).toLocaleString('vi-VN')}
                </Text>
              </View>
            )}

            {/* Resolution outcome */}
            {detail.resolution && (
              <View style={styles.resolutionBox}>
                <Ionicons name="git-branch-outline" size={16} color="#0284C7" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.resolutionTitle}>Kết quả xử lý phân tuyến:</Text>
                  <Text style={styles.resolutionOutcome}>
                    {detail.resolution.outcome === 'DIRECT_UPDATE'
                      ? 'Đã cập nhật trực tiếp địa chỉ học sinh (chưa phân vào tuyến nào).'
                      : detail.resolution.outcome === 'REOPTIMIZED'
                      ? 'Đã tối ưu hóa và cập nhật học sinh vào tuyến xe mới.'
                      : detail.resolution.outcome === 'REMOVED_FROM_ROUTES'
                      ? 'Đã cập nhật địa chỉ và loại học sinh khỏi tuyến cũ (chờ nhà trường phân tuyến lại).'
                      : detail.resolution.outcome}
                  </Text>
                </View>
              </View>
            )}

            {/* Rejection Reason */}
            {detail.status === 'REJECTED' && (
              <View style={styles.rejectionBox}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rejectionTitle}>Lý do từ chối:</Text>
                  <Text style={styles.rejectionReason}>
                    {detail.rejectionReason || 'Nhà trường không cung cấp lý do cụ thể.'}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Card: Data Comparison */}
          <View style={styles.card}>
            <Text style={styles.sectionHeaderTitle}>Nội dung thay đổi</Text>

            {isAddress ? (
              <View style={styles.comparisonContainer}>
                {/* Before Address */}
                <View style={styles.compareBlock}>
                  <Text style={styles.compareLabel}>Địa chỉ ban đầu</Text>
                  <Text style={styles.compareValueOld}>
                    {detail.beforeData?.addressText || 'Chưa có địa chỉ'}
                  </Text>
                </View>

                <View style={styles.compareArrow}>
                  <Ionicons name="arrow-down" size={18} color="#D97706" />
                </View>

                {/* Proposed Address */}
                <View style={[styles.compareBlock, styles.compareBlockNew]}>
                  <Text style={styles.compareLabelNew}>Địa chỉ đề xuất mới</Text>
                  <Text style={styles.compareValueNew}>
                    {detail.proposedData?.addressText || '—'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.comparisonContainer}>
                {detail.proposedData?.fullName && (
                  <View style={styles.fieldSection}>
                    <Text style={styles.fieldName}>Họ và tên học sinh</Text>
                    <View style={styles.fieldCompareRow}>
                      <View style={styles.compareHalf}>
                        <Text style={styles.compareLabel}>Ban đầu</Text>
                        <Text style={styles.compareValueOld}>
                          {detail.beforeData?.fullName || '—'}
                        </Text>
                      </View>
                      <View style={[styles.compareHalf, styles.compareBlockNew]}>
                        <Text style={styles.compareLabelNew}>Đề xuất mới</Text>
                        <Text style={styles.compareValueNew}>
                          {detail.proposedData.fullName}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {detail.proposedData?.guardianPhone && (
                  <View style={styles.fieldSection}>
                    <Text style={styles.fieldName}>Số điện thoại phụ huynh</Text>
                    <View style={styles.fieldCompareRow}>
                      <View style={styles.compareHalf}>
                        <Text style={styles.compareLabel}>Ban đầu</Text>
                        <Text style={styles.compareValueOld}>
                          {detail.beforeData?.guardianPhone || '—'}
                        </Text>
                      </View>
                      <View style={[styles.compareHalf, styles.compareBlockNew]}>
                        <Text style={styles.compareLabelNew}>Đề xuất mới</Text>
                        <Text style={styles.compareValueNew}>
                          {detail.proposedData.guardianPhone}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Cancel button for PENDING requests */}
          {detail.status === 'PENDING' && (
            <TouchableOpacity
              style={styles.cancelRequestBtn}
              onPress={handleCancelRequest}
              disabled={isCancelling}
              activeOpacity={0.8}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
                  <Text style={styles.cancelRequestBtnText}>Hủy yêu cầu này</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
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
    gap: 16,
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
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  studentNameText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  approvedBadge: {
    backgroundColor: '#D1FAE5',
  },
  approvedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  rejectedBadge: {
    backgroundColor: '#FEE2E2',
  },
  rejectedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
  },
  cancelledBadge: {
    backgroundColor: '#F1F5F9',
  },
  cancelledBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  resolutionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 10,
    padding: 10,
    gap: 8,
    marginTop: 4,
  },
  resolutionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
    marginBottom: 2,
  },
  resolutionOutcome: {
    fontSize: 12,
    color: '#0C4A6E',
    lineHeight: 16,
  },
  cancelRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 8,
  },
  cancelRequestBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  metaDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    gap: 8,
    marginTop: 4,
  },
  rejectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
    marginBottom: 2,
  },
  rejectionReason: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 16,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  comparisonContainer: {
    gap: 12,
  },
  compareBlock: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  compareBlockNew: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  compareArrow: {
    alignItems: 'center',
    marginVertical: -4,
  },
  compareLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  compareLabelNew: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  compareValueOld: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  compareValueNew: {
    fontSize: 13,
    fontWeight: '700',
    color: '#064E3B',
    lineHeight: 18,
  },
  fieldSection: {
    gap: 6,
  },
  fieldName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  fieldCompareRow: {
    flexDirection: 'row',
    gap: 8,
  },
  compareHalf: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 10,
  },
  errorText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
});
