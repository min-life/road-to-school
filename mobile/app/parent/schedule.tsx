import { AppHeader, headerActionStyles } from '@/components/navigation/app-header';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useActiveRefresh } from '@/hooks/use-active-refresh';
import type { RefreshContext } from '@/utils/refresh-loop';
import { getScheduleStatusLabel } from '@/utils/trip-status-label';
import { useAuth } from '@/context/auth-context';
import { colors } from '@/constants/theme';
import { mobileApiClient, MobileScheduleItem } from '@/services/api-client';
import { useQuickLeaveNotice } from '@/hooks/use-quick-leave-notice';
import {
  getVietnamToday,
  getMondayOfDateStr,
  getWeekDaysFromMonday,
  formatWeekHeaderRange,
  addDaysToDateStr,
} from '@/utils/date';

export default function ParentStudentScheduleScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ studentId: string; studentName?: string }>();
  const studentId = params.studentId;
  const studentName = params.studentName || 'Học sinh';

  const { triggerQuickLeaveNotice, isRequesting } = useQuickLeaveNotice();

  // Selected date (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => getVietnamToday());

  // Base Monday date string (YYYY-MM-DD)
  const [currentWeekMondayStr, setCurrentWeekMondayStr] = useState<string>(() => {
    return getMondayOfDateStr(getVietnamToday());
  });

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trips, setTrips] = useState<MobileScheduleItem[]>([]);

  // 7 days: Monday to Sunday
  const weekDays = useMemo(() => {
    return getWeekDaysFromMonday(currentWeekMondayStr);
  }, [currentWeekMondayStr]);

  const fromDate = weekDays[0]?.dateStr || '';
  const toDate = weekDays[6]?.dateStr || '';

  const fetchSchedule = async ({ isCurrent }: RefreshContext) => {
    if (!studentId || !fromDate || !toDate) return;
    try {
      setError(null);
      const res = await mobileApiClient.getParentStudentSchedule(studentId, { fromDate, toDate });
      if (!isCurrent()) return;
      setTrips(res.items || []);
    } catch (err: any) {
      if (!isCurrent()) return;
      if (err?.statusCode === 403 || err?.statusCode === 404) { setTrips([]); setError(err.message); return false; }
      if (!trips.length) setError(err?.message || 'Không thể tải lịch trình đưa đón của học sinh');
    } finally {
      if (isCurrent()) { setLoading(false); setRefreshing(false); }
    }
  };
  const identity = JSON.stringify([user?.id, user?.role, studentId, fromDate, toDate]);
  useEffect(() => { setTrips([]); setLoading(true); }, [identity]);
  const { refresh: loadSchedule } = useActiveRefresh(identity, fetchSchedule, 12000);

  const onRefresh = () => {
    setRefreshing(true);
    loadSchedule();
  };

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

  const selectedDateTrips = useMemo(() => {
    return trips.filter((t) => t.serviceDate === selectedDate);
  }, [trips, selectedDate]);

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <AppHeader title="Lịch học & Xe đưa đón" onBack={() => router.back()} subtitle={studentName} actions={<TouchableOpacity accessibilityRole="button" onPress={goToToday} style={headerActionStyles.textButton}>
          <Text style={headerActionStyles.text}>Hôm nay</Text>
        </TouchableOpacity>} />

      {/* Week Selector Bar */}
      <View style={styles.weekSelectorContainer}>
        <View style={styles.weekNavRow}>
          <TouchableOpacity onPress={goToPreviousWeek} style={styles.navArrow}>
            <Ionicons name="chevron-back" size={20} color={colors.foreground} />
          </TouchableOpacity>

          <Text style={styles.weekRangeText}>
            {formatWeekHeaderRange(weekDays[0]?.dateStr || '', weekDays[6]?.dateStr || '')}
          </Text>

          <TouchableOpacity onPress={goToNextWeek} style={styles.navArrow}>
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
            <Text style={styles.loadingText}>Đang tải lịch trình đưa đón...</Text>
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
              Học sinh không có chuyến xe đưa đón nào trong ngày này.
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
                {/* Top Row: Time & Direction */}
                <View style={styles.cardHeader}>
                  <View style={styles.timeBadge}>
                    <Ionicons name="time-outline" size={14} color="#1E293B" />
                    <Text style={styles.timeText}>
                      {trip.scheduledStartTime} – {trip.scheduledEndTime}
                    </Text>
                  </View>

                  <View style={styles.headerBadges}>
                    {isToSchool ? (
                      <View style={[styles.badge, styles.badgeToSchool]}>
                        <Text style={styles.badgeTextToSchool}>Chiều đi học</Text>
                      </View>
                    ) : (
                      <View style={[styles.badge, styles.badgeToParking]}>
                        <Text style={styles.badgeTextToParking}>Chiều về nhà</Text>
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

                  <View style={styles.footerActions}>
                    {trip.canReportLeave && !trip.isVirtual && (
                      <TouchableOpacity
                        style={styles.leaveNoticeBtn}
                        disabled={isRequesting(trip.id)}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          triggerQuickLeaveNotice({
                            tripId: trip.id,
                            studentId,
                            subjectName: studentName,
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
                        <Text style={styles.actionText}>Xem lộ trình</Text>
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
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  headerBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    minWidth: 0,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: '100%',
    flexShrink: 1,
  },
  timeText: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#1E293B',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: '100%',
    minWidth: 0,
  },
  badgeToSchool: {
    backgroundColor: '#ECFDF5',
  },
  badgeTextToSchool: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  badgeToParking: {
    backgroundColor: '#F0F9FF',
  },
  badgeTextToParking: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  badgeVirtual: {
    backgroundColor: '#F1F5F9',
  },
  badgeTextVirtual: {
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  badgeActive: {
    backgroundColor: '#EFF6FF',
  },
  badgeTextActive: {
    flexShrink: 1,
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
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    minWidth: 0,
  },
  vehicleText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    color: '#334155',
  },
  actionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginLeft: 'auto',
    minHeight: 48,
    minWidth: 0,
    maxWidth: '100%',
    flexShrink: 1,
  },
  footerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
    width: '100%',
  },
  actionText: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    color: '#2563EB',
  },
  virtualNotice: {
    marginLeft: 'auto',
    maxWidth: '100%',
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 17,
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
    minHeight: 48,
    maxWidth: '100%',
    flexShrink: 1,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  leaveNoticeBtnText: {
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 18,
    fontWeight: '700',
    color: '#D97706',
  },
});
