import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { MobileHomeTrip, Role } from '@/services/api-client';
import { parentHomeStyles } from '@/components/parent/home-styles';
import { ParentTripCard } from '@/components/parent/trip-card';
import { attendantTheme, colors, getStaffTheme } from '@/constants/theme';
import { journeyTones } from '@/constants/parent-journey';

interface StaffTripCardProps {
  role?: Role;
  trip: MobileHomeTrip;
  onViewDetail: () => void;
  onReportLeave: () => void;
  isReportingLeave?: boolean;
  canReportLeave?: boolean;
  getStatusBadge: (status: string) => { label: string; bg: string; text: string };
}

export function StaffTripCard({
  role, trip, onViewDetail, onReportLeave, isReportingLeave, canReportLeave, getStatusBadge,
}: StaffTripCardProps) {
  const isAttendant = role === 'BUS_ATTENDANT';
  const staffTheme = getStaffTheme(role);
  const buttons = staffTheme?.buttons;
  const accent = staffTheme?.colors.primary ?? colors.navigationActive;
  const attendanceColor = isAttendant ? accent : journeyTones.info.text;
  const presentColor = isAttendant ? journeyTones.success.text : colors.mutedText;
  const headingStyle = isAttendant && styles.attendantHeading;
  const statusBadge = trip.assignmentStatus === 'WAITING_ASSIGNMENT'
    ? { label: 'Chờ phân công', bg: journeyTones.warning.bg, text: journeyTones.warning.text }
    : getStatusBadge(trip.status);
  const primaryBtnLabel = isAttendant
    ? 'Xem chi tiết & Điểm danh'
    : 'Xem chi tiết & Vận hành';

  return (
    <ParentTripCard
      key={trip.id}
      studentName={trip.routeName}
      schoolName={trip.schoolName}
      status={statusBadge}
      staffTheme={staffTheme}
      titleColor={isAttendant ? colors.navigationShadow : undefined}
      accessibilityLabel={`${trip.routeName}, ${trip.schoolName}, ${statusBadge.label}, ${trip.direction === 'TO_SCHOOL' ? 'Đến trường' : 'Về trạm'}, ${trip.scheduledTime}`}
      leading={
        <View style={[styles.busIcon, buttons?.secondary]}>
          <Ionicons name="bus-outline" size={25} color={staffTheme?.colors.primary ?? colors.foreground} accessible={false} />
        </View>
      }
      summaryContent={
        <View style={styles.tags}>
          <View style={[styles.tag, trip.direction === 'TO_SCHOOL' && (isAttendant ? attendantTheme.buttons.selected : styles.schoolTag)]}>
            <Ionicons name={trip.direction === 'TO_SCHOOL' ? 'arrow-forward' : 'arrow-back'} size={14}
              color={trip.direction === 'TO_SCHOOL' ? attendanceColor : journeyTones.warning.text} accessible={false} />
            <Text style={[styles.tagText,
              trip.direction === 'TO_SCHOOL' && (isAttendant ? attendantTheme.buttons.secondaryText : styles.schoolTagText)]}>
              {trip.direction === 'TO_SCHOOL' ? 'Đến trường' : 'Về trạm'}
            </Text>
          </View>
          <View style={styles.tag}>
            <Ionicons name="time-outline" size={14} color={journeyTones.warning.text} accessible={false} />
            <Text style={styles.tagText}>{trip.scheduledTime}</Text>
          </View>
        </View>
      }
    >
      <View style={styles.body}>
        <View style={styles.infoRow}>
          <Ionicons name="bus-outline" size={20} color={accent} style={styles.rowIcon} accessible={false} />
          <View style={styles.info}>
            <Text style={styles.label}>Phương tiện</Text>
            <Text style={[styles.value, headingStyle]}>{trip.vehiclePlate}</Text>
            <Text style={styles.secondary}>{trip.vehicleSeats} chỗ · {trip.studentCount} học sinh</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={20} color={accent} style={styles.rowIcon} accessible={false} />
          <View style={styles.info}>
            <Text style={styles.label}>Tài xế</Text>
            <View style={styles.nameRow}>
              <Text style={[styles.value, styles.personName, headingStyle]}>{trip.driver.fullName}</Text>
              {trip.driver.isCurrentUser && <View style={[styles.selfBadge, role === 'DRIVER' && buttons?.secondary]}>
                <Text style={[styles.self, role === 'DRIVER' && buttons?.secondaryText]}>Bạn</Text>
              </View>}
            </View>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="people-outline" size={20} color={accent} style={styles.rowIcon} accessible={false} />
          <View style={styles.info}>
            <Text style={styles.label}>Giáo viên phụ xe</Text>
            <View style={styles.nameRow}>
              <Text style={[styles.value, styles.personName, headingStyle]}>{trip.busAttendant.fullName}</Text>
              {trip.busAttendant.isCurrentUser && <View style={[styles.selfBadge, isAttendant && attendantTheme.buttons.secondary]}>
                <Text style={[styles.self, isAttendant && attendantTheme.buttons.secondaryText]}>Bạn</Text>
              </View>}
            </View>
          </View>
        </View>

        {trip.status === 'SCHEDULED' ? (
          <View style={[styles.operation, trip.operationalState.isAttendantReady ? styles.ready : styles.pending]}>
            <Ionicons name={trip.operationalState.isAttendantReady ? 'checkmark-circle-outline' : 'alert-circle-outline'}
              size={18} color={trip.operationalState.isAttendantReady ? journeyTones.success.text : journeyTones.warning.text} accessible={false} />
            <Text style={[styles.operationText, { color: trip.operationalState.isAttendantReady ? journeyTones.success.text : journeyTones.warning.text }]}>
              {trip.operationalState.isAttendantReady
                ? 'Giáo viên đã xác nhận sẵn sàng khởi hành'
                : isAttendant
                  ? 'Vui lòng xác nhận sẵn sàng trước khi xe chạy'
                  : 'Chờ giáo viên giám sát xác nhận sẵn sàng'}
            </Text>
          </View>
        ) : trip.status === 'IN_PROGRESS' ? (
          <View style={[styles.attendance, isAttendant && styles.attendantAttendance]}>
            <View style={styles.attendanceHeader}>
              <View style={styles.attendanceTitle}>
                <Ionicons name="clipboard-outline" size={16} color={attendanceColor} accessible={false} />
                <Text style={[styles.attendanceLabel, headingStyle]}>Điểm danh</Text>
              </View>
              <Text style={[styles.attendanceCount, headingStyle]}>{trip.operationalState.markedCount}/{trip.operationalState.totalStudents} học sinh</Text>
            </View>
            <View style={styles.attendanceTotals}>
              <View style={styles.total}>
                <Ionicons name="checkmark-circle-outline" size={14} color={presentColor} accessible={false} />
                <Text style={[styles.secondary, isAttendant && styles.presentCount]}>{trip.operationalState.presentCount} có mặt</Text>
              </View>
              <View style={styles.total}>
                <Ionicons name="remove-circle-outline" size={14} color={colors.mutedText} accessible={false} />
                <Text style={styles.secondary}>{trip.operationalState.absentCount} vắng</Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity accessibilityRole="button" style={[parentHomeStyles.primaryBtn, buttons?.primary]}
            onPress={onViewDetail} activeOpacity={0.85}>
            <Text style={[parentHomeStyles.primaryBtnText, buttons?.primaryText]}>{primaryBtnLabel}</Text>
            <Ionicons name="arrow-forward" size={18} color={buttons?.primaryText.color ?? colors.foreground} accessible={false} />
          </TouchableOpacity>
          {canReportLeave && (
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: isReportingLeave, busy: isReportingLeave }}
              style={[parentHomeStyles.leaveNoticeCardBtn, buttons?.selected,
                isReportingLeave && parentHomeStyles.disabled]}
              disabled={isReportingLeave} onPress={onReportLeave} activeOpacity={0.8}>
              {isReportingLeave ? <ActivityIndicator size="small" color={accent} /> : (
                <>
                  <Ionicons name="calendar-outline" size={20} color={accent} accessible={false} />
                  <Text style={[parentHomeStyles.leaveNoticeCardBtnText, buttons?.secondaryText]}>Báo nghỉ chuyến này</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ParentTripCard>
  );
}

const styles = StyleSheet.create({
  busIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tag: {
    maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5,
    borderWidth: 1, borderRadius: 9, borderColor: journeyTones.warning.border, backgroundColor: colors.background
  },
  tagText: { flexShrink: 1, fontSize: 11, lineHeight: 18, fontWeight: '600', color: journeyTones.warning.text },
  schoolTag: { backgroundColor: journeyTones.info.bg, borderColor: journeyTones.info.border },
  schoolTagText: { color: journeyTones.info.text },
  body: { gap: 17 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rowIcon: { width: 30, textAlign: 'center', marginTop: 4 },
  info: { flex: 1, minWidth: 0, gap: 3 },
  label: { fontSize: 11, lineHeight: 17, color: colors.mutedText },
  value: { flexShrink: 1, fontSize: 14, lineHeight: 22, fontWeight: '700', color: colors.foreground },
  secondary: { fontSize: 12, lineHeight: 19, color: colors.mutedText, flexShrink: 1 },
  self: { fontSize: 11, lineHeight: 18, fontWeight: '600', color: colors.navigationActive },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  personName: { flex: 1, minWidth: 0 },
  selfBadge: { flexShrink: 0, marginTop: 2, borderRadius: 6, paddingHorizontal: 6, backgroundColor: colors.navigationHighlight },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  operation: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12, borderWidth: 1, borderRadius: 14 },
  ready: { backgroundColor: journeyTones.success.bg, borderColor: journeyTones.success.border },
  pending: { backgroundColor: journeyTones.warning.bg, borderColor: journeyTones.warning.border },
  operationText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  attendance: { padding: 12, gap: 8, borderRadius: 14, borderWidth: 1, backgroundColor: journeyTones.info.bg, borderColor: journeyTones.info.border },
  attendantAttendance: { backgroundColor: attendantTheme.colors.secondary, borderColor: attendantTheme.colors.disabled },
  attendanceHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  attendanceTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  attendanceLabel: { fontSize: 12, lineHeight: 20, fontWeight: '600', color: journeyTones.info.text },
  attendantHeading: { color: colors.navigationShadow },
  presentCount: { color: journeyTones.success.text, fontWeight: '600' },
  attendanceCount: { fontSize: 13, lineHeight: 20, fontWeight: '700', color: colors.foreground },
  attendanceTotals: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  total: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actions: { gap: 8 },
});
