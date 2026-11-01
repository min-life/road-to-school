import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import { AppHeader, HeaderAction } from '@/components/navigation/app-header';
import { requestHistoryStyles as historyStyles } from '@/constants/request-history-styles';
import { listLinkedStudentRequests } from '@/services/parent-request-history';
import {
  mobileApiClient,
  StudentUpdateRequest,
  RequestType,
  RequestStatus,
  ParentLinkedStudentDetail,
} from '@/services/api-client';

interface RequestListViewProps {
  /** Omit to show requests across the parent's currently linked children. */
  studentId?: string;
  appearance?: 'default' | 'leave-history';
  requestType: RequestType;
  title: string;
  createRoute: string;
  createButtonLabel: string;
  emptyMessage: string;
}

export function RequestListView({
  studentId,
  appearance = 'default',
  requestType,
  title,
  createRoute,
  createButtonLabel,
  emptyMessage,
}: RequestListViewProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const isHistoryAppearance = appearance === 'leave-history';

  const [student, setStudent] = useState<ParentLinkedStudentDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'ALL'>('ALL');
  const [requests, setRequests] = useState<StudentUpdateRequest[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestGeneration = useRef(0);

  // Load student detail for name & disabled state
  useFocusEffect(useCallback(() => {
    let active = true;
    setStudent(current => current?.id === studentId ? current : null);
    if (!studentId) return;
    mobileApiClient
      .getLinkedStudentDetail(studentId)
      .then(result => { if (active) setStudent(result); })
      .catch((err) => console.warn('Could not load student in RequestListView:', err));
    return () => { active = false; };
  }, [studentId]));

  // Fetch requests from Server with strict type & status filter
  const fetchRequests = useCallback(
    async (targetPage = 1, isPull = false) => {
      const generation = ++requestGeneration.current;
      const isCurrent = () => generation === requestGeneration.current;
      try {
        setIsRefreshing(isPull);
        setIsLoading(!isPull);
        setError(null);

        if (studentId === '') throw new Error('Không tìm thấy học sinh. Vui lòng quay lại.');
        const query = {
          page: targetPage,
          limit: 10,
          type: requestType,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
        };
        const res = studentId
          ? await mobileApiClient.listParentStudentRequests(studentId, query)
          : await listLinkedStudentRequests(query, isCurrent);
        if (!isCurrent()) return;

        setRequests(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setPage(res.page);
      } catch (err: any) {
        if (!isCurrent()) return;
        setRequests([]);
        setError(err?.message || 'Không thể tải danh sách yêu cầu cập nhật.');
      } finally {
        if (isCurrent()) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [studentId, requestType, statusFilter]
  );

  useFocusEffect(useCallback(() => {
    void fetchRequests(1);
    return () => { requestGeneration.current += 1; };
  }, [fetchRequests]));

  const handleCreateRequest = () => {
    if (studentId === '') return;
    if (student && student.status === 'DISABLED') {
      Alert.alert(
        'Không thể tạo yêu cầu',
        'Học sinh này đang bị vô hiệu hóa. Vui lòng liên hệ nhà trường để được hỗ trợ.'
      );
      return;
    }
    router.push({
      pathname: createRoute as any,
      params: studentId ? { studentId } : {},
    });
  };

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

  const isAddress = requestType === 'ADDRESS_UPDATE';

  const renderRequestItem = ({ item }: { item: StudentUpdateRequest }) => {
    const summary = isAddress
      ? item.proposedData?.addressText || 'Đề xuất đổi địa chỉ đón trả'
      : item.proposedData?.fullName
      ? `Tên mới: ${item.proposedData.fullName}`
      : item.proposedData?.guardianPhone
      ? `SĐT mới: ${item.proposedData.guardianPhone}`
      : 'Đề xuất cập nhật thông tin';

    return (
      <TouchableOpacity
        style={[styles.card, isHistoryAppearance && historyStyles.card]}
        activeOpacity={0.7}
        onPress={() => {
          router.push({
            pathname: '/parent/update-requests/detail/[requestId]',
            params: { requestId: item.id },
          });
        }}
      >
        <View style={[styles.cardHeader, isHistoryAppearance && historyStyles.cardHeader]}>
          <View style={[styles.cardTypeRow, isHistoryAppearance && historyStyles.cardTypeRow]}>
            <View
              style={[
                styles.typeIconCircle,
                { backgroundColor: isAddress ? '#DBEAFE' : '#FEF3C7' },
              ]}
            >
              <Ionicons
                name={isAddress ? 'location-outline' : 'person-outline'}
                size={16}
                color={isAddress ? '#2563EB' : '#D97706'}
              />
            </View>
            <Text style={[styles.cardTypeTitle, isHistoryAppearance && historyStyles.cardTypeTitle]}>
              {isAddress ? 'Địa chỉ đón trả' : 'Thông tin học sinh'}
            </Text>
          </View>
          {getStatusBadge(item.status)}
        </View>

        {studentId === undefined && (
          <Text style={[styles.studentName, isHistoryAppearance && historyStyles.studentName]}>{item.studentName}</Text>
        )}

        <Text style={[styles.summaryText, isHistoryAppearance && historyStyles.summary]} numberOfLines={2}>
          {summary}
        </Text>

        {item.resolution?.outcome && (
          <View style={styles.resolutionBadge}>
            <Text style={styles.resolutionBadgeText}>
              {item.resolution.outcome === 'DIRECT_UPDATE'
                ? 'Đã cập nhật địa chỉ'
                : item.resolution.outcome === 'REOPTIMIZED'
                ? 'Đã cập nhật vào tuyến mới'
                : item.resolution.outcome === 'REMOVED_FROM_ROUTES'
                ? 'Đã loại khỏi tuyến (chờ phân tuyến)'
                : item.resolution.outcome}
            </Text>
          </View>
        )}

        <View style={[styles.cardFooter, isHistoryAppearance && historyStyles.footer]}>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={13} color="#94A3B8" />
            <Text style={styles.timeText}>
              {new Date(item.createdAt).toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          <View style={styles.detailLink}>
            <Text style={styles.detailLinkText}>Chi tiết</Text>
            <Ionicons name="chevron-forward" size={14} color="#D97706" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const stateContent = isLoading ? (
    <View style={[styles.centerBox, isHistoryAppearance && historyStyles.state]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, isHistoryAppearance && historyStyles.loadingText]}>Đang tải danh sách yêu cầu...</Text>
    </View>
  ) : error ? (
    <View style={[styles.centerBox, isHistoryAppearance && historyStyles.state]}>
      <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => fetchRequests(page)}>
        <Text style={styles.retryButtonText}>Thử lại</Text>
      </TouchableOpacity>
    </View>
  ) : (
    <View style={[styles.centerBox, isHistoryAppearance && historyStyles.state, isHistoryAppearance && historyStyles.empty]}>
      <View style={isHistoryAppearance ? historyStyles.emptyIcon : undefined}>
        <Ionicons
          name={isAddress ? 'location-outline' : 'document-text-outline'}
          size={isHistoryAppearance ? 40 : 48}
          color={isHistoryAppearance ? '#94A3B8' : '#CBD5E1'}
        />
      </View>
      <Text style={[styles.emptyTitle, isHistoryAppearance && historyStyles.emptyTitle]}>Chưa có yêu cầu nào</Text>
      <Text style={[styles.emptySubtitle, isHistoryAppearance && historyStyles.emptySubtitle,
        isHistoryAppearance && { minHeight: historyStyles.emptySubtitle.lineHeight * 2 * fontScale }]}>{emptyMessage}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={createButtonLabel}
        style={[styles.createFirstButton, isHistoryAppearance && student?.status === 'DISABLED' && historyStyles.disabled]}
        onPress={handleCreateRequest}
        disabled={student?.status === 'DISABLED'}
      >
        <Ionicons name="add-circle-outline" size={18} color="#1E293B" />
        <Text style={styles.createFirstButtonText}>{createButtonLabel}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      {isHistoryAppearance ? (
        <AppHeader title={title} subtitle={student?.fullName} onBack={() => router.back()}
          actions={<HeaderAction icon="add" label={createButtonLabel}
            onPress={handleCreateRequest} disabled={student?.status === 'DISABLED'} />} />
      ) : (
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{title}</Text>
          {student && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {student.fullName}
            </Text>
          )}
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={createButtonLabel}
          style={[
            styles.addButton,
            student?.status === 'DISABLED' && styles.addButtonDisabled,
          ]}
          onPress={handleCreateRequest}
          disabled={student?.status === 'DISABLED'}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#1E293B" />
          <Text style={styles.addButtonText}>Tạo mới</Text>
        </TouchableOpacity>
      </View>
      )}

      {/* Status Filter Tabs */}
      <View style={[styles.filtersSection, isHistoryAppearance && historyStyles.filters]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {(
            [
              { key: 'ALL', label: 'Tất cả' },
              { key: 'PENDING', label: 'Chờ duyệt' },
              { key: 'APPROVED', label: 'Đã duyệt' },
              { key: 'REJECTED', label: 'Đã từ chối' },
              { key: 'CANCELLED', label: 'Đã hủy' },
            ] as const
          ).map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterPill,
                isHistoryAppearance && historyStyles.filterPill,
                statusFilter === filter.key && styles.filterPillActive,
              ]}
              onPress={() => setStatusFilter(filter.key)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  statusFilter === filter.key && styles.filterPillTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Content / Vertical List */}
      {isLoading || error || requests.length === 0 ? (
        isHistoryAppearance ? (
          <ScrollView contentContainerStyle={[historyStyles.content, { paddingBottom: insets.bottom + 24 }]}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchRequests(1, true)} tintColor={colors.primary} />}>
            {stateContent}
          </ScrollView>
        ) : stateContent
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequestItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchRequests(1, true)}
              colors={[colors.primary]}
            />
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={[styles.paginationRow, isHistoryAppearance && historyStyles.pagination]}>
                <TouchableOpacity
                  style={[
                    styles.pageButton,
                    page <= 1 && styles.pageButtonDisabled,
                  ]}
                  disabled={page <= 1}
                  onPress={() => fetchRequests(page - 1)}
                >
                  <Ionicons name="chevron-back" size={16} color="#475569" />
                  <Text style={styles.pageButtonText}>Trước</Text>
                </TouchableOpacity>

                <Text style={styles.pageInfoText}>
                  Trang {page} / {totalPages} ({total} yêu cầu)
                </Text>

                <TouchableOpacity
                  style={[
                    styles.pageButton,
                    page >= totalPages && styles.pageButtonDisabled,
                  ]}
                  disabled={page >= totalPages}
                  onPress={() => fetchRequests(page + 1)}
                >
                  <Text style={styles.pageButtonText}>Sau</Text>
                  <Ionicons name="chevron-forward" size={16} color="#475569" />
                </TouchableOpacity>
              </View>
            ) : undefined
          }
        />
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
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 2,
  },
  addButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  filtersSection: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  filterPillActive: {
    backgroundColor: '#1E293B',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTypeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  approvedBadge: {
    backgroundColor: '#D1FAE5',
  },
  approvedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  rejectedBadge: {
    backgroundColor: '#FEE2E2',
  },
  rejectedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  cancelledBadge: {
    backgroundColor: '#F1F5F9',
  },
  cancelledBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  resolutionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 8,
  },
  resolutionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  summaryText: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
    marginBottom: 10,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
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
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  createFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    gap: 6,
  },
  createFirstButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  pageButtonDisabled: {
    opacity: 0.4,
  },
  pageButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  pageInfoText: {
    fontSize: 12,
    color: '#64748B',
  },
});
