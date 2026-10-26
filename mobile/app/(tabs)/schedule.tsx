import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useActiveRefresh } from '@/hooks/use-active-refresh';
import type { RefreshContext } from '@/utils/refresh-loop';
import { getScheduleStatusLabel } from '@/utils/trip-status-label';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { mobileApiClient, MobileScheduleItem } from '@/services/api-client';
import { useQuickLeaveNotice } from '@/hooks/use-quick-leave-notice';
import {
  getVietnamToday,
  getMondayOfDateStr,
  getWeekDaysFromMonday,
  formatWeekHeaderRange,
  addDaysToDateStr,
} from '@/utils/date';

export default function ScheduleScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { triggerQuickLeaveNotice, isRequesting } = useQuickLeaveNotice();

  const isDriver = user?.role === 'DRIVER';
  const isAttendant = user?.role === 'BUS_ATTENDANT';
  const roleTitle = isDriver ? 'Tài xế' : isAttendant ? 'Giáo viên phụ xe' : 'Nhân sự';

  // Current active date (YYYY-MM-DD in Vietnam)
  const [selectedDate, setSelectedDate] = useState<string>(() => getVietnamToday());

  // Base Monday date string (YYYY-MM-DD) for the displayed 7-day week
  const [currentWeekMondayStr, setCurrentWeekMondayStr] = useState<string>(() => {
    return getMondayOfDateStr(getVietnamToday());
  });

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trips, setTrips] = useState<MobileScheduleItem[]>([]);

  // Compute 7 days: Monday to Sunday
  const weekDays = useMemo(() => {
    return getWeekDaysFromMonday(currentWeekMondayStr);
  }, [currentWeekMondayStr]);

  // fromDate and toDate for API (Monday to Sunday)
  const fromDate = weekDays[0]?.dateStr || '';
  const toDate = weekDays[6]?.dateStr || '';

  const fetchSchedule = async ({ isCurrent }: RefreshContext) => {
    if (!fromDate || !toDate) return;
    try {
      setError(null);
      let res;
      if (isDriver) {
        res = await mobileApiClient.getDriverSchedule({ fromDate, toDate });
      } else if (isAttendant) {
        res = await mobileApiClient.getBusAttendantSchedule({ fromDate, toDate });
      } else {
        setTrips([]);
        return;
      }
      if (!isCurrent()) return;
      setTrips(res.items || []);
    } catch (err: any) {
      if (!isCurrent()) return;
      if (err?.statusCode === 403 || err?.statusCode === 404) { setTrips([]); setError(err.message); return false; }
      if (!trips.length) setError(err?.message || 'Không thể tải lịch trình vận hành');
    } finally {
      if (isCurrent()) { setLoading(false); setRefreshing(false); }
    }
  };
  const identity = JSON.stringify([user?.id, user?.role, fromDate, toDate]);
  useEffect(() => { setTrips([]); setLoading(true); }, [identity]);
  const { refresh: loadSchedule } = useActiveRefresh(identity, fetchSchedule, 12000);

  const onRefresh = () => {
    setRefreshing(true);
    loadSchedule();
  };

  // Week navigation
  const goToPreviousWeek = () => {
    const prevMonday = addDaysToDateStr(currentWeekMondayStr, -7);
    setCurrentWeekMondayStr(prevMonday);
    setSelectedDate(prevMonday);
  };

  const goToNextWeek = () => {
    const nextMonday = addDaysToDateStr(currentWeekMondayStr, 7);
    setCurrentWeekMondayStr(nextMonday);
    setSelectedDate(nextMonday);
  };

  const goToToday = () => {
    const today = getVietnamToday();
    const monday = getMondayOfDateStr(today);
    setCurrentWeekMondayStr(monday);
    setSelectedDate(today);
  };

  // Filter trips for selected date
  const selectedDateTrips = useMemo(() => {
    return trips.filter((t) => t.serviceDate === selectedDate);
  }, [trips, selectedDate]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Lịch vận hành</Text>
          <Text style={styles.subtitle}>Phân công tuyến xe dành cho {roleTitle}</Text>
        </View>

        <TouchableOpacity onPress={goToToday} style={styles.todayButton} activeOpacity={0.7}>
          <Text style={styles.todayText}>Hôm nay</Text>
        </TouchableOpacity>
      </View>

      {/* Week Selector Bar */}
      <View style={styles.weekSelectorContainer}>
        <View style={styles.weekNavRow}>
          <TouchableOpacity onPress={goToPreviousWeek} style={styles.navArrow} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={20} color={colors.foreground} />
          </TouchableOpacity>

          <Text style={styles.weekRangeText}>
            {formatWeekHeaderRange(weekDays[0]?.dateStr || '', weekDays[6]?.dateStr || '')}
          </Text>

          <TouchableOpacity onPress={goToNextWeek} style={styles.navArrow} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-forward" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* 7 Days Bar */}
        <View style={styles.daysRow}>
          {weekDays.map((d) => {
            const isSelected = d.dateStr === selectedDate;
            return (
              <TouchableOpacity
                key={d.dateStr}
                onPress={() => setSelectedDate(d.dateStr)}
                style={[
                  styles.dayCard,
                  isSelected && styles.dayCardSelected,
                  d.isToday && !isSelected && styles.dayCardToday,
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayLabel, isSelected && styles.dayTextSelected]}>
                  {d.dayLabel}
                </Text>
                <Text style={[styles.dayNum, isSelected && styles.dayTextSelected]}>
                  {d.dateNum}
                </Text>
                {d.isToday && <View style={[styles.todayDot, isSelected && styles.todayDotSelected]} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Trip Cards List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#D97706" />
            <Text style={styles.loadingText}>Đang tải lịch trình...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
            <Text style={styles.emptyTitle}>Lỗi tải dữ liệu</Text>
            <Text style={styles.emptySubtitle}>{error}</Text>
          </View>
        ) : selectedDateTrips.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Không có chuyến xe</Text>
            <Text style={styles.emptySubtitle}>
              Bạn không có phân công chuyến xe nào trong ngày này.
            </Text>
          </View>
        ) : (
          selectedDateTrips.map((trip) => {
            const isToSchool = trip.direction === 'TO_SCHOOL';
            const isClickable = !trip.isVirtual;

            return (
              <TouchableOpacity
                key={trip.id}
                disabled={!isClickable}
                onPress={() => {
                  if (isClickable) {
                    router.push({ pathname: '/trip/[id]', params: { id: trip.id } } as any);
                  }
                }}
                style={[
                  styles.tripCard,
                  trip.isVirtual && styles.tripCardVirtual,
                ]}
                activeOpacity={0.8}
              >
                {/* Card Top Row: Time & Direction */}
                <View style={styles.cardHeader}>
                  <View style={styles.timeBadge}>
                    <Ionicons name="time-outline" size={14} color="#1E293B" />
                    <Text style={styles.timeText}>
                      {trip.scheduledStartTime} – {trip.scheduledEndTime}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {isToSchool ? (
                      <View style={[styles.badge, styles.badgeToSchool]}>
                        <Text style={styles.badgeTextToSchool}>Chiều đi</Text>
                      </View>
                    ) : (
                      <View style={[styles.badge, styles.badgeToParking]}>
                        <Text style={styles.badgeTextToParking}>Chiều về</Text>
                      </View>
                    )}

                    {trip.isVirtual ? (
                      <View style={[styles.badge, styles.badgeVirtual]}>
                        <Text style={styles.badgeTextVirtual}>{getScheduleStatusLabel(trip.status, trip.isVirtual)}</Text>
                      </View>
                    ) : (
                      <View style={[styles.badge, styles.badgeActive]}>
                        <Text style={styles.badgeTextActive}>{getScheduleStatusLabel(trip.status, trip.isVirtual)}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Route Name & School */}
                <Text style={styles.routeName}>{trip.routeName}</Text>
                <Text style={styles.schoolName}>{trip.schoolName}</Text>

                {/* Footer: Vehicle Plate & Action */}
                <View style={styles.cardFooter}>
                  <View style={styles.vehicleInfo}>
                    <Ionicons name="bus-outline" size={16} color="#475569" />
                    <Text style={styles.vehicleText}>
                      {trip.vehiclePlate || 'Chưa gán xe'}
                      {trip.vehicleBrand ? ` (${trip.vehicleBrand})` : ''}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {trip.canReportLeave && !trip.isVirtual && (
                      <TouchableOpacity
                        style={styles.leaveNoticeBtn}
                        disabled={isRequesting(trip.id)}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          triggerQuickLeaveNotice({
                            tripId: trip.id,
                            subjectName: user?.fullName || 'Nhân sự',
                            routeName: trip.routeName,
                            serviceDate: trip.serviceDate,
                            direction: trip.direction,
                            onSuccess: () => loadSchedule(),
                          });
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        {isRequesting(trip.id) ? (
                          <ActivityIndicator size="small" color="#D97706" />
                        ) : (
                          <>
                            <Ionicons name="calendar-outline" size={13} color="#D97706" />
                            <Text style={styles.leaveNoticeBtnText}>Báo nghỉ</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {isClickable ? (
                      <View style={styles.actionLink}>
                        <Text style={styles.actionText}>Xem bản đồ</Text>
                        <Ionicons name="chevron-forward" size={14} color="#2563EB" />
                      </View>
                    ) : (
                      <Text style={styles.virtualNotice}>Chưa tạo chuyến</Text>
                    )}
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  todayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  weekSelectorContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  weekNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navArrow: {
    padding: 4,
  },
  weekRangeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    marginHorizontal: 2,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dayCardSelected: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  dayCardToday: {
    borderColor: '#F59E0B',
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  dayNum: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F59E0B',
    marginTop: 4,
  },
  todayDotSelected: {
    backgroundColor: '#FDE68A',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tripCardVirtual: {
    borderStyle: 'dashed',
    backgroundColor: '#FBFDFF',
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#1E293B',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 4,
  },
  badgeToSchool: {
    backgroundColor: '#ECFDF5',
  },
  badgeTextToSchool: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  badgeToParking: {
    backgroundColor: '#F0F9FF',
  },
  badgeTextToParking: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  badgeVirtual: {
    backgroundColor: '#F1F5F9',
  },
  badgeTextVirtual: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  badgeActive: {
    backgroundColor: '#EFF6FF',
  },
  badgeTextActive: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  routeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  schoolName: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vehicleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  actionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  virtualNotice: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  centerContainer: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
    lineHeight: 18,
  },
  leaveNoticeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  leaveNoticeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
});
