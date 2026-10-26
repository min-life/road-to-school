import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { WebView } from 'react-native-webview';
import { colors } from '@/constants/theme';
import {
  mobileApiClient,
  ParentStudentRoutingDetail,
} from '@/services/api-client';
import { decodePolyline } from '@/utils/polyline';

export default function ParentRouteDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ studentId: string; studentName?: string }>();
  const studentId = params.studentId;
  const studentName = params.studentName || 'Học sinh';

  const [routingDetail, setRoutingDetail] = useState<ParentStudentRoutingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeDirection, setActiveDirection] = useState<'OUTBOUND' | 'RETURN'>('OUTBOUND');

  const webViewRef = useRef<WebView | null>(null);

  const fetchRoutingDetail = useCallback(async () => {
    if (!studentId) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await mobileApiClient.getStudentRoutingDetail(studentId);
      setRoutingDetail(data);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Không thể tải thông tin tuyến đường hoặc bạn không có quyền xem học sinh này.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchRoutingDetail();
  }, [fetchRoutingDetail]);

  const tilemapKey = process.env.EXPO_PUBLIC_VIETMAP_TILEMAP_KEY || '220bb293d40f7226e0c29c91469f1286c6ed486f7a07e745';

  const isOutbound = activeDirection === 'OUTBOUND';
  const currentRoute = isOutbound
    ? routingDetail?.outboundRoute
    : routingDetail?.returnRoute;

  const studentAddress = isOutbound
    ? routingDetail?.outboundRoute?.pickupAddressText || ''
    : routingDetail?.returnRoute?.dropoffAddressText || '';
  const studentLat = isOutbound
    ? routingDetail?.outboundRoute?.pickupLatitude || 0
    : routingDetail?.returnRoute?.dropoffLatitude || 0;
  const studentLng = isOutbound
    ? routingDetail?.outboundRoute?.pickupLongitude || 0
    : routingDetail?.returnRoute?.dropoffLongitude || 0;

  // Generate HTML for WebView Map
  const generateMapHtml = () => {
    if (!currentRoute) return '';

    const depotLat = currentRoute.parkingLocation.latitude;
    const depotLng = currentRoute.parkingLocation.longitude;
    const depotName = currentRoute.parkingLocation.addressText || 'Bãi xe trung tâm';

    const schoolLat = currentRoute.schoolLocation.latitude;
    const schoolLng = currentRoute.schoolLocation.longitude;
    const schoolName = currentRoute.schoolLocation.name || 'Trường học';
    const eta = currentRoute.plannedArrivalTime;
    const decodedCoords = currentRoute.polylineGeometry
      ? decodePolyline(currentRoute.polylineGeometry)
      : [];

    const depotPopupText = JSON.stringify(
      `<b>${isOutbound ? 'Bãi xe (Điểm xuất phát)' : 'Bãi xe (Điểm kết thúc)'}</b><br/>${depotName}`
    );
    const schoolPopupText = JSON.stringify(
      `<b>${isOutbound ? 'Trường học (Điểm đến)' : 'Trường học (Điểm xuất phát)'}</b><br/>${schoolName}`
    );
    const studentPopupText = JSON.stringify(
      `<b>${studentName}</b><br/>${isOutbound ? 'Giờ đón dự kiến' : 'Giờ trả dự kiến'}: ${eta}<br/>${studentAddress}`
    );
    const coordsJson = JSON.stringify(decodedCoords);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #F8FAFC; }
          .depot-marker { background: #2563EB; color: white; border: 2px solid white; border-radius: 50%; font-weight: bold; width: 28px; height: 28px; line-height: 24px; text-align: center; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
          .school-marker { background: #FFCB56; color: #1E293B; border: 2px solid white; border-radius: 50%; font-weight: bold; width: 30px; height: 30px; line-height: 26px; text-align: center; font-size: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
          .student-marker { background: #059669; color: white; border: 2px solid white; border-radius: 50%; font-weight: bold; width: 28px; height: 28px; line-height: 24px; text-align: center; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${studentLat}, ${studentLng}], 13);
          
          L.tileLayer('https://maps.vietmap.vn/tm/{z}/{x}/{y}@2x.png?apikey=${tilemapKey}', {
            maxZoom: 19
          }).addTo(map);

          var bounds = L.latLngBounds();

          // 1. Depot Marker
          var depotIcon = L.divIcon({ className: '', html: '<div class="depot-marker">P</div>', iconSize: [28, 28], iconAnchor: [14, 14] });
          var depotMarker = L.marker([${depotLat}, ${depotLng}], { icon: depotIcon }).addTo(map);
          depotMarker.bindPopup(${depotPopupText});
          bounds.extend([${depotLat}, ${depotLng}]);

          // 2. School Marker
          var schoolIcon = L.divIcon({ className: '', html: '<div class="school-marker">🏫</div>', iconSize: [30, 30], iconAnchor: [15, 15] });
          var schoolMarker = L.marker([${schoolLat}, ${schoolLng}], { icon: schoolIcon }).addTo(map);
          schoolMarker.bindPopup(${schoolPopupText});
          bounds.extend([${schoolLat}, ${schoolLng}]);

          // 3. Student Marker (Privacy Guard: ONLY current student)
          var studentIcon = L.divIcon({ className: '', html: '<div class="student-marker">📍</div>', iconSize: [28, 28], iconAnchor: [14, 14] });
          var studentMarker = L.marker([${studentLat}, ${studentLng}], { icon: studentIcon }).addTo(map);
          studentMarker.bindPopup(${studentPopupText}).openPopup();
          bounds.extend([${studentLat}, ${studentLng}]);

          // 4. Polyline geometry (Pre-decoded securely in React Native runtime)
          var coords = ${coordsJson};
          if (coords && coords.length > 0) {
            var polyline = L.polyline(coords, { color: '#2563EB', weight: 5, opacity: 0.85 }).addTo(map);
            coords.forEach(function(c) { bounds.extend(c); });
          }

          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [40, 40] });
          }
        </script>
      </body>
      </html>
    `;
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Đang tải thông tin tuyến đường...</Text>
      </View>
    );
  }

  if (errorMessage || !routingDetail) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tuyến đường đưa đón</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Không thể tải tuyến</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchRoutingDetail}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Handle No Route states
  if (routingDetail.routingStatus !== 'ASSIGNED_DRAFT') {
    let title = 'Chưa có tuyến đường';
    let message = 'Học sinh chưa được phân bổ vào phương án tuyến đưa đón.';
    let iconName: any = 'bus-outline';

    if (routingDetail.routingStatus === 'MISSING_ADDRESS') {
      title = 'Chưa có địa chỉ đón trả';
      message = 'Học sinh cần cập nhật địa chỉ nhà chính xác để trường có thể thiết lập lộ trình xe đưa đón.';
      iconName = 'location-outline';
    } else if (routingDetail.routingStatus === 'NO_ROUTE_PLAN') {
      title = 'Trường chưa thiết lập tuyến';
      message = 'Trường học của con hiện đang trong quá trình chuẩn bị và chưa kích hoạt phương án tuyến đưa đón.';
    }

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tuyến đường đưa đón</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name={iconName} size={40} color="#D97706" />
          </View>
          <Text style={styles.emptyTitle}>{title}</Text>
          <Text style={styles.emptyText}>{message}</Text>
          <Text style={styles.emptyGuidance}>
            Vui lòng liên hệ Quản trị viên nhà trường nếu quý phụ huynh có thắc mắc hoặc cần hỗ trợ thêm.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tuyến đường đưa đón</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Badge Notice */}
        <View style={styles.draftNoticeCard}>
          <Ionicons name="information-circle" size={20} color="#D97706" />
          <View style={{ flex: 1 }}>
            <Text style={styles.draftNoticeTitle}>Tuyến dự kiến — Chưa kích hoạt</Text>
            <Text style={styles.draftNoticeText}>
              Phương án: {routingDetail.routePlanName}. Phương tiện hiển thị là xe đề xuất cho kế hoạch, chưa phải phân công chuyến đi chính thức.
            </Text>
          </View>
        </View>

        {/* Direction Tabs */}
        <View style={styles.directionTabsContainer}>
          <TouchableOpacity
            style={[
              styles.directionTab,
              activeDirection === 'OUTBOUND' && styles.directionTabActive,
            ]}
            onPress={() => setActiveDirection('OUTBOUND')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="sunny-outline"
              size={16}
              color={activeDirection === 'OUTBOUND' ? '#1D4ED8' : '#64748B'}
            />
            <Text
              style={[
                styles.directionTabText,
                activeDirection === 'OUTBOUND' && styles.directionTabTextActive,
              ]}
            >
              Chiều đi (Tới trường)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.directionTab,
              activeDirection === 'RETURN' && styles.directionTabActive,
            ]}
            onPress={() => setActiveDirection('RETURN')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="home-outline"
              size={16}
              color={activeDirection === 'RETURN' ? '#1D4ED8' : '#64748B'}
            />
            <Text
              style={[
                styles.directionTabText,
                activeDirection === 'RETURN' && styles.directionTabTextActive,
              ]}
            >
              Chiều về (Về nhà)
            </Text>
          </TouchableOpacity>
        </View>

        {currentRoute ? (
          <>
            {/* Route Details Card */}
            <View style={styles.card}>
              <Text style={styles.routeName}>{currentRoute.name}</Text>

              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Xe đề xuất (Dự kiến)</Text>
                  <Text style={styles.vehiclePlate}>
                    {currentRoute.proposedVehiclePlate || 'Chưa gán'}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>
                    {activeDirection === 'OUTBOUND' ? 'Giờ đón dự kiến' : 'Giờ trả dự kiến'}
                  </Text>
                  <Text style={styles.etaText}>{currentRoute.plannedArrivalTime}</Text>
                </View>
              </View>

              <View style={styles.addressRow}>
                <Ionicons name="location" size={16} color="#059669" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressLabel}>
                    {activeDirection === 'OUTBOUND' ? 'Địa điểm đón học sinh:' : 'Địa điểm trả học sinh:'}
                  </Text>
                  <Text style={styles.addressValue}>{studentAddress}</Text>
                </View>
              </View>

              <View style={styles.addressRow}>
                <Ionicons name="school" size={16} color="#D97706" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressLabel}>Trường học:</Text>
                  <Text style={styles.addressValue}>{currentRoute.schoolLocation.name}</Text>
                </View>
              </View>
            </View>

            {/* Privacy Map WebView */}
            <View style={styles.mapCard}>
              <View style={styles.mapHeader}>
                <Ionicons name="map-outline" size={18} color="#1E293B" />
                <Text style={styles.mapTitle}>Lộ trình tuyến xe trên bản đồ</Text>
              </View>

              <View style={styles.mapContainer}>
                {(() => {
                  const RWebView: any = WebView;
                  return (
                    <RWebView
                      key={`${activeDirection}-${currentRoute?.id || 'none'}`}
                      ref={webViewRef}
                      originWhitelist={['*']}
                      source={{ html: generateMapHtml() }}
                      style={styles.mapWebView}
                      scrollEnabled={false}
                    />
                  );
                })()}
              </View>

              <View style={styles.mapFooterNote}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#2563EB" />
                <Text style={styles.mapFooterText}>
                  Bảo mật vị trí: Bản đồ chỉ hiển thị vị trí của con, bãi xe và trường học nhằm bảo vệ quyền riêng tư.
                </Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.emptyText}>Chưa có thông tin cho chiều di chuyển này</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: colors.mutedText,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.foreground,
    marginTop: 12,
  },
  errorText: {
    fontSize: 13,
    color: colors.mutedText,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.foreground,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginTop: -40,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedText,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  emptyGuidance: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  draftNoticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFBEB',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  draftNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  draftNoticeText: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 17,
  },
  directionTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 4,
    borderRadius: 14,
    gap: 4,
  },
  directionTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  directionTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  directionTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  directionTabTextActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.foreground,
  },
  detailsGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.mutedText,
    marginBottom: 4,
  },
  vehiclePlate: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
    color: colors.foreground,
  },
  etaText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  addressLabel: {
    fontSize: 11,
    color: colors.mutedText,
  },
  addressValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
    marginTop: 2,
  },
  mapCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  mapTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.foreground,
  },
  mapContainer: {
    height: 320,
    backgroundColor: '#F8FAFC',
  },
  mapWebView: {
    flex: 1,
  },
  mapFooterNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    backgroundColor: '#EFF6FF',
    borderTopWidth: 1,
    borderTopColor: '#DBEAFE',
  },
  mapFooterText: {
    fontSize: 11,
    color: '#1E40AF',
    flex: 1,
    lineHeight: 15,
  },
});
