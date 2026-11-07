import { AppHeader } from '@/components/navigation/app-header';
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import {
  mobileApiClient,
  TripIncident,
  TripIncidentStatus,
  TripIncidentType,
} from '@/services/api-client';

const TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Tất cả loại', value: 'ALL' },
  { label: 'Vắng phụ xe', value: 'ATTENDANT_MISSING' },
  { label: 'Vắng tài xế', value: 'DRIVER_MISSING' },
  { label: 'Lệch tuyến', value: 'OFF_ROUTE' },
  { label: 'Trễ đón/trả', value: 'LATE_STOP' },
];

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'Tất cả trạng thái', value: 'ALL' },
  { label: 'Chờ phân công', value: 'WAITING_ASSIGNMENT' },
  { label: 'Chờ xác nhận', value: 'WAITING_CONFIRMATION' },
  { label: 'Đã giải quyết', value: 'RESOLVED' },
  { label: 'Đã xác nhận', value: 'CONFIRMED' },
  { label: 'Đóng tự động', value: 'CLOSED' },
];

export default function IncidentsHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const [incidents, setIncidents] = useState<TripIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await mobileApiClient.getMyIncidents({
        type: selectedType !== 'ALL' ? (selectedType as TripIncidentType) : undefined,
        status: selectedStatus !== 'ALL' ? (selectedStatus as TripIncidentStatus) : undefined,
      });
      setIncidents(res.items || []);
    } catch {
      setIncidents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedType, selectedStatus]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchIncidents();
  };

  const getTypeBadge = (type: TripIncidentType) => {
    switch (type) {
      case 'ATTENDANT_MISSING':
        return { label: 'Vắng phụ xe', bg: '#FEF3C7', text: '#B45309', icon: 'person-outline' };
      case 'DRIVER_MISSING':
        return { label: 'Vắng tài xế', bg: '#FEF3C7', text: '#B45309', icon: 'car-outline' };
      case 'OFF_ROUTE':
        return { label: 'Lệch tuyến', bg: '#FEE2E2', text: '#DC2626', icon: 'git-branch-outline' };
      case 'LATE_STOP':
        return { label: 'Trễ đón/trả', bg: '#FFEDD5', text: '#C2410C', icon: 'time-outline' };
      default:
        return { label: type, bg: '#F1F5F9', text: '#475569', icon: 'alert-circle-outline' };
    }
  };

  const getStatusBadge = (status: TripIncidentStatus) => {
    switch (status) {
      case 'WAITING_ASSIGNMENT':
        return { label: 'Chờ phân công', bg: '#FEF3C7', text: '#B45309' };
      case 'WAITING_CONFIRMATION':
      case 'PENDING_CONFIRMATION':
        return { label: 'Chờ xác nhận', bg: '#EFF6FF', text: '#1D4ED8' };
      case 'RESOLVED':
        return { label: 'Đã giải quyết', bg: '#DCFCE7', text: '#15803D' };
      case 'CONFIRMED':
        return { label: 'Đã xác nhận', bg: '#DCFCE7', text: '#15803D' };
      case 'CLOSED':
      case 'CLOSED_WITHOUT_CONFIRMATION':
        return { label: 'Đóng tự động', bg: '#F1F5F9', text: '#64748B' };
      default:
        return { label: status, bg: '#F1F5F9', text: '#475569' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <AppHeader title="Lịch sử sự cố" onBack={() => router.back()} />

      {/* Filter Horizontal Scroll - Types */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {TYPE_OPTIONS.map((opt) => {
            const active = selectedType === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setSelectedType(opt.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filterScroll, { paddingTop: 6 }]}
        >
          {STATUS_OPTIONS.map((opt) => {
            const active = selectedStatus === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setSelectedStatus(opt.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Đang tải danh sách sự cố...</Text>
          </View>
        ) : incidents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="shield-checkmark-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Chưa có sự cố</Text>
            <Text style={styles.emptySubtitle}>
              Bạn chưa báo cáo sự cố nào hoặc chưa có sự cố được ghi nhận trong danh sách.
            </Text>
          </View>
        ) : (
          incidents.map((incident) => {
            const typeBadge = getTypeBadge(incident.type);
            const statusBadge = getStatusBadge(incident.status);

            return (
              <TouchableOpacity
                key={incident.id}
                style={styles.card}
                onPress={() => router.push(`/incidents/${incident.id}` as any)}
                activeOpacity={0.85}
              >
                {/* Card Header: Type Badge & Status Badge */}
                <View style={styles.cardHeader}>
                  <View style={[styles.badge, { backgroundColor: typeBadge.bg }]}>
                    <Ionicons name={typeBadge.icon as any} size={14} color={typeBadge.text} />
                    <Text style={[styles.badgeText, { color: typeBadge.text }]}>
                      {typeBadge.label}
                    </Text>
                  </View>

                  <View style={[styles.badge, { backgroundColor: statusBadge.bg }]}>
                    <Text style={[styles.badgeText, { color: statusBadge.text }]}>
                      {statusBadge.label}
                    </Text>
                  </View>
                </View>

                {/* Trip info */}
                {incident.trip && (
                  <View style={styles.tripInfoRow}>
                    <Ionicons name="bus-outline" size={16} color="#64748B" />
                    <Text style={styles.tripRouteName} numberOfLines={1}>
                      {incident.trip.routeName}
                    </Text>
                    <View
                      style={[
                        styles.dirBadge,
                        incident.trip.direction === 'TO_SCHOOL'
                          ? styles.dirSchool
                          : styles.dirReturn,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dirText,
                          incident.trip.direction === 'TO_SCHOOL'
                            ? styles.dirTextSchool
                            : styles.dirTextReturn,
                        ]}
                      >
                        {incident.trip.direction === 'TO_SCHOOL' ? 'Chiều đi' : 'Chiều về'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Description */}
                <Text style={styles.descriptionText} numberOfLines={2}>
                  {incident.description}
                </Text>

                {/* Footer: Date & Time */}
                <View style={styles.cardFooter}>
                  <View style={styles.footerTimeRow}>
                    <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
                    <Text style={styles.footerTimeText}>
                      {new Date(incident.createdAt).toLocaleDateString('vi-VN')}
                    </Text>
                    <Text style={styles.footerTimeDot}>•</Text>
                    <Ionicons name="time-outline" size={13} color="#94A3B8" />
                    <Text style={styles.footerTimeText}>
                      {new Date(incident.createdAt).toLocaleTimeString([], {
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
  filterSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#FFCB56',
    borderColor: '#FFCB56',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#1E293B',
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tripInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tripRouteName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  dirBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dirSchool: {
    backgroundColor: '#EFF6FF',
  },
  dirReturn: {
    backgroundColor: '#FFFBEB',
  },
  dirText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dirTextSchool: {
    color: '#2563EB',
  },
  dirTextReturn: {
    color: '#D97706',
  },
  descriptionText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 8,
  },
  footerTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerTimeText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  footerTimeDot: {
    fontSize: 12,
    color: '#CBD5E1',
    marginHorizontal: 2,
  },
  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
});
