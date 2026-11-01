import React from 'react';
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { MobileHomeTrip, Role } from '@/services/api-client';
import { staffHomeStyles as styles } from './staff-home-styles';

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
  role,
  trip,
  onViewDetail,
  onReportLeave,
  isReportingLeave,
  canReportLeave,
  getStatusBadge,
}: StaffTripCardProps) {
  const isDriver = role === 'DRIVER';
  const isAttendant = role === 'BUS_ATTENDANT';

  const statusBadge =
    trip.assignmentStatus === 'WAITING_ASSIGNMENT'
      ? { label: 'Chờ phân công', bg: '#FEF3C7', text: '#B45309' }
      : getStatusBadge(trip.status);

  const primaryBtnLabel = isAttendant
    ? 'Vào điểm danh & Vận hành'
    : 'Xem chi tiết & Vận hành';

  return (
    <View style={styles.tripCard}>
      {/* Header: Direction & Status */}
      <View style={styles.tripCardHeader}>
        <View
          style={[
            styles.directionPill,
            trip.direction === 'TO_SCHOOL' ? styles.dirSchool : styles.dirReturn,
          ]}
        >
          <Ionicons
            name={trip.direction === 'TO_SCHOOL' ? 'arrow-forward' : 'arrow-back'}
            size={14}
            color={trip.direction === 'TO_SCHOOL' ? '#2563EB' : '#D97706'}
          />
          <Text
            style={[
              styles.directionPillText,
              trip.direction === 'TO_SCHOOL'
                ? styles.dirTextSchool
                : styles.dirTextReturn,
            ]}
          >
            {trip.direction === 'TO_SCHOOL' ? 'Đến trường' : 'Về trạm'}
          </Text>
        </View>

        <View style={[styles.statusPill, { backgroundColor: statusBadge.bg }]}>
          <Text style={[styles.statusPillText, { color: statusBadge.text }]}>
            {statusBadge.label}
          </Text>
        </View>
      </View>

      {/* Route Name & School */}
      <Text style={styles.tripRouteName}>{trip.routeName}</Text>
      <View style={styles.metaRow}>
        <Image
          source={require('@/assets/driver/School-icon.png')}
          style={styles.metaIcon}
          resizeMode="contain"
        />
        <Text style={styles.metaText} numberOfLines={1}>
          {trip.schoolName}
        </Text>
      </View>

      {/* Scheduled Time & Service Date */}
      <View style={styles.timeBadgeContainer}>
        <View style={styles.timeBadge}>
          <Image
            source={require('@/assets/driver/Clock.png')}
            style={styles.timeIcon}
            resizeMode="contain"
          />
          <Text style={styles.timeBadgeText}>{trip.scheduledTime}</Text>
        </View>
        <Text style={styles.dateText}>{trip.serviceDate}</Text>
      </View>

      {/* Info Grid: Vehicle & Staff */}
      <View style={styles.infoGrid}>
        {/* Col 1: Xe */}
        <View style={styles.infoColVehicle}>
          <View style={styles.infoColHeader}>
            <Image
              source={require('@/assets/driver/Bus.png')}
              style={{ width: 22, height: 22 }}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.infoColMain}>{trip.vehiclePlate}</Text>
          <Text style={styles.infoColSub}>
            {trip.vehicleSeats} chỗ • {trip.studentCount} HS
          </Text>
        </View>

        <View style={styles.infoColDivider} />

        {/* Col 2: Nhân sự */}
        <View style={styles.infoColPersonnel}>
          <View style={styles.infoColHeader}>
            <Image
              source={require('@/assets/driver/Personal-charge.png')}
              style={{ width: 36, height: 18 }}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.infoColMain} numberOfLines={1}>
            TX: {trip.driver.fullName}
            {trip.driver.isCurrentUser ? ' (Bạn)' : ''}
          </Text>
          <Text style={styles.infoColSub} numberOfLines={1}>
            GV: {trip.busAttendant.fullName}
            {trip.busAttendant.isCurrentUser ? ' (Bạn)' : ''}
          </Text>
        </View>
      </View>

      {/* Operational State Highlight */}
      {trip.status === 'SCHEDULED' ? (
        <View
          style={[
            styles.opsHighlight,
            trip.operationalState.isAttendantReady
              ? styles.opsHighlightSuccess
              : styles.opsHighlightPending,
          ]}
        >
          <Ionicons
            name={
              trip.operationalState.isAttendantReady
                ? 'checkmark-circle'
                : 'alert-circle'
            }
            size={18}
            color={
              trip.operationalState.isAttendantReady ? '#15803D' : '#B45309'
            }
          />
          <Text
            style={[
              styles.opsHighlightText,
              {
                color: trip.operationalState.isAttendantReady
                  ? '#15803D'
                  : '#B45309',
              },
            ]}
          >
            {trip.operationalState.isAttendantReady
              ? 'Giáo viên đã xác nhận sẵn sàng khởi hành'
              : isAttendant
              ? 'Vui lòng xác nhận sẵn sàng trước khi xe chạy'
              : 'Chờ giáo viên giám sát xác nhận sẵn sàng'}
          </Text>
        </View>
      ) : trip.status === 'IN_PROGRESS' ? (
        <View style={[styles.opsHighlight, styles.opsHighlightProgress]}>
          <Ionicons name="radio-button-on" size={18} color="#2563EB" />
          <Text style={[styles.opsHighlightText, { color: '#1E40AF' }]}>
            Điểm danh: {trip.operationalState.markedCount}/
            {trip.operationalState.totalStudents} học sinh (
            {trip.operationalState.presentCount} có mặt,{' '}
            {trip.operationalState.absentCount} vắng)
          </Text>
        </View>
      ) : null}

      {/* Action Buttons */}
      <View style={styles.actionBtnGroup}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={onViewDetail}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>{primaryBtnLabel}</Text>
          <Ionicons name="arrow-forward" size={18} color="#1E293B" />
        </TouchableOpacity>

        {canReportLeave && (
          <TouchableOpacity
            style={styles.leaveNoticeCardBtn}
            disabled={isReportingLeave}
            onPress={onReportLeave}
            activeOpacity={0.8}
          >
            {isReportingLeave ? (
              <ActivityIndicator size="small" color="#D97706" />
            ) : (
              <>
                <Image
                  source={require('@/assets/driver/leave.png')}
                  style={styles.leaveNoticeIcon}
                  resizeMode="contain"
                />
                <Text style={styles.leaveNoticeCardBtnText}>
                  Báo nghỉ chuyến này
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

