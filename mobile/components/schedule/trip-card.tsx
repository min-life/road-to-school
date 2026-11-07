import type { ReactNode } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { MobileScheduleItem } from '@/services/api-client';
import { getScheduleStatusLabel } from '@/utils/trip-status-label';
import { scheduleStyles as styles } from './schedule-styles';

interface Props {
  trip: MobileScheduleItem;
  directionLabel: string;
  actionLabel: string;
  onOpen: () => void;
  onReportLeave: () => void;
  isReportingLeave: boolean;
  children?: ReactNode;
}

export function ScheduleTripCard({ trip, directionLabel, actionLabel, onOpen, onReportLeave, isReportingLeave, children }: Props) {
  const isToSchool = trip.direction === 'TO_SCHOOL';
  const isClickable = !trip.isVirtual;
  return (
    <TouchableOpacity
      disabled={!isClickable}
      onPress={() => { if (isClickable) onOpen(); }}
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
              <Text style={styles.badgeTextToSchool}>{directionLabel}</Text>
            </View>
          ) : (
            <View style={[styles.badge, styles.badgeToParking]}>
              <Text style={styles.badgeTextToParking}>{directionLabel}</Text>
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

      {children}

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
              disabled={isReportingLeave}
              onPress={(e) => {
                e.stopPropagation?.();
                onReportLeave();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isReportingLeave ? (
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
              <Text style={styles.actionText}>{actionLabel}</Text>
              <Ionicons name="chevron-forward" size={14} color="#2563EB" />
            </View>
          ) : (
            <Text style={styles.virtualNotice}>Chưa tạo chuyến</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
