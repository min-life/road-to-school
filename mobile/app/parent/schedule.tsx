import { ScheduleTripCard } from '@/components/schedule/trip-card';
import { ScheduleWeekSelector } from '@/components/schedule/week-selector';
import { scheduleStyles as styles } from '@/components/schedule/schedule-styles';
import { AppHeader, headerActionStyles } from '@/components/navigation/app-header';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useActiveRefresh } from '@/hooks/use-active-refresh';
import type { RefreshContext } from '@/utils/refresh-loop';
import { useAuth } from '@/context/auth-context';
import { mobileApiClient, MobileScheduleItem } from '@/services/api-client';
import { useQuickLeaveNotice } from '@/hooks/use-quick-leave-notice';
import { ScheduleArrivalTime } from '@/components/parent/schedule-arrival-time';
import {
  getVietnamToday,
  getMondayOfDateStr,
  getWeekDaysFromMonday,
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
      <ScheduleWeekSelector
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
          selectedDateTrips.map((trip) => (
            <ScheduleTripCard
              key={trip.id}
              trip={trip}
              directionLabel={trip.direction === 'TO_SCHOOL' ? 'Chiều đi học' : 'Chiều về nhà'}
              actionLabel="Xem lộ trình"
              onOpen={() => router.push({ pathname: '/trip/[id]', params: { id: trip.id } } as any)}
              isReportingLeave={isRequesting(trip.id)}
              onReportLeave={() => {
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
            >
              <ScheduleArrivalTime trip={trip} studentId={studentId} identity={identity} />
            </ScheduleTripCard>
          ))
        )}
      </ScrollView>
    </View>
  );
}
