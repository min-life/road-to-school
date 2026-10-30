import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useActiveRefresh } from '@/hooks/use-active-refresh';
import type { RefreshContext } from '@/utils/refresh-loop';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import { journeyTones } from '@/constants/parent-journey';
import { parentHomeStyles } from '@/components/parent/home-styles';
import { ParentHomeScrollView } from '@/components/parent/home-scroll-view';
import { ParentTripCard } from '@/components/parent/trip-card';
import { ParentStudentJourney } from '@/components/parent/student-journey';
import { useParentJourneyTelemetry } from '@/hooks/use-parent-journey-telemetry';
import { activeJourneyIncident, journeySchoolArrived, journeyServiceDate, parentJourneyCard, studentJourneyBadge } from '@/utils/parent-journey-stage';
import { journeyRecordedClock } from '@/utils/parent-journey';
import { useAuth } from '@/context/auth-context';
import { useQuickLeaveNotice } from '@/hooks/use-quick-leave-notice';
import {
  mobileApiClient,
  MobileHomeTrip,
  ParentHomeCardItem,
} from '@/services/api-client';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const isParent = user?.role === 'PARENT';
  const { triggerQuickLeaveNotice, isRequesting } = useQuickLeaveNotice();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Driver & Attendant state
  const [hasHomeTrip, setHasHomeTrip] = useState(false);
  const [homeTrip, setHomeTrip] = useState<MobileHomeTrip | null>(null);

  // Parent state
  const [parentCards, setParentCards] = useState<ParentHomeCardItem[]>([]);

  const fetchHomeData = async ({ isCurrent }: RefreshContext) => {
    if (!user) return;
    try {
      setError(null);
      if (user.role === 'DRIVER' || user.role === 'BUS_ATTENDANT') {
        const res = await mobileApiClient.getHomeTrip();
        if (!isCurrent()) return;
        setHasHomeTrip(res.hasTrip);
        setHomeTrip(res.trip || null);
      } else if (user.role === 'PARENT') {
        const res = await mobileApiClient.getParentHomeCards();
        if (!isCurrent()) return;
        setParentCards(res.items || []);
      }
    } catch (err: any) {
      if (!isCurrent()) return;
      if (err?.statusCode === 403 || err?.statusCode === 404) {
        setHomeTrip(null); setHasHomeTrip(false); setParentCards([]);
        setError(err.message); return false;
      }
      if (!homeTrip && !parentCards.length) setError(err?.message || 'Không thể tải dữ liệu trang chủ');
    } finally {
      if (isCurrent()) { setLoading(false); setRefreshing(false); }
    }
  };
  const identity = JSON.stringify([user?.id, user?.role]);
  const journeyTelemetry = useParentJourneyTelemetry(identity, isParent ? parentCards : []);
  useEffect(() => { setHomeTrip(null); setParentCards([]); setHasHomeTrip(false); setLoading(true); }, [identity]);
  const { refresh: loadHomeData } = useActiveRefresh(identity, fetchHomeData, 8000);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadHomeData();
  }, [loadHomeData]);

  const getRoleLabel = () => {
    switch (user?.role) {
      case 'DRIVER':
        return 'Tài xế';
      case 'BUS_ATTENDANT':
        return 'Giáo viên giám sát';
      case 'PARENT':
        return 'Phụ huynh học sinh';
      default:
        return 'Quản trị viên';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return { label: 'Đang di chuyển', bg: '#DCFCE7', text: '#15803D' };
      case 'SCHEDULED':
        return { label: 'Chờ khởi hành', bg: '#FEF3C7', text: '#B45309' };
      case 'COMPLETED':
        return { label: 'Đã hoàn thành', bg: '#E0E7FF', text: '#4338CA' };
      default:
        return { label: status, bg: '#F1F5F9', text: '#475569' };
    }
  };

  const getAttendanceBadge = (status: string, isAlighted?: boolean) => {
    switch (status) {
      case 'PRESENT':
        if (isAlighted) {
          return { label: 'Đã xuống xe an toàn', bg: '#DCFCE7', text: '#15803D', icon: 'checkmark-done-circle' };
        }
        return { label: 'Đã lên xe', bg: '#DCFCE7', text: '#15803D', icon: 'checkmark-circle' };
      case 'ABSENT':
        return { label: 'Vắng mặt', bg: '#FEE2E2', text: '#B91C1C', icon: 'close-circle' };
      case 'UNMARKED':
      default:
        return { label: 'Chưa điểm danh', bg: '#FEF3C7', text: '#B45309', icon: 'time-outline' };
    }
  };

  const HomeScrollView = isParent ? ParentHomeScrollView : ScrollView;
  const serviceDates = [...new Set(parentCards.map(card => card.serviceDate))];
  return (
    <HomeScrollView
      {...(isParent ? { fullName: user?.fullName, avatarUrl: user?.avatarUrl,
        onOpenLeave: () => router.push('/leave-notices' as any),
        onChangeStop: () => router.push('/parent/change-stop') } : {})}
      style={[styles.container, isParent && parentHomeStyles.container]}
      contentContainerStyle={[styles.content, isParent && parentHomeStyles.content]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Tiện ích Card (Wireframe 6.1) */}
      {!isParent && <View style={[styles.utilityCard, isParent && parentHomeStyles.utilityCard]}>
        <View style={[styles.utilityHeader, isParent && parentHomeStyles.utilityHeader]}>
          <Text style={[styles.utilityCardTitle, isParent && parentHomeStyles.utilityCardTitle]}>Tiện ích</Text>
          <TouchableOpacity
            accessibilityRole={isParent ? "button" : undefined}
            accessibilityLabel={isParent ? "Làm mới trang chủ" : undefined}
            style={[styles.refreshIconBtn, isParent && parentHomeStyles.refreshIconBtn]}
            onPress={onRefresh}
            hitSlop={isParent ? undefined : { top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="refresh" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={[styles.utilityCenter, isParent && parentHomeStyles.utilityCenter]}>
          <TouchableOpacity
            style={[styles.utilityActionBtn, isParent && parentHomeStyles.utilityActionBtn]}
            accessibilityRole={isParent ? 'button' : undefined}
            accessibilityLabel={isParent ? 'Báo nghỉ' : undefined}
            onPress={() => router.push('/leave-notices' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.utilityIconWrap, isParent && parentHomeStyles.utilityIconWrap]}>
              <Ionicons name="calendar-outline" size={24} color="#1E293B" />
            </View>
            <Text style={[styles.utilityActionText, isParent && parentHomeStyles.utilityActionText]}>Báo nghỉ</Text>
          </TouchableOpacity>

          {(user?.role === 'DRIVER' || user?.role === 'BUS_ATTENDANT') && (
            <TouchableOpacity
              style={[styles.utilityActionBtn, isParent && parentHomeStyles.utilityActionBtn]}
              onPress={() => router.push('/incidents' as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.utilityIconWrap, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="warning-outline" size={24} color="#DC2626" />
              </View>
              <Text style={[styles.utilityActionText, isParent && parentHomeStyles.utilityActionText]}>Sự cố</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>}

      {/* Main Content Area */}
      {loading ? (
        <View style={[styles.loadingContainer, isParent && parentHomeStyles.loadingContainer]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, isParent && parentHomeStyles.loadingText]}>Đang cập nhật chuyến xe...</Text>
        </View>
      ) : error ? (
        <View style={[styles.emptyContainer, isParent && parentHomeStyles.emptyContainer]}>
          <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
          <Text style={[styles.emptyTitle, isParent && parentHomeStyles.emptyTitle]}>Lỗi kết nối</Text>
          <Text style={[styles.emptySubtitle, isParent && parentHomeStyles.emptySubtitle]}>{error}</Text>
          <TouchableOpacity accessibilityRole={isParent ? 'button' : undefined} style={[styles.actionBtn, isParent && parentHomeStyles.actionBtn]} onPress={loadHomeData}>
            <Text style={[styles.actionBtnText, isParent && parentHomeStyles.actionBtnText]}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (user?.role === 'DRIVER' || user?.role === 'BUS_ATTENDANT') ? (
        /* ================= DRIVER & ATTENDANT HOME (D06: Single Trip) ================= */
        hasHomeTrip && homeTrip ? (
          <View style={styles.tripCard}>
            {/* Header: Direction & Status */}
            <View style={styles.tripCardHeader}>
              <View
                style={[
                  styles.directionPill,
                  homeTrip.direction === 'TO_SCHOOL' ? styles.dirSchool : styles.dirReturn,
                ]}
              >
                <Ionicons
                  name={homeTrip.direction === 'TO_SCHOOL' ? 'arrow-forward' : 'arrow-back'}
                  size={14}
                  color={homeTrip.direction === 'TO_SCHOOL' ? '#2563EB' : '#D97706'}
                />
                <Text
                  style={[
                    styles.directionPillText,
                    homeTrip.direction === 'TO_SCHOOL' ? styles.dirTextSchool : styles.dirTextReturn,
                  ]}
                >
                  {homeTrip.direction === 'TO_SCHOOL' ? 'Chiều đi (Đến trường)' : 'Chiều về (Về trạm)'}
                </Text>
              </View>

              <View
                style={[
                  styles.statusPill,
                  homeTrip.assignmentStatus === 'WAITING_ASSIGNMENT'
                    ? { backgroundColor: '#FEF3C7' }
                    : { backgroundColor: getStatusBadge(homeTrip.status).bg },
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    homeTrip.assignmentStatus === 'WAITING_ASSIGNMENT'
                      ? { color: '#B45309' }
                      : { color: getStatusBadge(homeTrip.status).text },
                  ]}
                >
                  {homeTrip.assignmentStatus === 'WAITING_ASSIGNMENT'
                    ? 'Chờ phân công'
                    : getStatusBadge(homeTrip.status).label}
                </Text>
              </View>
            </View>

            {/* Route Name & School */}
            <Text style={styles.tripRouteName}>{homeTrip.routeName}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="school-outline" size={15} color="#64748B" />
              <Text style={styles.metaText}>{homeTrip.schoolName}</Text>
            </View>

            {/* Scheduled Time & Service Date */}
            <View style={styles.timeBadgeContainer}>
              <View style={styles.timeBadge}>
                <Ionicons name="time-outline" size={15} color="#1E293B" />
                <Text style={styles.timeBadgeText}>{homeTrip.scheduledTime}</Text>
              </View>
              <Text style={styles.dateText}>{homeTrip.serviceDate}</Text>
            </View>

            {/* Info Grid */}
            <View style={styles.infoGrid}>
              <View style={styles.infoCol}>
                <View style={styles.infoColHeader}>
                  <Ionicons name="bus-outline" size={16} color="#475569" />
                  <Text style={styles.infoColTitle}>Xe đưa đón</Text>
                </View>
                <Text style={styles.infoColMain}>{homeTrip.vehiclePlate}</Text>
                <Text style={styles.infoColSub}>
                  {homeTrip.vehicleSeats} chỗ • {homeTrip.studentCount} HS
                </Text>
              </View>

              <View style={styles.infoColDivider} />

              <View style={styles.infoCol}>
                <View style={styles.infoColHeader}>
                  <Ionicons name="people-outline" size={16} color="#475569" />
                  <Text style={styles.infoColTitle}>Nhân sự phụ trách</Text>
                </View>
                <Text style={styles.infoColMain} numberOfLines={1}>
                  TX: {homeTrip.driver.fullName}
                  {homeTrip.driver.isCurrentUser ? ' (Bạn)' : ''}
                </Text>
                <Text style={styles.infoColSub} numberOfLines={1}>
                  GV: {homeTrip.busAttendant.fullName}
                  {homeTrip.busAttendant.isCurrentUser ? ' (Bạn)' : ''}
                </Text>
              </View>
            </View>

            {/* Operational Highlight */}
            {homeTrip.status === 'SCHEDULED' ? (
              <View
                style={[
                  styles.opsHighlight,
                  homeTrip.operationalState.isAttendantReady
                    ? styles.opsHighlightSuccess
                    : styles.opsHighlightPending,
                ]}
              >
                <Ionicons
                  name={
                    homeTrip.operationalState.isAttendantReady
                      ? 'checkmark-circle-outline'
                      : 'alert-circle-outline'
                  }
                  size={18}
                  color={homeTrip.operationalState.isAttendantReady ? '#15803D' : '#B45309'}
                />
                <Text
                  style={[
                    styles.opsHighlightText,
                    {
                      color: homeTrip.operationalState.isAttendantReady ? '#15803D' : '#B45309',
                    },
                  ]}
                >
                  {homeTrip.operationalState.isAttendantReady
                    ? 'Giáo viên đã xác nhận sẵn sàng khởi hành'
                    : user?.role === 'BUS_ATTENDANT'
                    ? 'Vui lòng xác nhận sẵn sàng trước khi xe chạy'
                    : 'Chờ giáo viên giám sát xác nhận sẵn sàng'}
                </Text>
              </View>
            ) : homeTrip.status === 'IN_PROGRESS' ? (
              <View style={[styles.opsHighlight, styles.opsHighlightProgress]}>
                <Ionicons name="radio-button-on" size={18} color="#2563EB" />
                <Text style={[styles.opsHighlightText, { color: '#1E40AF' }]}>
                  Điểm danh: {homeTrip.operationalState.markedCount}/
                  {homeTrip.operationalState.totalStudents} học sinh (
                  {homeTrip.operationalState.presentCount} có mặt,{' '}
                  {homeTrip.operationalState.absentCount} vắng)
                </Text>
              </View>
            ) : null}

            {/* View Detail Action Button & Báo nghỉ Button */}
            <View style={{ gap: 8 }}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.push(`/trip/${homeTrip.id}` as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Xem chi tiết & Vận hành</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>

              {homeTrip.canReportLeave && (
                <TouchableOpacity
                  style={styles.leaveNoticeCardBtn}
                  disabled={isRequesting(homeTrip.id)}
                  onPress={() =>
                    triggerQuickLeaveNotice({
                      tripId: homeTrip.id,
                      subjectName: user?.fullName || 'Nhân sự',
                      routeName: homeTrip.routeName,
                      serviceDate: homeTrip.serviceDate,
                      direction: homeTrip.direction,
                      onSuccess: () => loadHomeData(),
                    })
                  }
                  activeOpacity={0.8}
                >
                  {isRequesting(homeTrip.id) ? (
                    <ActivityIndicator size="small" color="#D97706" />
                  ) : (
                    <>
                      <Ionicons name="calendar-outline" size={16} color="#D97706" />
                      <Text style={styles.leaveNoticeCardBtnText}>Báo nghỉ chuyến này</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="bus-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Không có chuyến xe cần vận hành</Text>
            <Text style={styles.emptySubtitle}>
              Hiện không có chuyến xe nào trong khung giờ hoạt động hoặc chuyến xe hôm nay đã hoàn thành.
            </Text>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push('/(tabs)/schedule' as any)}
            >
              <Ionicons name="calendar-outline" size={16} color="#1E293B" />
              <Text style={styles.secondaryBtnText}>Xem toàn bộ lịch trình</Text>
            </TouchableOpacity>
          </View>
        )
      ) : user?.role === 'PARENT' ? (
        /* ================= PARENT HOME (D05, D06, D10) ================= */
        parentCards.length > 0 ? (
          <View style={parentHomeStyles.parentCardList}>
            <View style={parentHomeStyles.sectionHeader}>
              <Text accessibilityRole="header" style={parentHomeStyles.sectionTitle}>Chuyến xe của con</Text>
              <Text style={parentHomeStyles.sectionDate}>{serviceDates.map(journeyServiceDate).join(' · ')}</Text>
            </View>
            {parentCards.map((card) => {
              const tripTelemetry = journeyTelemetry.trips[card.tripId];
              const student = parentJourneyCard(card, tripTelemetry?.unavailable || tripTelemetry?.operationUnavailable ? undefined : tripTelemetry?.operation);
              const schoolArrived = card.direction === 'TO_SCHOOL' && journeySchoolArrived(tripTelemetry?.operation, card.tripId);
              const studentStatus = studentJourneyBadge(student.attendanceStatus, Boolean(student.childIsAlighted), schoolArrived, Boolean(card.hasLeaveNotice), card.direction);
              const att = getAttendanceBadge(student.attendanceStatus, student.childIsAlighted);
              return (
                <ParentTripCard
                  key={`${card.studentId}:${card.tripId}`}
                  studentName={card.studentName}
                  avatarUrl={card.studentAvatar}
                  schoolName={card.schoolName}
                  status={student.tripStatus === 'CANCELLED' ? { label: 'Đã hủy', bg: journeyTones.danger.bg, text: journeyTones.danger.text } : getStatusBadge(student.tripStatus)}
                  studentStatus={studentStatus}
                  hasIncident={tripTelemetry?.incidents?.some(i => activeJourneyIncident(i.status))}
                  attention={student.attendanceStatus === 'UNMARKED' && student.tripStatus !== 'CANCELLED' && student.tripStatus !== 'COMPLETED'}
                  stale={tripTelemetry?.operationUnavailable || tripTelemetry?.incidentsUnavailable}
                  journey={active => <ParentStudentJourney card={student} telemetry={tripTelemetry} active={active && journeyTelemetry.active} showServiceDate={serviceDates.length > 1} />}
                >
                  {/* Attendance details; the status badge stays in the card header. */}
                  {(student.markedAt || (student.attendanceStatus === 'PRESENT' && student.childIsAlighted && student.childAlightedAt)
                    || (student.attendanceStatus === 'ABSENT' && student.absenceReason)) ? (
                    <View style={[parentHomeStyles.attendanceBox, { backgroundColor: att.bg }]}>
                      {student.markedAt ? (
                        <Text style={[parentHomeStyles.markedAtText, { color: att.text }]}>
                          Điểm danh{' '}
                          {journeyRecordedClock(student.markedAt) ?? '—:—'}
                        </Text>
                      ) : null}
                      {student.attendanceStatus === 'PRESENT' && student.childIsAlighted && student.childAlightedAt ? (
                        <Text style={[parentHomeStyles.markedAtText, { color: att.text }]}>
                          Xuống xe{' '}
                          {journeyRecordedClock(student.childAlightedAt) ?? '—:—'}
                        </Text>
                      ) : null}

                      {student.attendanceStatus === 'ABSENT' && student.absenceReason ? (
                        <View style={parentHomeStyles.absenceReasonBox}>
                          <Text style={parentHomeStyles.absenceReasonLabel}>Lý do vắng:</Text>
                          <Text style={parentHomeStyles.absenceReasonContent}>{student.absenceReason}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Vehicle & Driver */}
                  <View style={parentHomeStyles.parentDriverRow}>
                    <View style={parentHomeStyles.vehicleDetailRow}>
                      <Ionicons name="bus-outline" size={18} color={colors.navigationActive} accessible={false} />
                      <Text style={parentHomeStyles.vehicleDetailText}>Biển số: <Text style={{ fontWeight: '700' }}>{card.vehiclePlate}</Text></Text>
                    </View>
                    <View style={parentHomeStyles.vehicleDetailRow}>
                      <Ionicons name="person-outline" size={18} color={colors.navigationActive} accessible={false} />
                      <Text style={parentHomeStyles.vehicleDetailText}>Tài xế: <Text style={{ fontWeight: '600' }}>{card.driverName}</Text></Text>
                    </View>
                  </View>

                  {/* Action & Báo nghỉ Button */}
                  <View style={{ gap: 8 }}>
                    <TouchableOpacity
                      style={parentHomeStyles.primaryBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Theo dõi lộ trình của ${card.studentName}`}
                      onPress={() => router.push(`/trip/${card.tripId}` as any)}
                      activeOpacity={0.85}
                    >
                      <Text style={parentHomeStyles.primaryBtnText}>Theo dõi lộ trình</Text>
                      <Ionicons name="navigate-outline" size={16} color={colors.foreground} />
                    </TouchableOpacity>

                    {card.canReportLeave && (
                      <TouchableOpacity
                        style={[parentHomeStyles.leaveNoticeCardBtn, isRequesting(card.tripId) && parentHomeStyles.disabled]}
                        accessibilityRole="button"
                        accessibilityLabel={`Báo nghỉ chuyến này cho ${card.studentName}`}
                        disabled={isRequesting(card.tripId)}
                        onPress={() =>
                          triggerQuickLeaveNotice({
                            tripId: card.tripId,
                            studentId: card.studentId,
                            subjectName: card.studentName,
                            routeName: card.routeName,
                            serviceDate: card.serviceDate,
                            direction: card.direction,
                            onSuccess: () => loadHomeData(),
                          })
                        }
                        activeOpacity={0.8}
                      >
                        {isRequesting(card.tripId) ? (
                          <ActivityIndicator size="small" color={colors.navigationActive} />
                        ) : (
                          <>
                            <Ionicons name="calendar-outline" size={16} color={colors.navigationActive} />
                            <Text style={parentHomeStyles.leaveNoticeCardBtnText}>Báo nghỉ chuyến này</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </ParentTripCard>
              );
            })}
          </View>
        ) : (
          <View style={parentHomeStyles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color="#94A3B8" />
            <Text style={parentHomeStyles.emptyTitle}>Chưa có chuyến xe cho con</Text>
            <Text style={parentHomeStyles.emptySubtitle}>
              Hiện không có lịch đưa đón nào trong khung giờ hôm nay cho học sinh của bạn.
            </Text>
            <TouchableOpacity
              style={parentHomeStyles.secondaryBtn}
              accessibilityRole="button"
              accessibilityLabel="Xem lịch tuần của con"
              onPress={() => router.push('/(tabs)/schedule' as any)}
            >
              <Ionicons name="calendar-outline" size={16} color="#1E293B" />
              <Text style={parentHomeStyles.secondaryBtnText}>Xem lịch tuần của con</Text>
            </TouchableOpacity>
          </View>
        )
      ) : (
        /* Fallback for other roles */
        <View style={styles.emptyContainer}>
          <Ionicons name="shield-checkmark-outline" size={48} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Tài khoản quản trị</Text>
          <Text style={styles.emptySubtitle}>
            Vui lòng đăng nhập trên giao diện Web Dashboard để sử dụng đầy đủ các công cụ quản lý.
          </Text>
        </View>
      )}
    </HomeScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  refreshIconBtn: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  loadingContainer: {
    padding: 32,
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
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 6,
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
    gap: 12,
  },
  tripCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  directionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dirSchool: {
    backgroundColor: '#EFF6FF',
  },
  dirReturn: {
    backgroundColor: '#FFFBEB',
  },
  directionPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dirTextSchool: {
    color: '#2563EB',
  },
  dirTextReturn: {
    color: '#D97706',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tripRouteName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#64748B',
  },
  timeBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  timeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  dateText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  infoGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoCol: {
    flex: 1,
    gap: 3,
  },
  infoColDivider: {
    width: 1,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 10,
  },
  infoColHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  infoColTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  infoColMain: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  infoColSub: {
    fontSize: 11,
    color: '#64748B',
  },
  opsHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
  },
  opsHighlightSuccess: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  opsHighlightPending: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  opsHighlightProgress: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  opsHighlightText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    paddingVertical: 13,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  actionBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  utilityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  utilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  utilityCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  utilityCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 8,
  },
  utilityActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  utilityIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFCB56',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  utilityActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  leaveNoticeCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFDF6',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 12,
    paddingVertical: 10,
  },
  leaveNoticeCardBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
});
