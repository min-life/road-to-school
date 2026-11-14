import { ScheduleTripCard } from '@/components/schedule/trip-card';
import { ScheduleWeekSelector } from '@/components/schedule/week-selector';
import { scheduleStyles as styles } from '@/components/schedule/schedule-styles';
import { NotificationBell } from '@/components/notification-bell';
import { getStaffTheme } from '@/constants/theme';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, headerActionStyles } from '@/components/navigation/app-header';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useActiveRefresh } from '@/hooks/use-active-refresh';
import type { RefreshContext } from '@/utils/refresh-loop';
import { useAuth } from '@/context/auth-context';
import { mobileApiClient, MobileScheduleItem } from '@/services/api-client';
import { useQuickLeaveNotice } from '@/hooks/use-quick-leave-notice';
import {
  getVietnamToday,
  getMondayOfDateStr,
  getWeekDaysFromMonday,
  addDaysToDateStr,
} from '@/utils/date';

export default function ScheduleScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { serviceDate } = useLocalSearchParams<{ serviceDate?: string }>();
  const { triggerQuickLeaveNotice, isRequesting } = useQuickLeaveNotice();

  const isDriver = user?.role === 'DRIVER';
  const isAttendant = user?.role === 'BUS_ATTENDANT';
  const staffTheme = getStaffTheme(user?.role);
  const buttons = staffTheme?.buttons;
  const roleTitle = isDriver ? 'Tài xế' : isAttendant ? 'Giáo viên phụ xe' : 'Nhân sự';

  // Current active date (YYYY-MM-DD in Vietnam)
  const [selectedDate, setSelectedDate] = useState<string>(() => getVietnamToday());

  // Base Monday date string (YYYY-MM-DD) for the displayed 7-day week
  const [currentWeekMondayStr, setCurrentWeekMondayStr] = useState<string>(() => {
    return getMondayOfDateStr(getVietnamToday());
  });

  useEffect(() => {
    if (typeof serviceDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) return;
    const parsed = new Date(`${serviceDate}T00:00:00Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== serviceDate) return;
    setSelectedDate(serviceDate);
    setCurrentWeekMondayStr(getMondayOfDateStr(serviceDate));
  }, [serviceDate]);

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
    <View style={styles.container}>
      {/* Header */}
      <AppHeader title="Lịch vận hành" subtitle={`Phân công tuyến xe dành cho ${roleTitle}`} actions={<>
          <TouchableOpacity accessibilityRole="button" onPress={goToToday}
            style={[headerActionStyles.textButton, buttons?.secondary]} activeOpacity={0.7}>
            <Text style={[headerActionStyles.text, buttons?.secondaryText]}>Hôm nay</Text>
          </TouchableOpacity>
          <NotificationBell />
        </>} />

      {/* Week Selector Bar */}
      <ScheduleWeekSelector
        staffTheme={staffTheme}
        weekDays={weekDays}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onPreviousWeek={goToPreviousWeek}
        onNextWeek={goToNextWeek}
      />

      {/* Trip Cards List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={staffTheme?.colors.primary ?? '#D97706'} />
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
          selectedDateTrips.map((trip) => (
            <ScheduleTripCard
              key={trip.id}
              staffTheme={staffTheme}
              trip={trip}
              directionLabel={trip.direction === 'TO_SCHOOL' ? 'Chiều đi' : 'Chiều về'}
              actionLabel="Xem bản đồ"
              onOpen={() => router.push({ pathname: '/trip/[id]', params: { id: trip.id } } as any)}
              canReportLeave={trip.status === 'SCHEDULED'}
              isReportingLeave={isRequesting(trip.id)}
              onReportLeave={() => {
                triggerQuickLeaveNotice({
                  tripId: trip.id,
                  subjectName: user?.fullName || 'Nhân sự',
                  routeName: trip.routeName,
                  serviceDate: trip.serviceDate,
                  direction: trip.direction,
                  onSuccess: () => loadSchedule(),
                });
              }}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
