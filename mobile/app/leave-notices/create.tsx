import { KeyboardScrollView } from '@/components/keyboard-scroll-view';
import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import {
  mobileApiClient,
  LeaveNoticeTripOption,
  MaskedContactChannel,
  ParentLinkedStudentItem,
} from '@/services/api-client';
import { getVietnamToday } from '@/utils/date';

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function CreateLeaveNoticeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ studentId?: string; tripId?: string }>();

  const isParent = user?.role === 'PARENT';
  const isFixedStudent = Boolean(params.studentId);

  // State: Student selection (Parent only)
  const [students, setStudents] = useState<ParentLinkedStudentItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(params.studentId || '');
  const [studentModalVisible, setStudentModalVisible] = useState(false);

  // State: Date & Direction selection
  const todayStr = getVietnamToday();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedDirection, setSelectedDirection] = useState<'TO_SCHOOL' | 'TO_PARKING'>('TO_SCHOOL');

  // Calendar modal state
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calYear, setCalYear] = useState<number>(() => {
    const p = todayStr.split('-').map(Number);
    return p[0];
  });
  const [calMonth, setCalMonth] = useState<number>(() => {
    const p = todayStr.split('-').map(Number);
    return p[1];
  });

  // State: Trips options
  const [trips, setTrips] = useState<LeaveNoticeTripOption[]>([]);
  const [maskedChannels, setMaskedChannels] = useState<MaskedContactChannel[]>([]);
  const [subjectName, setSubjectName] = useState<string>('');
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submittingOtp, setSubmittingOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load linked students if Parent
  useEffect(() => {
    if (isParent) {
      mobileApiClient
        .getLinkedStudents()
        .then((res) => {
          setStudents(res || []);
          if (!selectedStudentId && res && res.length > 0) {
            setSelectedStudentId(res[0].id);
          }
        })
        .catch(() => setStudents([]));
    }
  }, [isParent, selectedStudentId]);

  // Fetch available trips options whenever Student, Date, or Direction changes
  useEffect(() => {
    let current = true;
    if (isParent && !selectedStudentId) return;

    setLoadingOptions(true);
    setError(null);
    setSelectedTripId('');

    mobileApiClient
      .getLeaveNoticeOptions({
        studentId: isParent ? selectedStudentId : undefined,
        serviceDate: selectedDate,
        direction: selectedDirection,
      })
      .then((res) => {
        if (!current) return;
        setTrips(res.trips || []);
        setMaskedChannels(res.maskedChannels || []);
        setSubjectName(res.subjectName || '');

        // If prefilled tripId is in options and available, select it.
        // Otherwise, if exactly 1 available trip, auto select it.
        const availableTrips = (res.trips || []).filter((t) => t.canReport);
        if (params.tripId && availableTrips.some((t) => t.tripId === params.tripId)) {
          setSelectedTripId(params.tripId);
        } else if (availableTrips.length === 1) {
          setSelectedTripId(availableTrips[0].tripId);
        } else {
          setSelectedTripId('');
        }
      })
      .catch((err: any) => {
        if (!current) return;
        setError(err?.message || 'Không thể tải danh sách chuyến xe phù hợp');
        setTrips([]);
        setMaskedChannels([]);
        setSelectedTripId('');
      })
      .finally(() => {
        if (current) setLoadingOptions(false);
      });

    return () => {
      current = false;
    };
  }, [isParent, selectedStudentId, selectedDate, selectedDirection, params.tripId]);

  // Selected trip object
  const currentTrip = trips.find((t) => t.tripId === selectedTripId);
  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // Calendar grid calculations
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(Date.UTC(calYear, calMonth, 0)).getUTCDate();
    const firstDayOfWeek = new Date(Date.UTC(calYear, calMonth - 1, 1)).getUTCDay();
    const firstDayOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // 0 for Mon ... 6 for Sun

    const cells: { day: number | null; dateStr: string | null }[] = [];
    for (let i = 0; i < firstDayOffset; i++) {
      cells.push({ day: null, dateStr: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr: dStr });
    }
    return cells;
  }, [calYear, calMonth]);

  const handlePrevMonth = () => {
    if (calMonth === 1) {
      setCalYear((y) => y - 1);
      setCalMonth(12);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 12) {
      setCalYear((y) => y + 1);
      setCalMonth(1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedTripId('');
    setCalendarVisible(false);
  };

  const handleQuickSelectToday = () => {
    const parts = todayStr.split('-').map(Number);
    setCalYear(parts[0]);
    setCalMonth(parts[1]);
    setSelectedDate(todayStr);
    setSelectedTripId('');
    setCalendarVisible(false);
  };

  const handleRequestOtp = async () => {
    if (!selectedTripId || !currentTrip) {
      Alert.alert('Chưa chọn chuyến xe', 'Vui lòng chọn một chuyến xe hợp lệ để báo nghỉ.');
      return;
    }

    if (submittingOtp) return;
    setSubmittingOtp(true);
    setError(null);

    try {
      const res = await mobileApiClient.requestLeaveNoticeOtp({
        tripId: selectedTripId,
        studentId: isParent ? selectedStudentId : undefined,
      });

      // Navigate to OTP screen
      router.push({
        pathname: '/leave-notices/otp',
        params: {
          challengeId: res.challengeId,
          maskedChannels: JSON.stringify(res.maskedChannels || []),
          expiresInSeconds: String(res.expiresInSeconds || 300),
          tripId: selectedTripId,
          studentId: isParent ? selectedStudentId : '',
          reason: reason.trim(),
          subjectName: subjectName || user?.fullName || '',
          routeName: currentTrip.routeName,
          serviceDate: currentTrip.serviceDate,
          direction: currentTrip.direction,
        },
      } as any);
    } catch (err: any) {
      const msg = err?.message || 'Không thể gửi mã xác thực OTP. Vui lòng thử lại.';
      setError(msg);
      Alert.alert('Lỗi gửi OTP', msg);
    } finally {
      setSubmittingOtp(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo báo nghỉ</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Step 1: Select Student (Parent only) */}
        {isParent && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Học sinh</Text>
            {isFixedStudent ? (
              <View style={styles.fixedField}>
                <Ionicons name="person-circle-outline" size={20} color="#1E293B" />
                <Text style={styles.fixedFieldText}>
                  {selectedStudent?.fullName || 'Học sinh'}
                </Text>
                <View style={styles.fixedBadge}>
                  <Text style={styles.fixedBadgeText}>Cố định</Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.dropdownBtn}
                onPress={() => setStudentModalVisible(true)}
                activeOpacity={0.8}
              >
                <View style={styles.dropdownLeft}>
                  <Ionicons name="person-circle-outline" size={20} color="#D97706" />
                  <Text style={styles.dropdownBtnText}>
                    {selectedStudent?.fullName || 'Chọn học sinh'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={18} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Step 2: Select Date (Calendar Datepicker) */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Ngày phục vụ</Text>
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => {
              const parts = selectedDate.split('-').map(Number);
              setCalYear(parts[0]);
              setCalMonth(parts[1]);
              setCalendarVisible(true);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.dropdownLeft}>
              <Ionicons name="calendar-outline" size={20} color="#D97706" />
              <Text style={styles.dropdownBtnText}>
                {formatDateDisplay(selectedDate)}
              </Text>
            </View>
            <View style={styles.actionPill}>
              <Text style={styles.actionPillText}>Đổi ngày</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Step 3: Select Direction */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Chiều tuyến đường</Text>
          <View style={styles.directionRow}>
            <TouchableOpacity
              style={[
                styles.directionBtn,
                selectedDirection === 'TO_SCHOOL' && styles.directionBtnActive,
              ]}
              onPress={() => {
                if (selectedDirection !== 'TO_SCHOOL') {
                  setSelectedDirection('TO_SCHOOL');
                  setSelectedTripId('');
                }
              }}
            >
              <Ionicons
                name="arrow-forward"
                size={16}
                color={selectedDirection === 'TO_SCHOOL' ? '#2563EB' : '#64748B'}
              />
              <Text
                style={[
                  styles.directionBtnText,
                  selectedDirection === 'TO_SCHOOL' && styles.directionBtnTextActive,
                ]}
              >
                Chiều đi (Đến trường)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.directionBtn,
                selectedDirection === 'TO_PARKING' && styles.directionBtnActive,
              ]}
              onPress={() => {
                if (selectedDirection !== 'TO_PARKING') {
                  setSelectedDirection('TO_PARKING');
                  setSelectedTripId('');
                }
              }}
            >
              <Ionicons
                name="arrow-back"
                size={16}
                color={selectedDirection === 'TO_PARKING' ? '#D97706' : '#64748B'}
              />
              <Text
                style={[
                  styles.directionBtnText,
                  selectedDirection === 'TO_PARKING' && styles.directionBtnTextActive,
                ]}
              >
                Chiều về (Về nhà)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Step 4: Trip Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Chuyến xe cụ thể</Text>

          {loadingOptions ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingBoxText}>Đang kiểm tra chuyến xe...</Text>
            </View>
          ) : trips.length === 0 ? (
            <View style={styles.emptyTripsBox}>
              <Ionicons name="information-circle-outline" size={24} color="#94A3B8" />
              <Text style={styles.emptyTripsText}>
                Không có chuyến xe đã lập lịch nào phù hợp trong ngày và chiều đã chọn.
              </Text>
            </View>
          ) : (
            <View style={styles.tripsList}>
              {trips.map((opt) => {
                const isSelected = selectedTripId === opt.tripId;
                const isAvailable = opt.canReport;

                return (
                  <TouchableOpacity
                    key={opt.tripId}
                    style={[
                      styles.tripOptionCard,
                      !isAvailable && styles.tripOptionDisabled,
                      isSelected && styles.tripOptionSelected,
                    ]}
                    onPress={() => {
                      if (isAvailable) setSelectedTripId(opt.tripId);
                    }}
                    disabled={!isAvailable}
                    activeOpacity={0.8}
                  >
                    <View style={styles.tripOptionRadio}>
                      <View
                        style={[
                          styles.radioCircle,
                          isSelected && styles.radioCircleActive,
                          !isAvailable && styles.radioCircleDisabled,
                        ]}
                      >
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                    </View>

                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        style={[
                          styles.tripOptionRoute,
                          !isAvailable && styles.textDisabled,
                          isSelected && styles.textSelected,
                        ]}
                      >
                        {opt.routeName}
                      </Text>
                      <Text style={styles.tripOptionTime}>
                        {opt.scheduledStartTime
                          ? `${opt.scheduledStartTime.slice(0, 5)} - ${
                              opt.scheduledEndTime?.slice(0, 5) || ''
                            }`
                          : 'Theo lịch'}
                      </Text>

                      {!isAvailable && opt.disabledReason && (
                        <Text style={styles.disabledReasonText}>{opt.disabledReason}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Step 5: Optional Reason */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Lý do báo nghỉ (tùy chọn)</Text>
          <TextInput
            style={styles.reasonInput}
            placeholder="Ví dụ: Học sinh bị sốt, gia đình có việc bận..."
            placeholderTextColor="#94A3B8"
            value={reason}
            onChangeText={setReason}
            maxLength={200}
          />
        </View>

        {/* Error message */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Step 6: Confirmation Summary Card */}
        {currentTrip && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Xác nhận thông tin</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Đối tượng:</Text>
              <Text style={styles.summaryValue}>{subjectName || 'Bạn'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Chuyến:</Text>
              <Text style={styles.summaryValue}>{currentTrip.routeName}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Ngày & Chiều:</Text>
              <Text style={styles.summaryValue}>
                {formatDateDisplay(selectedDate)} · {selectedDirection === 'TO_SCHOOL' ? 'Chiều đi' : 'Chiều về'}
              </Text>
            </View>

            {maskedChannels.length > 0 && (
              <View style={styles.otpNoticeBox}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#D97706" />
                <Text style={styles.otpNoticeText}>
                  OTP sẽ được gửi tới:{' '}
                  {maskedChannels
                    .map((c) => `${c.destination}${c.isConsole ? ' (SMS console)' : ''}`)
                    .join(' & ')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!selectedTripId || submittingOtp) && styles.submitBtnDisabled,
          ]}
          onPress={handleRequestOtp}
          disabled={!selectedTripId || submittingOtp}
          activeOpacity={0.85}
        >
          {submittingOtp ? (
            <ActivityIndicator size="small" color="#1E293B" />
          ) : (
            <>
              <Text style={styles.submitBtnText}>Gửi mã xác thực OTP</Text>
              <Ionicons name="arrow-forward" size={18} color="#1E293B" />
            </>
          )}
        </TouchableOpacity>
      </KeyboardScrollView>

      {/* Student Selection Modal */}
      <Modal
        visible={studentModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStudentModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setStudentModalVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn học sinh</Text>
              <TouchableOpacity onPress={() => setStudentModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              {students.map((stu) => {
                const isSelected = stu.id === selectedStudentId;
                return (
                  <TouchableOpacity
                    key={stu.id}
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    onPress={() => {
                      setSelectedStudentId(stu.id);
                      setSelectedTripId('');
                      setStudentModalVisible(false);
                    }}
                  >
                    <Ionicons
                      name="person-circle-outline"
                      size={22}
                      color={isSelected ? '#D97706' : '#64748B'}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalItemTitle, isSelected && styles.modalItemTitleActive]}>
                        {stu.fullName}
                      </Text>
                      <Text style={styles.modalItemSub}>
                        Mã: {stu.code} · {stu.schoolName}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color="#D97706" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Calendar Datepicker Modal */}
      <Modal
        visible={calendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCalendarVisible(false)}
        >
          <View style={styles.calendarModalContent} onStartShouldSetResponder={() => true}>
            {/* Calendar Nav Header */}
            <View style={styles.calNavRow}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.calNavBtn}>
                <Ionicons name="chevron-back" size={20} color="#1E293B" />
              </TouchableOpacity>
              <Text style={styles.calMonthText}>
                Tháng {calMonth}, {calYear}
              </Text>
              <TouchableOpacity onPress={handleNextMonth} style={styles.calNavBtn}>
                <Ionicons name="chevron-forward" size={20} color="#1E293B" />
              </TouchableOpacity>
            </View>

            {/* Weekday Names */}
            <View style={styles.calWeekRow}>
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((w, idx) => (
                <Text key={idx} style={styles.calWeekText}>
                  {w}
                </Text>
              ))}
            </View>

            {/* Calendar Days Grid */}
            <View style={styles.calGrid}>
              {calendarDays.map((cell, idx) => {
                if (!cell.day || !cell.dateStr) {
                  return <View key={`empty-${idx}`} style={styles.calCell} />;
                }

                const isSelected = cell.dateStr === selectedDate;
                const isToday = cell.dateStr === todayStr;

                return (
                  <TouchableOpacity
                    key={cell.dateStr}
                    style={[
                      styles.calCell,
                      isSelected && styles.calCellSelected,
                      isToday && !isSelected && styles.calCellToday,
                    ]}
                    onPress={() => handleSelectDay(cell.dateStr!)}
                  >
                    <Text
                      style={[
                        styles.calCellText,
                        isSelected && styles.calCellTextSelected,
                        isToday && !isSelected && styles.calCellTextToday,
                      ]}
                    >
                      {cell.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Calendar Modal Footer */}
            <View style={styles.calFooter}>
              <TouchableOpacity style={styles.todayShortcutBtn} onPress={handleQuickSelectToday}>
                <Ionicons name="today-outline" size={15} color="#1E293B" />
                <Text style={styles.todayShortcutText}>Chọn hôm nay</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeCalBtn}
                onPress={() => setCalendarVisible(false)}
              >
                <Text style={styles.closeCalBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fixedField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fixedFieldText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  fixedBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  fixedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dropdownBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  actionPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  directionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  directionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  directionBtnActive: {
    borderColor: '#FFCB56',
    backgroundColor: '#FEF9C3',
  },
  directionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  directionBtnTextActive: {
    color: '#1E293B',
    fontWeight: '700',
  },
  loadingBox: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  loadingBoxText: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyTripsBox: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  emptyTripsText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  tripsList: {
    gap: 8,
  },
  tripOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tripOptionSelected: {
    borderColor: '#FFCB56',
    backgroundColor: '#FFFDF6',
    borderWidth: 1.5,
  },
  tripOptionDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
    opacity: 0.6,
  },
  tripOptionRadio: {
    justifyContent: 'center',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#D97706',
  },
  radioCircleDisabled: {
    borderColor: '#E2E8F0',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D97706',
  },
  tripOptionRoute: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  textSelected: {
    color: '#92400E',
  },
  textDisabled: {
    color: '#94A3B8',
  },
  tripOptionTime: {
    fontSize: 12,
    color: '#64748B',
  },
  disabledReasonText: {
    fontSize: 11,
    color: '#DC2626',
    fontStyle: 'italic',
    marginTop: 2,
  },
  reasonInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1E293B',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#B91C1C',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  otpNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  otpNoticeText: {
    fontSize: 11,
    color: '#D97706',
    flex: 1,
    fontWeight: '500',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFCB56',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  modalItemSelected: {
    backgroundColor: '#FEF9C3',
  },
  modalItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalItemTitleActive: {
    fontWeight: '700',
    color: '#92400E',
  },
  modalItemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },

  /* Calendar Modal */
  calendarModalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  calNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calMonthText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  calWeekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calWeekText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    marginVertical: 2,
  },
  calCellSelected: {
    backgroundColor: '#FFCB56',
  },
  calCellToday: {
    borderWidth: 1.5,
    borderColor: '#D97706',
  },
  calCellText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1E293B',
  },
  calCellTextSelected: {
    fontWeight: '800',
    color: '#1E293B',
  },
  calCellTextToday: {
    fontWeight: '700',
    color: '#D97706',
  },
  calFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  todayShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
  },
  todayShortcutText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  closeCalBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  closeCalBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
});
