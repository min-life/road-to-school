import { AppHeader } from '@/components/navigation/app-header';
import { KeyboardScrollView } from '@/components/keyboard-scroll-view';
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Keyboard,
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import {
  mobileApiClient,
  TripIncident,
  TripIncidentStatus,
  TripIncidentType,
} from '@/services/api-client';

export default function IncidentDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const incidentId = params.id;
  const { user } = useAuth();

  const [incident, setIncident] = useState<TripIncident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmReason, setConfirmReason] = useState('');
  const [confirming, setConfirming] = useState(false);

  const isBusAttendant = user?.role === 'BUS_ATTENDANT';
  const isAutoIncident = incident?.type === 'OFF_ROUTE' || incident?.type === 'LATE_STOP';
  const isWaitingConfirmation =
    incident?.status === 'WAITING_CONFIRMATION' ||
    incident?.status === ('PENDING_CONFIRMATION' as any);
  const canConfirm = isBusAttendant && isAutoIncident && isWaitingConfirmation;

  const handleConfirm = async () => {
    if (!incidentId) return;
    const trimmed = confirmReason.trim();
    if (!trimmed || trimmed.length < 3) {
      Alert.alert('Lưu ý', 'Vui lòng nhập lý do giải trình cụ thể (tối thiểu 3 ký tự).');
      return;
    }
    try {
      setConfirming(true);
      await mobileApiClient.confirmAutoIncident(incidentId, trimmed);
      Alert.alert('Thành công', 'Đã gửi xác nhận và giải trình sự cố.');
      setConfirmModalVisible(false);
      setConfirmReason('');
      fetchDetail();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể xác nhận sự cố. Vui lòng thử lại.');
    } finally {
      setConfirming(false);
    }
  };

  const fetchDetail = useCallback(async () => {
    if (!incidentId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await mobileApiClient.getIncidentDetail(incidentId);
      setIncident(res);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải chi tiết sự cố');
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

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

  const getResolutionTypeLabel = (resType?: string | null) => {
    switch (resType) {
      case 'ARRIVED':
        return 'Nhân sự đã có mặt';
      case 'REPLACED':
        return 'Đã chỉ định người thay thế';
      case 'CANCELLED_TRIP':
        return 'Đã hủy chuyến do thiếu nhân sự';
      case 'CONFIRMED':
      case 'ACKNOWLEDGED':
        return 'Phụ xe đã xác nhận giải trình';
      case 'CLOSED':
      case 'CLOSED_WITHOUT_CONFIRMATION':
        return 'Tự động đóng khi chuyến hoàn thành';
      default:
        return resType || '—';
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <AppHeader title="Chi tiết sự cố" onBack={() => router.back()} />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Đang tải chi tiết...</Text>
          </View>
        ) : error || !incident ? (
          <View style={styles.centerBox}>
            <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
            <Text style={styles.errorTitle}>Lỗi</Text>
            <Text style={styles.errorText}>{error || 'Không tìm thấy sự cố'}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchDetail}>
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Bus Attendant Confirmation Callout */}
            {canConfirm && (
              <View style={styles.actionCallout}>
                <View style={styles.actionCalloutHeader}>
                  <Ionicons name="warning" size={18} color="#B45309" />
                  <Text style={styles.actionCalloutTitle}>Yêu cầu xác nhận & giải trình</Text>
                </View>
                <Text style={styles.actionCalloutText}>
                  Hệ thống phát hiện sự cố tự động (
                  {incident.type === 'OFF_ROUTE' ? 'Lệch tuyến' : 'Trễ đón/trả'}).
                  Vui lòng cung cấp lý do giải trình để hoàn tất ghi nhận sự cố.
                </Text>
                <TouchableOpacity
                  style={styles.actionCalloutBtn}
                  onPress={() => setConfirmModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.actionCalloutBtnText}>Giải trình ngay</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Status & Type Card */}
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View style={[styles.badge, { backgroundColor: getTypeBadge(incident.type).bg }]}>
                  <Ionicons
                    name={getTypeBadge(incident.type).icon as any}
                    size={16}
                    color={getTypeBadge(incident.type).text}
                  />
                  <Text style={[styles.badgeText, { color: getTypeBadge(incident.type).text }]}>
                    {getTypeBadge(incident.type).label}
                  </Text>
                </View>

                <View style={[styles.badge, { backgroundColor: getStatusBadge(incident.status).bg }]}>
                  <Text style={[styles.badgeText, { color: getStatusBadge(incident.status).text }]}>
                    {getStatusBadge(incident.status).label}
                  </Text>
                </View>
              </View>

              <Text style={styles.descriptionTitle}>Mô tả chi tiết</Text>
              <Text style={styles.descriptionContent}>{incident.description}</Text>

              {/* Context Data Evidence if available */}
              {(incident.contextData || incident.context) && (
                <View style={styles.contextBox}>
                  {(incident.contextData?.recordedDistanceMeters ?? incident.context?.recordedDistanceMeters) !== undefined && (
                    <Text style={styles.contextText}>
                      • Khoảng cách lệch: {Math.round(incident.contextData?.recordedDistanceMeters ?? incident.context?.recordedDistanceMeters)}m
                    </Text>
                  )}
                  {(incident.contextData?.recordedDelayMinutes ?? incident.context?.recordedDelayMinutes) !== undefined && (
                    <Text style={styles.contextText}>
                      • Thời gian trễ ước tính: {Math.round(incident.contextData?.recordedDelayMinutes ?? incident.context?.recordedDelayMinutes)} phút
                    </Text>
                  )}
                  {(incident.contextData?.stopAddressText ?? incident.context?.stopAddressText) && (
                    <Text style={styles.contextText}>
                      • Điểm dừng: {incident.contextData?.stopAddressText ?? incident.context?.stopAddressText}
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={14} color="#94A3B8" />
                <Text style={styles.metaText}>
                  Thời gian ghi nhận: {new Date(incident.createdAt).toLocaleString('vi-VN')}
                </Text>
              </View>

              {incident.reportedByName && (
                <View style={styles.metaRow}>
                  <Ionicons name="person-outline" size={14} color="#94A3B8" />
                  <Text style={styles.metaText}>Người báo: {incident.reportedByName}</Text>
                </View>
              )}
            </View>

            {/* Trip Info Card */}
            {incident.trip && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Thông tin chuyến xe</Text>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tuyến xe:</Text>
                  <Text style={styles.infoValue}>{incident.trip.routeName}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Chiều di chuyển:</Text>
                  <Text style={styles.infoValue}>
                    {incident.trip.direction === 'TO_SCHOOL'
                      ? 'Chiều đi (Đến trường)'
                      : 'Chiều về (Về trạm)'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Trường học:</Text>
                  <Text style={styles.infoValue}>{incident.trip.schoolName}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Ngày chạy:</Text>
                  <Text style={styles.infoValue}>{incident.trip.serviceDate}</Text>
                </View>

                {incident.trip.vehiclePlate && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Biển số xe:</Text>
                    <Text style={styles.infoValue}>{incident.trip.vehiclePlate}</Text>
                  </View>
                )}

                {incident.trip.driverName && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Tài xế:</Text>
                    <Text style={styles.infoValue}>{incident.trip.driverName}</Text>
                  </View>
                )}

                {incident.trip.busAttendantName && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Giáo viên phụ xe:</Text>
                    <Text style={styles.infoValue}>{incident.trip.busAttendantName}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Resolution Information Card */}
            {(Boolean(incident.resolutionType || incident.resolution?.action || incident.resolvedAt || incident.processedAt || incident.resolutionNote || incident.resolution?.reason)) && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Kết quả xử lý</Text>

                {(incident.resolutionType || incident.resolution?.action) && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Phương án:</Text>
                    <Text style={[styles.infoValue, { fontWeight: '700', color: '#15803D' }]}>
                      {getResolutionTypeLabel(incident.resolutionType || incident.resolution?.action)}
                    </Text>
                  </View>
                )}

                {incident.replacementUserName && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Người thay thế:</Text>
                    <Text style={[styles.infoValue, { fontWeight: '700' }]}>
                      {incident.replacementUserName}
                    </Text>
                  </View>
                )}

                {incident.processedByName && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Người xử lý:</Text>
                    <Text style={styles.infoValue}>{incident.processedByName}</Text>
                  </View>
                )}

                {(incident.resolvedAt || incident.processedAt) && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Thời gian xử lý:</Text>
                    <Text style={styles.infoValue}>
                      {new Date(incident.resolvedAt || incident.processedAt!).toLocaleString('vi-VN')}
                    </Text>
                  </View>
                )}

                {(incident.resolutionNote || incident.resolution?.reason) && (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteLabel}>Ghi chú giải trình / xử lý:</Text>
                    <Text style={styles.noteContent}>
                      {incident.resolutionNote || incident.resolution?.reason}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Sticky Bottom Action Bar for Bus Attendant */}
      {canConfirm && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
          <TouchableOpacity
            style={styles.confirmBottomBtn}
            onPress={() => setConfirmModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="create-outline" size={18} color="#FFFFFF" />
            <Text style={styles.confirmBottomBtnText}>Xác nhận & Giải trình sự cố</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Confirmation Modal */}
      <Modal
        transparent
        animationType="fade"
        visible={confirmModalVisible}
        onRequestClose={() => {
          Keyboard.dismiss();
          setConfirmModalVisible(false);
          setConfirmReason('');
        }}
      >
        <KeyboardScrollView
          style={[styles.modalOverlay, { alignItems: undefined, justifyContent: undefined }]}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={[styles.badgePill, { backgroundColor: '#FFEDD5' }]}>
                <Ionicons name="alert-circle" size={14} color="#C2410C" />
                <Text style={[styles.badgePillText, { color: '#C2410C' }]}>
                  {incident?.type === 'OFF_ROUTE' ? 'Xác nhận lệch tuyến' : 'Xác nhận trễ đón/trả'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setConfirmModalVisible(false);
                  setConfirmReason('');
                }}
                disabled={confirming}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.confirmModalTitle}>Giải trình sự cố vận hành</Text>
            <Text style={styles.confirmModalDesc}>
              {incident?.description ||
                'Hệ thống ghi nhận sự cố tự động trong chuyến đi. Vui lòng nêu rõ lý do thực tế.'}
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.confirmReasonLabel}>Lý do / Giải trình (bắt buộc):</Text>
              <TouchableOpacity
                onPress={Keyboard.dismiss}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.keyboardDismissBtn}
              >
                <Ionicons name="chevron-down-outline" size={13} color="#64748B" />
                <Text style={styles.keyboardDismissBtnText}>Ẩn phím</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.confirmReasonInput}
              placeholder="VD: Tránh đường tắc giờ cao điểm, tuyến đường đang sửa chữa..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              value={confirmReason}
              onChangeText={setConfirmReason}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  Keyboard.dismiss();
                  setConfirmModalVisible(false);
                  setConfirmReason('');
                }}
                disabled={confirming}
              >
                <Text style={styles.modalCancelBtnText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  (!confirmReason.trim() || confirmReason.trim().length < 3) && styles.btnDisabled,
                ]}
                onPress={() => {
                  Keyboard.dismiss();
                  handleConfirm();
                }}
                disabled={confirming || !confirmReason.trim() || confirmReason.trim().length < 3}
              >
                {confirming ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Gửi giải trình</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF6',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  centerBox: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
  errorText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    marginTop: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  descriptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descriptionContent: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 20,
  },
  contextBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  contextText: {
    fontSize: 12,
    color: '#475569',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
  },
  noteBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
    marginTop: 4,
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  noteContent: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
  },
  actionCallout: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  actionCalloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCalloutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B45309',
  },
  actionCalloutText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 18,
  },
  actionCalloutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#D97706',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  actionCalloutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 8,
  },
  confirmBottomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 13,
    borderRadius: 12,
  },
  confirmBottomBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    gap: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  confirmModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  confirmModalDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  confirmReasonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  keyboardDismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  keyboardDismissBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  confirmReasonInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 10,
    fontSize: 13,
    color: '#1E293B',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalCancelBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#059669',
  },
  modalConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
