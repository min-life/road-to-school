import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import {
  mobileApiClient,
  LeaveNoticeItemDto,
  LeaveNoticeStatus,
  ParentLinkedStudentItem,
} from '@/services/api-client';

export default function LeaveNoticesHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ studentId?: string; studentName?: string }>();

  const isParent = user?.role === 'PARENT';

  // Filters state
  const [selectedStudentId, setSelectedStudentId] = useState<string>(params.studentId || '');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [students, setStudents] = useState<ParentLinkedStudentItem[]>([]);

  // Data state
  const [notices, setNotices] = useState<LeaveNoticeItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Load linked students for Parent
  useEffect(() => {
    if (isParent) {
      mobileApiClient
        .getLinkedStudents()
        .then((res) => setStudents(res || []))
        .catch(() => setStudents([]));
    }
  }, [isParent]);

  const fetchNotices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await mobileApiClient.listLeaveNotices({
        studentId: selectedStudentId || undefined,
        status: statusFilter !== 'ALL' ? (statusFilter as LeaveNoticeStatus) : undefined,
      });
      setNotices(res.items || []);
    } catch (err: any) {
      setNotices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStudentId, statusFilter]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotices();
  };

  const handleCancelNotice = (notice: LeaveNoticeItemDto) => {
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
              setCancellingId(notice.id);
              await mobileApiClient.cancelLeaveNotice(notice.id);
              Alert.alert('Thành công', 'Đã hủy báo nghỉ thành công.');
              fetchNotices();
            } catch (err: any) {
              Alert.alert('Lỗi', err?.message || 'Không thể hủy báo nghỉ. Vui lòng thử lại.');
            } finally {
              setCancellingId(null);
            }
          },
        },
      ]
    );
  };

  const renderStatusBadge = (noticeItem: LeaveNoticeItemDto) => {
    if (noticeItem.kind === 'STUDENT') {
      if (noticeItem.status === 'RECORDED') {
        return (
          <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}>
            <Text style={[styles.badgeText, { color: '#15803D' }]}>Đã nhận</Text>
          </View>
        );
      }
      if (noticeItem.status === 'WITHDRAWN') {
        return (
          <View style={[styles.badge, { backgroundColor: '#F1F5F9' }]}>
            <Text style={[styles.badgeText, { color: '#64748B' }]}>Đã hủy</Text>
          </View>
        );
      }
    }

    switch (noticeItem.status) {
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
            <Text style={[styles.badgeText, { color: '#475569' }]}>{noticeItem.status}</Text>
          </View>
        );
    }
  };

  const statusOptions = isParent
    ? [
        { id: 'ALL', label: 'Tất cả' },
        { id: 'RECORDED', label: 'Đã nhận' },
        { id: 'WITHDRAWN', label: 'Đã hủy' },
      ]
    : [
        { id: 'ALL', label: 'Tất cả' },
        { id: 'PENDING_REPLACEMENT', label: 'Chờ phân công' },
        { id: 'RECORDED', label: 'Đã ghi nhận' },
        { id: 'REPLACED', label: 'Đã bố trí' },
        { id: 'WITHDRAWN', label: 'Đã hủy' },
      ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Báo nghỉ</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() =>
            router.push({
              pathname: '/leave-notices/create',
              params: selectedStudentId ? { studentId: selectedStudentId } : {},
            } as any)
          }
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#1E293B" />
        </TouchableOpacity>
      </View>

      {/* Status Filter Row */}
      <View style={styles.statusFilterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {statusOptions.map((st) => {
            const active = statusFilter === st.id;
            return (
              <TouchableOpacity
                key={st.id}
                style={[styles.statusFilterChip, active && styles.statusFilterChipActive]}
                onPress={() => setStatusFilter(st.id)}
              >
                <Text style={[styles.statusFilterText, active && styles.statusFilterTextActive]}>
                  {st.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main List */}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Đang tải lịch sử báo nghỉ...</Text>
          </View>
        ) : notices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="calendar-outline" size={40} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>Chưa có báo nghỉ nào</Text>
            <Text style={styles.emptySubtitle}>
              Bạn chưa gửi đơn báo nghỉ nào hoặc không có đơn phù hợp với bộ lọc hiện tại.
            </Text>
            <TouchableOpacity
              style={styles.createNowBtn}
              onPress={() =>
                router.push({
                  pathname: '/leave-notices/create',
                  params: selectedStudentId ? { studentId: selectedStudentId } : {},
                } as any)
              }
            >
              <Ionicons name="add-circle-outline" size={18} color="#1E293B" />
              <Text style={styles.createNowBtnText}>Tạo báo nghỉ mới</Text>
            </TouchableOpacity>
          </View>
        ) : (
          notices.map((notice) => {
            const subject =
              notice.kind === 'STUDENT'
                ? notice.studentName || 'Học sinh'
                : notice.reportedByName;

            const directionLabel =
              notice.direction === 'TO_SCHOOL' ? 'Chiều đi' : 'Chiều về';

            const isCancelling = cancellingId === notice.id;

            return (
              <TouchableOpacity
                key={notice.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => router.push(`/leave-notices/${notice.id}` as any)}
              >
                {/* Card Top: Subject & Direction */}
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subjectText}>{subject}</Text>
                    <Text style={styles.subMetaText}>
                      {directionLabel} · {notice.serviceDate}
                    </Text>
                  </View>
                  {renderStatusBadge(notice)}
                </View>

                {/* Card Middle: Route & Time */}
                <View style={styles.routeBox}>
                  <View style={styles.routeRow}>
                    <Ionicons name="bus-outline" size={15} color="#64748B" />
                    <Text style={styles.routeNameText}>{notice.routeName}</Text>
                  </View>
                  {notice.scheduledStartTime && (
                    <Text style={styles.timeText}>
                      {notice.scheduledStartTime.slice(0, 5)} - {notice.scheduledEndTime?.slice(0, 5) || ''}
                    </Text>
                  )}
                </View>

                {/* Card Footer: Action button if creator can cancel */}
                {notice.canCancelLeave && (
                  <View style={styles.cardFooter}>
                    <TouchableOpacity
                      style={styles.cancelNoticeBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        handleCancelNotice(notice);
                      }}
                      disabled={isCancelling}
                    >
                      {isCancelling ? (
                        <ActivityIndicator size="small" color="#DC2626" />
                      ) : (
                        <>
                          <Ionicons name="close-circle-outline" size={15} color="#DC2626" />
                          <Text style={styles.cancelNoticeBtnText}>Hủy báo nghỉ</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
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
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFCB56',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsRow: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 8,
  },
  statusFilterRow: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8,
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#FFCB56',
    borderColor: '#FFCB56',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#1E293B',
    fontWeight: '700',
  },
  statusFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  statusFilterChipActive: {
    backgroundColor: '#1E293B',
  },
  statusFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  statusFilterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  centerContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
    marginBottom: 8,
  },
  createNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFCB56',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  createNowBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  subjectText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  subMetaText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  routeBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  routeNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    alignItems: 'flex-end',
  },
  cancelNoticeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cancelNoticeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
});
