import { KeyboardScrollView } from '@/components/keyboard-scroll-view';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  PanResponder,
  TextInput,
  Modal,
  Alert,
  Keyboard,
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { WebView } from 'react-native-webview';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import {
  mobileApiClient,
  MobileTripDetail,
  MobileTripDetailStop,
  OperationalStateResponse,
  TripAttendanceStudentItem,
  VerifyQrResponse,
  AttendanceStatus,
  TripIncident,
  TripIncidentType,
  TripIncidentStatus,
  IncidentOptionsResponse,
} from '@/services/api-client';
import { useActiveRefresh } from '@/hooks/use-active-refresh';
import type { RefreshContext } from '@/utils/refresh-loop';
import { getTripMapSnapshot } from '@/utils/trip-map-data';
import { childMapPinCss, childMapPinScript, childMapPinSize, serializeMapScriptValue } from '@/utils/child-map-marker';
import { useParentMapAvatars } from '@/hooks/use-parent-map-avatars';
import { decodePolyline } from '@/utils/polyline';
import { useTripNavigation } from '@/hooks/use-trip-navigation';
import { TripNavigationControls } from '@/components/trip-navigation-controls';
import { loadLocationHistory, navigationApi, type LocationPoint, type LocationSource, type NavigationState } from '@/services/trip-navigation';
import { cumulativeDistances, projectProgress, recordedParts, splitSegment, type Coordinate } from '@/utils/trip-navigation';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLLAPSED_HEIGHT = 115;
const EXPANDED_HEIGHT = Math.round(SCREEN_HEIGHT * 0.72);
const FIXED_BOTTOM_ACTION_HEIGHT = 74;

export default function MobileTripDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; incidentId?: string }>();
  const tripId = params.id;
  const { user } = useAuth();

  const [trip, setTrip] = useState<MobileTripDetail | null>(null);
  const [operationalState, setOperationalState] = useState<OperationalStateResponse | null>(null);
  const [attendanceRoster, setAttendanceRoster] = useState<TripAttendanceStudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search in Attendance Tab
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText: string;
    confirmBg: string;
    onConfirm: () => void;
  } | null>(null);

  const [absenceModalStudent, setAbsenceModalStudent] = useState<TripAttendanceStudentItem | null>(null);
  const [absenceReasonText, setAbsenceReasonText] = useState('');

  // QR Modal
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrScanning, setQrScanning] = useState(false);
  const qrGeneration = useRef(0);
  const [qrManualCode, setQrManualCode] = useState('');
  const [verifiedStudent, setVerifiedStudent] = useState<VerifyQrResponse | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Bottom Sheet 2-State Animation & Gesture
  const [isExpanded, setIsExpanded] = useState(false);
  const isExpandedRef = useRef(false);
  const sheetHeightAnim = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const currentHeight = useRef(COLLAPSED_HEIGHT);
  const dragStartHeight = useRef(COLLAPSED_HEIGHT);
  const [following, setFollowing] = useState(false);
  const prevModeRef = useRef<LocationSource | null>(null);

  const isDriverOrAttendant = user?.role === 'DRIVER' || user?.role === 'BUS_ATTENDANT';
  const isBusAttendant = user?.role === 'BUS_ATTENDANT';
  const isDriver = user?.role === 'DRIVER';
  const isParent = user?.role === 'PARENT';

  const [activeTab, setActiveTab] = useState<'INFO' | 'STOPS' | 'ATTENDANCE' | 'INCIDENTS'>(
    isBusAttendant ? 'ATTENDANCE' : 'INFO'
  );
  const [attendanceSubTab, setAttendanceSubTab] = useState<'boarding' | 'alighting'>('boarding');

  // Operational Incidents state
  const [incidentOptions, setIncidentOptions] = useState<IncidentOptionsResponse | null>(null);
  const [tripIncidents, setTripIncidents] = useState<TripIncident[]>([]);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportingIncident, setReportingIncident] = useState(false);
  const [incidentNote, setIncidentNote] = useState('');
  const [dismissedPendingIncidentIds, setDismissedPendingIncidentIds] = useState<Set<string>>(new Set());
  const [activeConfirmIncident, setActiveConfirmIncident] = useState<TripIncident | null>(null);
  const [confirmReason, setConfirmReason] = useState('');
  const [confirmingIncident, setConfirmingIncident] = useState(false);
  const hasAutoPromptedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    isExpandedRef.current = isExpanded;
  }, [isExpanded]);

  useEffect(() => {
    const listenerId = sheetHeightAnim.addListener(({ value }) => {
      currentHeight.current = value;
    });
    return () => {
      sheetHeightAnim.removeListener(listenerId);
    };
  }, [sheetHeightAnim]);

  const animateTo = useCallback(
    (toValue: number, callback?: () => void) => {
      const willExpand = toValue === EXPANDED_HEIGHT;
      if (willExpand) {
        setIsExpanded(true);
      }
      Animated.spring(sheetHeightAnim, {
        toValue,
        friction: 8,
        tension: 40,
        useNativeDriver: false,
      }).start(() => {
        setIsExpanded(willExpand);
        callback?.();
      });
    },
    [sheetHeightAnim]
  );

  const toggleSheet = useCallback(() => {
    if (isExpandedRef.current) {
      animateTo(COLLAPSED_HEIGHT);
    } else {
      animateTo(EXPANDED_HEIGHT);
    }
  }, [animateTo]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dy) > 4;
        },
        onPanResponderGrant: () => {
          dragStartHeight.current = currentHeight.current;
        },
        onPanResponderMove: (_, gestureState) => {
          const newHeight = dragStartHeight.current - gestureState.dy;
          const clampedHeight = Math.min(
            EXPANDED_HEIGHT,
            Math.max(COLLAPSED_HEIGHT, newHeight)
          );
          if (clampedHeight > COLLAPSED_HEIGHT + 15 && !isExpandedRef.current) {
            setIsExpanded(true);
          }
          sheetHeightAnim.setValue(clampedHeight);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (Math.abs(gestureState.dy) < 6 && Math.abs(gestureState.dx) < 6) {
            if (isExpandedRef.current) {
              animateTo(COLLAPSED_HEIGHT);
            } else {
              animateTo(EXPANDED_HEIGHT);
            }
            return;
          }

          if (gestureState.vy < -0.4) {
            animateTo(EXPANDED_HEIGHT);
            return;
          }
          if (gestureState.vy > 0.4) {
            animateTo(COLLAPSED_HEIGHT);
            return;
          }

          const midpoint = (COLLAPSED_HEIGHT + EXPANDED_HEIGHT) / 2;
          if (currentHeight.current >= midpoint) {
            animateTo(EXPANDED_HEIGHT);
          } else {
            animateTo(COLLAPSED_HEIGHT);
          }
        },
      }),
    [animateTo, sheetHeightAnim]
  );

  const accessAllowed = useRef(true);
  const metadataAt = useRef(0);
  const identity = JSON.stringify([user?.id, user?.role, tripId]);
  const { children: linkedMapChildren, revision: mapAvatarRevision } = useParentMapAvatars(identity, isParent);
  const [navigation, setNavigation] = useState<NavigationState | null>(null);
  const [history, setHistory] = useState<LocationPoint[] | null>(null);
  const [showPlanned, setShowPlanned] = useState(false);
  const historyLoaded = useRef(false);
  const webView = useRef<WebView<object>>(null);
  const engine = useTripNavigation(identity, tripId, user?.id, trip?.stops ?? [], () => loadTripDetail());
  useEffect(() => {
    setTrip(null); setOperationalState(null); setAttendanceRoster([]); setLoading(true);
    setConfirmModal(null); setAbsenceModalStudent(null); setQrModalVisible(false); setVerifiedStudent(null);
    metadataAt.current = 0; accessAllowed.current = true;
    setNavigation(null); setHistory(null); historyLoaded.current = false;
    setShowPlanned(false);
    qrGeneration.current++;
  }, [identity]);

  const fetchTrip = async ({ isCurrent, immediate }: RefreshContext) => {
    if (!tripId || !user) return;
    try {
      const refreshMetadata = immediate || !trip || Date.now() - metadataAt.current >= 20000;
      const [state, roster, detail, location, incidents, options] = await Promise.all([
        mobileApiClient.getOperationalState(tripId),
        isDriverOrAttendant ? mobileApiClient.getTripAttendance(tripId) : Promise.resolve(null),
        refreshMetadata ? mobileApiClient.getMobileTripDetail(tripId) : Promise.resolve(null),
        navigationApi.state(tripId).catch(err => {
          if ([401, 403, 404].includes(err?.statusCode)) throw err;
          return null; // Telemetry failures must not break Trip Operations.
        }),
        mobileApiClient.getTripIncidents(tripId).catch(() => []),
        isDriverOrAttendant ? mobileApiClient.getIncidentOptions(tripId).catch(() => null) : Promise.resolve(null),
      ]);
      if (!isCurrent()) return;
      setOperationalState(state);
      if (roster) setAttendanceRoster(roster.students || []);
      if (detail) { setTrip(detail); metadataAt.current = Date.now(); }
      if (incidents) setTripIncidents(incidents);
      if (options) setIncidentOptions(options);
      if (location) { setNavigation(location); void engine.observe(location); }
      else setNavigation(previous => previous ? { ...previous, freshness: 'STALE' } : null);
      if ((state.status === 'COMPLETED' || state.status === 'CANCELLED') && !historyLoaded.current) {
        try {
          const points = await loadLocationHistory(tripId, isCurrent);
          if (!isCurrent()) return;
          if (points) { setHistory(points); historyLoaded.current = true; }
        } catch { /* Keep the detail usable; a later focus retries history. */ }
      }
      setError(null);
      return (state.status !== 'COMPLETED' && state.status !== 'CANCELLED') || !historyLoaded.current;
    } catch (err: any) {
      if (!isCurrent()) return;
      if ([401, 403, 404].includes(err?.statusCode)) {
        accessAllowed.current = false;
        setNavigation(null); setHistory(null); engine.clear();
        setTrip(null); setOperationalState(null); setAttendanceRoster([]);
        setConfirmModal(null); setAbsenceModalStudent(null); setQrModalVisible(false); setVerifiedStudent(null);
        setError(err.message); return false;
      }
      if (!trip) setError(err?.message || 'Không thể tải thông tin chuyến xe');
    } finally { if (isCurrent()) setLoading(false); }
  };
  const identityRef = useRef(identity);
  useEffect(() => { identityRef.current = identity; }, [identity]);
  const { refresh: loadTripDetail, mutate } = useActiveRefresh(identity, fetchTrip, 5000);
  useEffect(() => {
    setConfirmModal(null);
    qrGeneration.current++;
    setQrScanning(false);
    if (operationalState?.isSchoolArrived) { setQrModalVisible(false); setVerifiedStudent(null); }
    if (operationalState?.status === 'COMPLETED' || operationalState?.status === 'CANCELLED') {
      setConfirmModal(null); setAbsenceModalStudent(null); setQrModalVisible(false); setVerifiedStudent(null);
    }
  }, [operationalState?.status, operationalState?.isSchoolArrived, operationalState?.isAttendantReady,
    operationalState?.canStartTrip, operationalState?.canArriveAtSchool, operationalState?.canCompleteTrip]);

  // Bus Attendant pending unconfirmed auto-incident
  const handledNotificationIncident = useRef<string | null>(null);
  useEffect(() => {
    if (!params.incidentId || handledNotificationIncident.current === params.incidentId) return;
    const incident = tripIncidents.find(item => item.id === params.incidentId);
    if (!incident) return;
    handledNotificationIncident.current = params.incidentId;
    setActiveTab('INCIDENTS');
    if (!isExpandedRef.current) toggleSheet();
    if (isBusAttendant && incident.status === 'WAITING_CONFIRMATION' && operationalState?.status === 'IN_PROGRESS') {
      hasAutoPromptedRef.current.add(incident.id); setActiveConfirmIncident(incident);
    }
  }, [params.incidentId, tripIncidents, isBusAttendant, operationalState?.status, toggleSheet]);
  const unconfirmedPendingIncident = useMemo(() => {
    if (!isBusAttendant) return null;
    return (
      tripIncidents.find(
        (inc) =>
          (inc.status === 'WAITING_CONFIRMATION' ||
            inc.status === ('PENDING_CONFIRMATION' as any)) &&
          (inc.type === 'OFF_ROUTE' || inc.type === 'LATE_STOP')
      ) || null
    );
  }, [isBusAttendant, tripIncidents]);

  // Auto prompt popup queue when pending incident appears
  useEffect(() => {
    if (
      unconfirmedPendingIncident &&
      !dismissedPendingIncidentIds.has(unconfirmedPendingIncident.id) &&
      !hasAutoPromptedRef.current.has(unconfirmedPendingIncident.id) &&
      !activeConfirmIncident
    ) {
      hasAutoPromptedRef.current.add(unconfirmedPendingIncident.id);
      setActiveConfirmIncident(unconfirmedPendingIncident);
    }
  }, [unconfirmedPendingIncident, dismissedPendingIncidentIds, activeConfirmIncident]);

  const handleReportIncident = async () => {
    const reportType =
      incidentOptions?.availableTypes?.[0] ||
      (isDriver ? 'ATTENDANT_MISSING' : 'DRIVER_MISSING');
    if (!tripId || !reportType) return;
    try {
      setReportingIncident(true);
      await mobileApiClient.createManualIncident({
        tripId,
        type: reportType,
        note: incidentNote.trim() || undefined,
      });
      Alert.alert('Thành công', 'Đã ghi nhận báo cáo sự cố vận hành.');
      setReportModalVisible(false);
      setIncidentNote('');
      loadTripDetail();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể báo sự cố. Vui lòng thử lại.');
    } finally {
      setReportingIncident(false);
    }
  };

  const handleConfirmAutoIncident = async () => {
    if (!activeConfirmIncident) return;
    const trimmed = confirmReason.trim();
    if (!trimmed || trimmed.length < 3) {
      Alert.alert('Lưu ý', 'Vui lòng nhập lý do giải trình cụ thể (tối thiểu 3 ký tự).');
      return;
    }
    try {
      setConfirmingIncident(true);
      await mobileApiClient.confirmAutoIncident(activeConfirmIncident.id, trimmed);
      Alert.alert('Thành công', 'Đã gửi xác nhận và giải trình sự cố.');
      setActiveConfirmIncident(null);
      setConfirmReason('');
      loadTripDetail();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể xác nhận sự cố. Vui lòng thử lại.');
    } finally {
      setConfirmingIncident(false);
    }
  };

  const tilemapKey =
    process.env.EXPO_PUBLIC_VIETMAP_TILEMAP_KEY ||
    '220bb293d40f7226e0c29c91469f1286c6ed486f7a07e745';

  const mapData = getTripMapSnapshot(trip);
  const mapHtml = useMemo(() => {
    const data = JSON.parse(mapData);
    if (!data) return '';
    const coordsJson = JSON.stringify(data.polylineGeometry ? decodePolyline(data.polylineGeometry) : []);
    const stopsJson = serializeMapScriptValue(data.stops);

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
          .student-marker { background: #059669; color: white; border: 2px solid white; border-radius: 50%; font-weight: bold; width: 26px; height: 26px; line-height: 22px; text-align: center; font-size: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
          ${childMapPinCss}
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([10.7769, 106.7009], 13);

          L.tileLayer('https://maps.vietmap.vn/tm/{z}/{x}/{y}@2x.png?apikey=${tilemapKey}', {
            maxZoom: 19
          }).addTo(map);

          var bounds = L.latLngBounds();
          var stops = ${stopsJson};
          ${childMapPinScript}

          stops.forEach(function(s) {
            var iconHtml = '<div class="student-marker">' + s.order + '</div>';
            var ownChildPin = s.isMyChild && s.studentId && (s.type === 'PICKUP' || s.type === 'DROPOFF');
            if (s.type === 'PARKING_START' || s.type === 'PARKING_END') {
              iconHtml = '<div class="depot-marker">P</div>';
            } else if (s.type === 'SCHOOL_ARRIVAL' || s.type === 'SCHOOL_DEPARTURE') {
              iconHtml = '<div class="school-marker">🏫</div>';
            } else if (ownChildPin) {
              iconHtml = window.createChildMapPin(s.studentId, s.name);
            }

            var icon = L.divIcon({ className: '', html: iconHtml,
              iconSize: ownChildPin ? [${childMapPinSize.width}, ${childMapPinSize.height}] : [28, 28],
              iconAnchor: ownChildPin ? [${childMapPinSize.width / 2}, ${childMapPinSize.height * 65 / 66}] : [14, 14],
              popupAnchor: ownChildPin ? [0, -${childMapPinSize.height - 5}] : [0, 0] });
            var marker = L.marker([s.lat, s.lng], { icon: icon }).addTo(map);
            if (ownChildPin && marker.getElement()) {
              marker.getElement().setAttribute('aria-label', (s.type === 'PICKUP' ? 'Điểm đón: ' : 'Điểm trả: ') + s.name);
            }
            marker.bindPopup('<b>' + s.name + '</b><br/>' + (s.eta ? 'Dự kiến: ' + s.eta + '<br/>' : '') + s.address);
            bounds.extend([s.lat, s.lng]);
          });

          var coords = ${coordsJson};
          if (coords && coords.length > 0) {
            var polyline = L.polyline(coords, { color: '#2563EB', weight: 5, opacity: 0.85 }).addTo(map);
            coords.forEach(function(c) { bounds.extend(c); });
          }

          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
          }
          var vehicle = null, traveledLine = null, remainingLine = null, recordedLayers = L.layerGroup().addTo(map);
          var isFollowing = false;
          map.on('dragstart', function() {
            if (isFollowing) {
              isFollowing = false;
              if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'FOLLOW_CHANGE', following: false }));
            }
          });
          window.setNavigation = function(n) {
            if (n.position) {
              if (!vehicle) vehicle = L.marker(n.position, {icon: L.divIcon({className:'',html:'<div class="school-marker">🚌</div>',iconSize:[30,30],iconAnchor:[15,15]})}).addTo(map);
              else vehicle.setLatLng(n.position);
              if (n.centerOnStart) {
                map.setView(n.position, Math.max(map.getZoom(), 16));
              } else if (isFollowing) {
                map.panTo(n.position);
              }
            } else if (vehicle) { map.removeLayer(vehicle); vehicle = null; }

            if (n.traveled && n.traveled.length > 1) {
              if (!traveledLine) traveledLine = L.polyline(n.traveled, {color:'#94A3B8',weight:6,opacity:0.9}).addTo(map);
              else traveledLine.setLatLngs(n.traveled);
            } else if (traveledLine) {
              map.removeLayer(traveledLine);
              traveledLine = null;
            }

            if (n.remaining && n.remaining.length > 1) {
              if (!remainingLine) remainingLine = L.polyline(n.remaining, {color:'#2563EB',weight:6,opacity:0.95}).addTo(map);
              else remainingLine.setLatLngs(n.remaining);
            } else if ((!n.traveled || n.traveled.length <= 1) && n.leg && n.leg.length > 1) {
              if (!remainingLine) remainingLine = L.polyline(n.leg, {color:'#2563EB',weight:6,opacity:0.95}).addTo(map);
              else remainingLine.setLatLngs(n.leg);
            } else if (remainingLine) {
              map.removeLayer(remainingLine);
              remainingLine = null;
            }

            if (typeof polyline !== 'undefined' && polyline) {
              if (n.hidePlanned || n.recorded) {
                if (map.hasLayer(polyline)) map.removeLayer(polyline);
              } else {
                if (!map.hasLayer(polyline)) polyline.addTo(map);
              }
            }
            recordedLayers.clearLayers();
            (n.parts || []).forEach(function(part) {
              if (part.length > 1) L.polyline(part, {color:'#059669',weight:5}).addTo(recordedLayers);
              else if (part.length) L.circleMarker(part[0], {radius:5,color:'#059669'}).addTo(recordedLayers);
            });
          };
          window.centerVehicle = function() { if (vehicle) map.panTo(vehicle.getLatLng()); };
          window.toggleFollow = function(follow) {
            isFollowing = (typeof follow === 'boolean') ? follow : !isFollowing;
            if (isFollowing && vehicle) map.setView(vehicle.getLatLng(), Math.max(map.getZoom(), 16));
            if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'FOLLOW_CHANGE', following: isFollowing }));
            return isFollowing;
          };
        </script>
      </body>
      </html>
    `;
  }, [mapData, tilemapKey]);
  const mapSource = useMemo(() => ({ html: mapHtml }), [mapHtml]);
  const historyParts = useMemo(() => recordedParts(history ?? []), [history]);
  const terminal = operationalState?.status === 'COMPLETED' || operationalState?.status === 'CANCELLED';
  const isDriverActiveNavigation = isDriver && !terminal && operationalState?.status === 'IN_PROGRESS';

  const fullRouteCoords = useMemo(() => {
    return trip?.polylineGeometry ? decodePolyline(trip.polylineGeometry) : [];
  }, [trip?.polylineGeometry]);

  const fullRouteCumulative = useMemo(() => {
    return fullRouteCoords.length >= 2 ? cumulativeDistances(fullRouteCoords) : [];
  }, [fullRouteCoords]);

  // Observer two-tone split: when vehicle is in progress and has latestPosition
  const observerSplit = useMemo(() => {
    if (isDriverActiveNavigation && engine.segment.length > 0) {
      return null; // Driver uses engine's active navigation segment
    }
    if (terminal || operationalState?.status !== 'IN_PROGRESS' || !navigation?.latestPosition || fullRouteCoords.length < 2) {
      return null;
    }
    const vehPos: Coordinate = [navigation.latestPosition.latitude, navigation.latestPosition.longitude];
    const proj = projectProgress(fullRouteCoords, fullRouteCumulative, vehPos, 0, Infinity);
    return splitSegment(fullRouteCoords, fullRouteCumulative, proj.progress);
  }, [isDriverActiveNavigation, engine.segment.length, terminal, operationalState?.status, navigation?.latestPosition, fullRouteCoords, fullRouteCumulative]);

  const hasActiveRoutingDisplay = (isDriverActiveNavigation && engine.segment.length > 0) || (observerSplit !== null);
  const hidePlanned = hasActiveRoutingDisplay
    ? !showPlanned
    : (terminal && !!history?.length && !showPlanned);

  const activeTraveled = isDriverActiveNavigation && engine.segment.length > 0
    ? engine.traveled
    : (observerSplit ? observerSplit.traveled : []);
  const activeRemaining = isDriverActiveNavigation && engine.segment.length > 0
    ? engine.remaining
    : (observerSplit ? observerSplit.remaining : []);
  const activeLeg = isDriverActiveNavigation && engine.segment.length > 0
    ? engine.segment
    : (observerSplit ? fullRouteCoords : []);

  const centerOnStart = !prevModeRef.current && !!engine.mode;
  useEffect(() => {
    prevModeRef.current = engine.mode;
  }, [engine.mode]);
  const mapUpdate = JSON.stringify({
    position: (!terminal && engine.position) || (navigation?.latestPosition ? [navigation.latestPosition.latitude, navigation.latestPosition.longitude] : null),
    traveled: terminal ? [] : activeTraveled,
    remaining: terminal ? [] : activeRemaining,
    leg: terminal ? [] : activeLeg,
    hidePlanned,
    recorded: terminal && !!history?.length && !showPlanned,
    parts: terminal && !showPlanned ? historyParts : [],
    centerOnStart,
  });
  const updateMap = useCallback(() => {
    webView.current?.injectJavaScript('window.setNavigation && window.setNavigation(' + mapUpdate + '); true;');
  }, [mapUpdate]);
  useEffect(updateMap, [updateMap]);
  const mapAvatars = serializeMapScriptValue(isParent ? linkedMapChildren.filter(child =>
    trip?.stops.some(stop => stop.isMyChild && stop.studentId === child.id)) : []);
  // A fresh successful read also retries an image that failed at the same URL.
  const updateMapAvatars = useCallback(() => {
    webView.current?.injectJavaScript('window.setChildMapAvatars && window.setChildMapAvatars(' + mapAvatars + '); true;');
  }, [mapAvatars, mapAvatarRevision]);
  useEffect(updateMapAvatars, [updateMapAvatars]);
  const handleMapLoad = useCallback(() => { updateMap(); updateMapAvatars(); }, [updateMap, updateMapAvatars]);

  // Operational Actions
  const handleMarkReady = () => {
    setConfirmModal({
      visible: true,
      title: 'Xác nhận sẵn sàng',
      message: 'Bạn xác nhận xe và các điều kiện đón học sinh đã sẵn sàng để khởi hành chuyến xe này?',
      confirmText: 'Xác nhận sẵn sàng',
      confirmBg: '#059669',
      onConfirm: async () => {
        try {
          await mutate(() => mobileApiClient.markAttendantReady(tripId));
          setConfirmModal(null);
        } catch (err: any) {
          Alert.alert('Lỗi', err?.message || 'Không thể xác nhận sẵn sàng');
        }
      },
    });
  };

  const handleStartTrip = () => {
    setConfirmModal({
      visible: true,
      title: 'Bắt đầu chuyến xe',
      message: 'Bạn có chắc chắn muốn bắt đầu chuyến xe này ngay bây giờ?',
      confirmText: 'Bắt đầu ngay',
      confirmBg: '#15803D',
      onConfirm: async () => {
        try {
          await mutate(() => mobileApiClient.startTrip(tripId));
          setConfirmModal(null);
          if (isDriver) {
            try {
              const freshNav = await navigationApi.state(tripId);
              setNavigation(freshNav);
              if (freshNav.testMode) {
                void engine.prepare(freshNav);
              } else {
                void engine.change('LIVE');
              }
            } catch {
              if (navigation?.testMode) {
                void engine.prepare();
              } else {
                void engine.change('LIVE');
              }
            }
          }
        } catch (err: any) {
          Alert.alert('Lỗi', err?.message || 'Không thể bắt đầu chuyến xe');
        }
      },
    });
  };

  const handleArriveAtSchool = () => {
    setConfirmModal({
      visible: true,
      title: 'Xác nhận đến trường',
      message: 'Bạn xác nhận xe đã đến cổng trường an toàn để mở xác nhận học sinh xuống xe?',
      confirmText: 'Xác nhận đến trường',
      confirmBg: '#0284C7',
      onConfirm: async () => {
        try {
          await mutate(() => mobileApiClient.arriveAtSchool(tripId));
          setConfirmModal(null);
        } catch (err: any) {
          Alert.alert('Lỗi', err?.message || 'Không thể xác nhận đến trường');
        }
      },
    });
  };

  const handleCompleteTrip = () => {
    const present = operationalState?.presentCount || 0;
    const absent = operationalState?.absentCount || 0;
    const alighted = operationalState?.alightedCount || 0;
    setConfirmModal({
      visible: true,
      title: 'Hoàn thành chuyến xe',
      message: `Bạn xác nhận hoàn thành chuyến xe này?\n\n• Có mặt: ${present} học sinh (Đã xuống xe: ${alighted})\n• Vắng mặt: ${absent} học sinh`,
      confirmText: 'Xác nhận hoàn thành',
      confirmBg: '#2563EB',
      onConfirm: async () => {
        try {
          await mutate(() => mobileApiClient.completeTrip(tripId));
          setConfirmModal(null);
        } catch (err: any) {
          Alert.alert('Lỗi', err?.message || 'Không thể hoàn thành chuyến xe');
        }
      },
    });
  };

  const handleMarkPresent = (student: TripAttendanceStudentItem) => {
    setConfirmModal({
      visible: true,
      title: 'Điểm danh có mặt',
      message: `Xác nhận học sinh ${student.fullName} (${student.studentCode}) có mặt trên xe?`,
      confirmText: 'Có mặt',
      confirmBg: '#059669',
      onConfirm: async () => {
        try {
          await mutate(() => mobileApiClient.updateAttendance(tripId, student.studentId, 'PRESENT'));
          setConfirmModal(null);
        } catch (err: any) {
          Alert.alert('Lỗi', err?.message || 'Không thể cập nhật điểm danh');
        }
      },
    });
  };

  const handleOpenAbsenceModal = (student: TripAttendanceStudentItem) => {
    setAbsenceModalStudent(student);
    setAbsenceReasonText(student.absenceReason || '');
  };

  const handleSubmitAbsence = async () => {
    if (!absenceModalStudent) return;
    const trimmedReason = absenceReasonText.trim();
    if (!trimmedReason) {
      Alert.alert('Yêu cầu bắt buộc', 'Vui lòng nhập lý do vắng mặt cho học sinh');
      return;
    }

    try {
      await mutate(() => mobileApiClient.updateAttendance(
        tripId,
        absenceModalStudent.studentId,
        'ABSENT',
        trimmedReason
      ));
      setAbsenceModalStudent(null);
      setAbsenceReasonText('');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể cập nhật vắng mặt');
    }
  };

  const handleResetUnmarked = (student: TripAttendanceStudentItem) => {
    setConfirmModal({
      visible: true,
      title: 'Hoàn tác điểm danh',
      message: `Đưa trạng thái điểm danh của học sinh ${student.fullName} về Chưa điểm danh?`,
      confirmText: 'Hoàn tác',
      confirmBg: '#475569',
      onConfirm: async () => {
        try {
          await mutate(() => mobileApiClient.updateAttendance(tripId, student.studentId, 'UNMARKED'));
          setConfirmModal(null);
        } catch (err: any) {
          Alert.alert('Lỗi', err?.message || 'Không thể hoàn tác điểm danh');
        }
      },
    });
  };

  const handleToggleAlighting = (student: TripAttendanceStudentItem, isAlighted: boolean) => {
    setConfirmModal({
      visible: true,
      title: isAlighted ? 'Xác nhận xuống xe' : 'Hoàn tác xuống xe',
      message: isAlighted
        ? `Xác nhận học sinh ${student.fullName} (${student.studentCode}) đã xuống xe an toàn?`
        : `Đưa trạng thái của học sinh ${student.fullName} về Chưa xuống xe?`,
      confirmText: isAlighted ? 'Đã xuống xe' : 'Hoàn tác',
      confirmBg: isAlighted ? '#0284C7' : '#475569',
      onConfirm: async () => {
        try {
          await mutate(() => mobileApiClient.updateAlighting(tripId, student.studentId, isAlighted));
          setConfirmModal(null);
        } catch (err: any) {
          Alert.alert('Lỗi', err?.message || 'Không thể cập nhật trạng thái xuống xe');
        }
      },
    });
  };

  // QR Scan handler
  const handleScanQr = async (code: string) => {
    if (!code || qrScanning || !canScanQr) return;
    const requestIdentity = identity;
    const requestGeneration = qrGeneration.current;
    try {
      setQrScanning(true);
      const res = await mobileApiClient.verifyQrAttendance(tripId, code.trim());
      if (identityRef.current !== requestIdentity || !accessAllowed.current || qrGeneration.current !== requestGeneration) return;
      setVerifiedStudent(res);
    } catch (err: any) {
      Alert.alert('Không hợp lệ', err?.message || 'Mã QR không thuộc danh sách học sinh của chuyến xe này');
    } finally {
      setQrScanning(false);
    }
  };

  const handleConfirmVerifiedQr = async () => {
    if (!verifiedStudent) return;
    try {
      await mutate(() => mobileApiClient.updateAttendance(tripId, verifiedStudent.studentId, 'PRESENT'));
      setVerifiedStudent(null);
      setQrModalVisible(false);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể cập nhật điểm danh từ QR');
    }
  };

  // Filter roster
  const filteredRoster = useMemo(() => {
    if (!searchQuery.trim()) return attendanceRoster;
    const q = searchQuery.toLowerCase().trim();
    return attendanceRoster.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.studentCode.toLowerCase().includes(q) ||
        s.addressText.toLowerCase().includes(q)
    );
  }, [attendanceRoster, searchQuery]);

  if (loading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#D97706" />
        <Text style={styles.loadingText}>Đang tải chi tiết chuyến xe...</Text>
      </View>
    );
  }

  if (error || !trip) {
    return (
      <View style={styles.container}>
        <AppHeader title="Chi tiết chuyến xe" onBack={() => router.back()} />

        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Không tìm thấy chuyến xe</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTripDetail}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const visibleStops = trip.stops.map(stop => {
    const child = operationalState?.children?.find(item => item.studentId === stop.studentId);
    return child ? { ...stop, attendanceStatus: child.attendanceStatus, absenceReason: child.absenceReason,
      attendanceMarkedAt: child.markedAt } : stop;
  });
  const isToSchool = trip.direction === 'TO_SCHOOL';
  const canScanQr = isBusAttendant && (isToSchool
    ? operationalState?.status === 'IN_PROGRESS' && !operationalState.isSchoolArrived
    : operationalState?.status === 'IN_PROGRESS' ||
      (operationalState?.status === 'SCHEDULED' && operationalState.isAttendantReady));
  const showBottomAction =
    isDriverOrAttendant &&
    operationalState?.status !== 'COMPLETED' &&
    operationalState?.status !== 'CANCELLED';

  const bottomActionOffset = showBottomAction ? FIXED_BOTTOM_ACTION_HEIGHT + insets.bottom : 0;

  const canReady = Boolean(operationalState?.canMarkReady ?? operationalState?.canAttendantReady);
  const canStart = Boolean(operationalState?.canStartTrip ?? operationalState?.canDriverStart);
  const canArriveAtSchool = Boolean(operationalState?.canArriveAtSchool);
  const canComplete = Boolean(operationalState?.canCompleteTrip ?? operationalState?.canDriverComplete);

  const readyReason = operationalState?.disabledReasons?.ready || operationalState?.readyDisabledReason;
  const startReason = operationalState?.disabledReasons?.start || operationalState?.startDisabledReason;
  const arriveReason = operationalState?.disabledReasons?.arriveAtSchool || operationalState?.arriveAtSchoolDisabledReason;
  const completeReason = operationalState?.disabledReasons?.complete || operationalState?.completeDisabledReason;

  const readyDisabledText =
    readyReason === 'ALREADY_READY'
      ? 'Đã xác nhận sẵn sàng'
      : readyReason === 'TOO_EARLY'
      ? 'Chưa đến giờ sẵn sàng (Mở trước 15p)'
      : 'Chưa đến giờ sẵn sàng';

  const startDisabledText =
    startReason === 'WAITING_FOR_ATTENDANT'
      ? 'Chờ giáo viên sẵn sàng'
      : startReason === 'EMPTY_ROSTER'
      ? 'Chuyến xe chưa có học sinh'
      : startReason === 'PENDING_BOARDING'
      ? `Còn ${operationalState?.unmarkedCount || 0} học sinh chưa lên xe`
      : startReason === 'TOO_EARLY'
      ? 'Chưa đến giờ bắt đầu (Mở trước 5p)'
      : 'Chưa thể bắt đầu';

  const arriveDisabledText =
    arriveReason === 'PENDING_BOARDING'
      ? `Còn ${operationalState?.unmarkedCount || 0} học sinh chưa điểm danh`
      : arriveReason === 'EMPTY_ROSTER'
      ? 'Chuyến xe chưa có học sinh'
      : 'Chưa thể đến trường';

  const completeDisabledText =
    completeReason === 'EMPTY_ROSTER'
      ? 'Chuyến xe chưa có học sinh'
      : completeReason === 'PENDING_ATTENDANCE'
      ? `Còn ${operationalState?.unmarkedCount || 0} học sinh chưa điểm danh`
      : completeReason === 'NOT_ARRIVED_AT_SCHOOL'
      ? 'Xe chưa xác nhận đến trường'
      : completeReason === 'STUDENTS_NOT_ALIGHTED'
      ? `Còn ${operationalState?.pendingAlightCount || 0} học sinh chưa xuống xe`
      : 'Chưa thể hoàn thành';

  return (
    <View style={styles.container}>
      {/* 1. Full Screen WebView Map (Memoized, strictly no reload on polling) */}
      <View style={StyleSheet.absoluteFill}>
        <WebView<object>
          ref={webView}
          source={mapSource}
          style={StyleSheet.absoluteFill}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scrollEnabled={false}
          onLoadEnd={handleMapLoad}
          onMessage={(event) => {
            try {
              const msg = JSON.parse(event.nativeEvent.data);
              if (msg.type === 'FOLLOW_CHANGE') setFollowing(!!msg.following);
            } catch {}
          }}
        />
      </View>

      <View style={{ position: 'absolute', top: insets.top + 64, left: 12, right: 12 }}>
        <TripNavigationControls
          canPublish={isDriver && (!!navigation?.canPublish || operationalState?.status === 'IN_PROGRESS') && !terminal}
          testMode={!!navigation?.testMode} mode={engine.mode} guidance={engine.guidance}
          message={engine.message} change={engine.change} joystick={engine.joystick}
          retry={engine.retry} canRetry={isDriver && !engine.segment.length && !terminal}
          speedKmh={engine.speedKmh}
          onIncreaseSpeed={engine.increaseSpeed}
          onDecreaseSpeed={engine.decreaseSpeed}
          freshness={navigation?.freshness}
          hasLocalPosition={isDriver && (!!engine.position || !!engine.mode)}
          targetName={trip?.stops.find(s => s.id === engine.targetStopId)?.studentName || trip?.stops.find(s => s.id === engine.targetStopId)?.addressText}
          historyLabel={terminal && history !== null ? history.length && !showPlanned ? 'Hành trình ghi nhận' : 'Tuyến dự kiến' : undefined}
          hasGaps={!showPlanned && historyParts.length > 1}
          showPlanned={showPlanned} selectPlan={terminal && history?.length ? setShowPlanned : undefined}
        />
      </View>
      {(engine.position || navigation?.latestPosition) && (
        <View style={{ position: 'absolute', top: insets.top + 12, right: 12, flexDirection: 'row', gap: 6 }}>
          {isDriverActiveNavigation && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={showPlanned ? 'Ẩn tuyến dự kiến' : 'Xem tuyến dự kiến'}
              onPress={() => setShowPlanned(s => !s)}
              style={{
                backgroundColor: showPlanned ? colors.primary : colors.surface,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: showPlanned ? colors.primary : colors.border,
              }}
            >
              <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 12 }}>{showPlanned ? 'Dự kiến' : 'Tham chiếu'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Căn giữa xe"
            onPress={() => webView.current?.injectJavaScript('window.centerVehicle && window.centerVehicle(); true;')}
            style={{
              backgroundColor: colors.surface,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 12 }}>Căn giữa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={following ? 'Hủy bám xe' : 'Bám theo xe'}
            onPress={() => webView.current?.injectJavaScript('window.toggleFollow && window.toggleFollow(); true;')}
            style={{
              backgroundColor: following ? colors.primary : colors.surface,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: following ? colors.primary : colors.border,
            }}
          >
            <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 12 }}>{following ? 'Đang bám' : 'Theo xe'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Floating Header (Back Button & Báo sự cố Button) */}
      <View
        pointerEvents="box-none"
        style={[
          styles.floatingHeader,
          {
            top: insets.top + 10,
            left: 16,
            right: 16,
          },
        ]}
      >
        <HeaderAction icon="arrow-back" label="Quay lại" onPress={() => router.back()} />

        {/* Báo sự cố Button (Only for assigned staff on SCHEDULED trips) */}
        {isDriverOrAttendant && (trip?.status === 'SCHEDULED' || incidentOptions?.canReport) && (
          <TouchableOpacity
            style={[
              styles.reportIncidentFloatingBtn,
              incidentOptions && !incidentOptions.canReport && styles.reportIncidentFloatingBtnDisabled,
            ]}
            onPress={() => {
              if (incidentOptions && !incidentOptions.canReport) {
                const reasonMap: Record<string, string> = {
                  ATTENDANT_ALREADY_READY: 'Giáo viên phụ xe đã xác nhận sẵn sàng khởi hành.',
                  INCIDENT_ALREADY_OPEN: 'Đang có báo cáo sự cố chưa được xử lý.',
                  TRIP_NOT_SCHEDULED: 'Chuyến xe đã bắt đầu hoặc không ở trạng thái chờ khởi hành.',
                  TOO_EARLY: `Chưa đến khung giờ báo sự cố (bắt đầu từ ${
                    incidentOptions.reportAvailableAt
                      ? new Date(incidentOptions.reportAvailableAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '15 phút trước giờ chạy'
                  }).`,
                  SCHEDULED_END_TIME_EXCEEDED: 'Chuyến xe đã quá giờ kết thúc dự kiến.',
                  NOT_ASSIGNED_DRIVER: 'Bạn không phải tài xế được phân công cho chuyến này.',
                  NOT_ASSIGNED_ATTENDANT: 'Bạn không phải phụ xe được phân công cho chuyến này.',
                  MISSING_SCHEDULE_TIMES: 'Chuyến xe chưa có thông tin giờ bắt đầu/kết thúc lịch trình.',
                };
                Alert.alert(
                  'Không thể báo sự cố',
                  reasonMap[incidentOptions.disabledReason || ''] ||
                    'Hiện tại chuyến xe chưa đủ điều kiện để báo sự cố.',
                );
                return;
              }
              setReportModalVisible(true);
            }}
            activeOpacity={0.85}
          >
            <Ionicons
              name="warning"
              size={15}
              color={incidentOptions && !incidentOptions.canReport ? '#94A3B8' : '#DC2626'}
            />
            <Text
              style={[
                styles.reportIncidentFloatingBtnText,
                incidentOptions && !incidentOptions.canReport && { color: '#94A3B8' },
              ]}
            >
              Báo sự cố
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bus Attendant Unconfirmed Incident Warning Banner */}
      {unconfirmedPendingIncident && (
        <View style={[styles.floatingWarningBanner, { top: insets.top + 60 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Ionicons name="warning" size={16} color="#B45309" />
            <Text style={styles.floatingWarningBannerText} numberOfLines={1}>
              Cần xác nhận: {unconfirmedPendingIncident.type === 'OFF_ROUTE' ? 'Lệch tuyến' : 'Trễ đón/trả'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.floatingWarningBannerBtn}
            onPress={() => setActiveConfirmIncident(unconfirmedPendingIncident)}
            activeOpacity={0.8}
          >
            <Text style={styles.floatingWarningBannerBtnText}>Giải trình</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 2. Persistent 2-State Draggable Bottom Sheet */}
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            height: sheetHeightAnim,
            bottom: bottomActionOffset,
            paddingBottom: showBottomAction ? 10 : insets.bottom + 10,
          },
        ]}
      >
        {/* Drag Handle & Header */}
        <View
          {...panResponder.panHandlers}
          style={styles.sheetHandleArea}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={isExpanded ? 'Thu gọn chi tiết' : 'Mở rộng chi tiết'}
        >
          <View style={styles.sheetHandle} />

          <View style={styles.collapsedHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={styles.sheetRouteName} numberOfLines={1}>
                  {trip.routeName}
                </Text>
                <View
                  style={[
                    styles.directionBadge,
                    isToSchool ? styles.directionToSchool : styles.directionToParking,
                  ]}
                >
                  <Text
                    style={[
                      styles.directionText,
                      isToSchool ? styles.directionTextToSchool : styles.directionTextToParking,
                    ]}
                  >
                    {isToSchool ? 'Chiều đi' : 'Chiều về'}
                  </Text>
                </View>

                {unconfirmedPendingIncident ? (
                  <TouchableOpacity
                    style={[
                      styles.incidentHeaderBadge,
                      { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5', borderWidth: 1 },
                    ]}
                    onPress={() => setActiveConfirmIncident(unconfirmedPendingIncident)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="alert-circle" size={12} color="#DC2626" />
                    <Text
                      style={[
                        styles.incidentHeaderBadgeText,
                        { color: '#DC2626', fontWeight: '700' },
                      ]}
                    >
                      Cần giải trình
                    </Text>
                  </TouchableOpacity>
                ) : tripIncidents.length > 0 ? (
                  <TouchableOpacity
                    style={styles.incidentHeaderBadge}
                    onPress={() => {
                      if (!isExpandedRef.current) {
                        animateTo(EXPANDED_HEIGHT);
                      }
                      setActiveTab('INCIDENTS');
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="warning" size={12} color="#DC2626" />
                    <Text style={styles.incidentHeaderBadgeText}>
                      {tripIncidents.length} sự cố
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <Text style={styles.sheetTimeText}>
                  {trip.scheduledStartTime} – {trip.scheduledEndTime} • {trip.schoolName} • {
                    { SCHEDULED: 'Chờ khởi hành', IN_PROGRESS: 'Đang chạy', COMPLETED: 'Đã hoàn thành', CANCELLED: 'Đã hủy' }[
                      operationalState?.status || trip.status
                    ]
                  }
              </Text>
            </View>

            <TouchableOpacity
              onPress={toggleSheet}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isExpanded ? 'chevron-down' : 'chevron-up'}
                size={22}
                color="#64748B"
                style={{ marginLeft: 8 }}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Expanded Content with Tabs */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Bus Attendant In-Sheet Warning Banner */}
            {unconfirmedPendingIncident && (
              <View style={styles.sheetWarningBanner}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Ionicons name="warning" size={16} color="#B45309" />
                  <Text style={styles.sheetWarningBannerText} numberOfLines={1}>
                    Cần xác nhận: {unconfirmedPendingIncident.type === 'OFF_ROUTE' ? 'Lệch tuyến' : 'Trễ đón/trả'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.sheetWarningBannerBtn}
                  onPress={() => setActiveConfirmIncident(unconfirmedPendingIncident)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.sheetWarningBannerBtnText}>Giải trình ngay</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Tab Switcher */}
            <View style={styles.tabBarWrapper}>
              {!isDriverOrAttendant ? (
                /* PARENT: Exactly 3 tabs, fixed width flex: 1, 100% visible on any screen without scrolling */
                <View style={styles.tabBarParent}>
                  <TouchableOpacity
                    onPress={() => setActiveTab('INFO')}
                    style={[
                      styles.tabButton,
                      styles.tabButtonParent,
                      activeTab === 'INFO' && styles.tabButtonActive,
                    ]}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={15}
                      color={activeTab === 'INFO' ? '#D97706' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.tabButtonText,
                        styles.tabButtonTextParent,
                        activeTab === 'INFO' && styles.tabButtonTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      Thông tin
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setActiveTab('STOPS')}
                    style={[
                      styles.tabButton,
                      styles.tabButtonParent,
                      activeTab === 'STOPS' && styles.tabButtonActive,
                    ]}
                  >
                    <Ionicons
                      name="location-outline"
                      size={15}
                      color={activeTab === 'STOPS' ? '#D97706' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.tabButtonText,
                        styles.tabButtonTextParent,
                        activeTab === 'STOPS' && styles.tabButtonTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      Điểm đón ({trip.stops?.length || 0})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setActiveTab('INCIDENTS')}
                    style={[
                      styles.tabButton,
                      styles.tabButtonParent,
                      activeTab === 'INCIDENTS' && styles.tabButtonActiveIncident,
                    ]}
                  >
                    <Ionicons
                      name="warning-outline"
                      size={15}
                      color={activeTab === 'INCIDENTS' ? '#DC2626' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.tabButtonText,
                        styles.tabButtonTextParent,
                        activeTab === 'INCIDENTS' && styles.tabButtonTextActive,
                        activeTab === 'INCIDENTS' && { color: '#DC2626' },
                      ]}
                      numberOfLines={1}
                    >
                      Sự cố ({tripIncidents.length})
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* DRIVER / ATTENDANT: Horizontally scrollable 4 tabs */
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.tabBar}
                >
                  <TouchableOpacity
                    onPress={() => setActiveTab('INFO')}
                    style={[styles.tabButton, activeTab === 'INFO' && styles.tabButtonActive]}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={15}
                      color={activeTab === 'INFO' ? '#D97706' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.tabButtonText,
                        activeTab === 'INFO' && styles.tabButtonTextActive,
                      ]}
                    >
                      Thông tin
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setActiveTab('STOPS')}
                    style={[styles.tabButton, activeTab === 'STOPS' && styles.tabButtonActive]}
                  >
                    <Ionicons
                      name="location-outline"
                      size={15}
                      color={activeTab === 'STOPS' ? '#D97706' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.tabButtonText,
                        activeTab === 'STOPS' && styles.tabButtonTextActive,
                      ]}
                    >
                      Điểm đón ({trip.stops?.length || 0})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setActiveTab('ATTENDANCE')}
                    style={[styles.tabButton, activeTab === 'ATTENDANCE' && styles.tabButtonActive]}
                  >
                    <Ionicons
                      name="checkbox-outline"
                      size={15}
                      color={activeTab === 'ATTENDANCE' ? '#D97706' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.tabButtonText,
                        activeTab === 'ATTENDANCE' && styles.tabButtonTextActive,
                      ]}
                    >
                      Điểm danh ({operationalState?.markedCount || 0}/{operationalState?.totalStudents || 0})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setActiveTab('INCIDENTS')}
                    style={[
                      styles.tabButton,
                      activeTab === 'INCIDENTS' && styles.tabButtonActiveIncident,
                    ]}
                  >
                    <Ionicons
                      name="warning-outline"
                      size={15}
                      color={activeTab === 'INCIDENTS' ? '#DC2626' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.tabButtonText,
                        activeTab === 'INCIDENTS' && styles.tabButtonTextActive,
                        activeTab === 'INCIDENTS' && { color: '#DC2626' },
                      ]}
                    >
                      Sự cố ({tripIncidents.length})
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>

            {/* TAB 1: THÔNG TIN */}
            {activeTab === 'INFO' && (
              <ScrollView style={styles.tabContentScroll} showsVerticalScrollIndicator={false}>
                {/* Xe */}
                <View style={styles.infoCard}>
                  <View style={styles.infoIconCircle}>
                    <Ionicons name="bus-outline" size={20} color="#D97706" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>Phương tiện đưa đón</Text>
                    <Text style={styles.infoTitle}>{trip.vehiclePlate || 'Chưa gán xe'}</Text>
                    <Text style={styles.infoSubtext}>
                      {trip.vehicleSeats} chỗ • {trip.vehicleBrand}
                    </Text>
                  </View>
                </View>

                {/* Tài xế */}
                <View style={styles.infoCard}>
                  <View style={styles.infoIconCircle}>
                    <Ionicons name="person-outline" size={20} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>Tài xế phụ trách</Text>
                    <Text style={styles.infoTitle}>{trip.driverName || 'Chưa gán tài xế'}</Text>
                    <View style={styles.contactPhoneRow}>
                      <Ionicons name="call-outline" size={14} color={colors.mutedText} accessible={false} />
                      <Text style={styles.contactPhoneLabel}>Số điện thoại</Text>
                      <Text
                        selectable
                        accessibilityLabel={`Số điện thoại tài xế: ${trip.driverPhone?.trim() || 'Chưa cập nhật'}`}
                        style={styles.contactPhoneValue}
                      >
                        {trip.driverPhone?.trim() || 'Chưa cập nhật'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Giáo viên */}
                <View style={styles.infoCard}>
                  <View style={styles.infoIconCircle}>
                    <Ionicons name="school-outline" size={20} color="#059669" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>Giáo viên phụ xe</Text>
                    <Text style={styles.infoTitle}>
                      {trip.busAttendantName || 'Chưa gán giáo viên'}
                    </Text>
                    <View style={styles.contactPhoneRow}>
                      <Ionicons name="call-outline" size={14} color={colors.mutedText} accessible={false} />
                      <Text style={styles.contactPhoneLabel}>Số điện thoại</Text>
                      <Text
                        selectable
                        accessibilityLabel={`Số điện thoại giáo viên phụ xe: ${trip.busAttendantPhone?.trim() || 'Chưa cập nhật'}`}
                        style={styles.contactPhoneValue}
                      >
                        {trip.busAttendantPhone?.trim() || 'Chưa cập nhật'}
                      </Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            )}

            {/* TAB 2: ĐIỂM ĐÓN (With Parent child absence reason display - D10) */}
            {activeTab === 'STOPS' && (
              <ScrollView style={styles.tabContentScroll} showsVerticalScrollIndicator={false}>
                {visibleStops.length > 0 ? (
                  visibleStops.map((stop, idx) => {
                    const isParking =
                      stop.stopType === 'PARKING_START' || stop.stopType === 'PARKING_END';
                    const isSchool =
                      stop.stopType === 'SCHOOL_ARRIVAL' || stop.stopType === 'SCHOOL_DEPARTURE';

                    return (
                      <View key={stop.id || idx} style={styles.stopCard}>
                        <View style={styles.stopOrderCircle}>
                          <Text style={styles.stopOrderText}>{stop.stopOrder}</Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <View style={styles.stopHeaderRow}>
                            <Text style={styles.stopName} numberOfLines={1}>
                              {isParking
                                ? 'Bãi xe trung tâm'
                                : isSchool
                                ? trip.schoolName
                                : stop.studentName || 'Điểm đón học sinh'}
                            </Text>

                            {stop.plannedArrivalTime ? (
                              <Text style={styles.stopEta}>{stop.plannedArrivalTime}</Text>
                            ) : null}
                          </View>

                          <Text style={styles.stopAddress} numberOfLines={2}>
                            {stop.addressText}
                          </Text>

                          {/* D10: Parent sees attendance status and absence reason for OWN child */}
                          {isParent && stop.isMyChild && (
                            <View style={styles.childAttendanceStatusBox}>
                              <Ionicons
                                name={
                                  stop.attendanceStatus === 'PRESENT'
                                    ? 'checkmark-circle'
                                    : stop.attendanceStatus === 'ABSENT'
                                    ? 'close-circle'
                                    : 'time-outline'
                                }
                                size={15}
                                color={
                                  stop.attendanceStatus === 'PRESENT'
                                    ? '#15803D'
                                    : stop.attendanceStatus === 'ABSENT'
                                    ? '#B91C1C'
                                    : '#B45309'
                                }
                              />
                              <Text
                                style={[
                                  styles.childAttendanceStatusText,
                                  {
                                    color:
                                      stop.attendanceStatus === 'PRESENT'
                                        ? '#15803D'
                                        : stop.attendanceStatus === 'ABSENT'
                                        ? '#B91C1C'
                                        : '#B45309',
                                  },
                                ]}
                              >
                                {stop.attendanceStatus === 'PRESENT'
                                  ? operationalState?.children?.find(child => child.studentId === stop.studentId)?.isAlighted
                                    ? 'Đã xuống xe an toàn'
                                    : 'Đã có mặt trên xe'
                                  : stop.attendanceStatus === 'ABSENT'
                                  ? `Vắng mặt: ${stop.absenceReason || 'Không có lý do'}`
                                  : 'Chưa điểm danh'}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.emptyStopsText}>Không có điểm dừng</Text>
                )}
              </ScrollView>
            )}

            {/* TAB 3: ĐIỂM DANH (Sub-tabs: Lên xe vs Xuống xe) */}
            {activeTab === 'ATTENDANCE' && isDriverOrAttendant && (
              <View style={{ flex: 1 }}>
                {/* Sub Tab Switcher: Lên xe / Xuống xe */}
                <View style={styles.subTabBar}>
                  <TouchableOpacity
                    style={[
                      styles.subTabButton,
                      attendanceSubTab === 'boarding' && styles.subTabButtonActive,
                    ]}
                    onPress={() => setAttendanceSubTab('boarding')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.subTabButtonText,
                        attendanceSubTab === 'boarding' && styles.subTabButtonTextActive,
                      ]}
                    >
                      Lên xe ({operationalState?.markedCount || 0}/{operationalState?.totalStudents || 0})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.subTabButton,
                      attendanceSubTab === 'alighting' && styles.subTabButtonActive,
                    ]}
                    onPress={() => setAttendanceSubTab('alighting')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.subTabButtonText,
                        attendanceSubTab === 'alighting' && styles.subTabButtonTextActive,
                      ]}
                    >
                      Xuống xe ({operationalState?.alightedCount || 0}/{operationalState?.presentCount || 0})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* SUB-TAB 1: LÊN XE (BOARDING) */}
                {attendanceSubTab === 'boarding' && (
                  <View style={{ flex: 1 }}>
                    {/* Header with progress & QR scanner launcher */}
                    <View style={styles.attendanceHeaderBar}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.attendanceProgressText}>
                          Tiến độ lên xe: {operationalState?.markedCount || 0}/
                          {operationalState?.totalStudents || 0} học sinh
                        </Text>
                        <View style={styles.progressBarBg}>
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                width: `${
                                  operationalState?.totalStudents
                                    ? Math.round(
                                        ((operationalState.markedCount || 0) /
                                          operationalState.totalStudents) *
                                          100
                                      )
                                    : 0
                                }%`,
                              },
                            ]}
                          />
                        </View>
                      </View>

                      {/* QR Scan Button (Bus Attendant only) */}
                      {isBusAttendant && (
                        <TouchableOpacity
                          style={[styles.qrHeaderBtn, !canScanQr && styles.btnDisabled]}
                          disabled={!canScanQr}
                          onPress={async () => {
                            const version = qrGeneration.current;
                            if (!cameraPermission?.granted) {
                              await requestCameraPermission();
                            }
                            if (version !== qrGeneration.current || !accessAllowed.current) return;
                            setQrModalVisible(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="qr-code-outline" size={16} color="#1E293B" />
                          <Text style={styles.qrHeaderBtnText}>Quét QR</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Roster Scroll List */}
                    <KeyboardScrollView style={styles.tabContentScroll} showsVerticalScrollIndicator={false}>
                      {/* Search Box */}
                      <View style={styles.searchBox}>
                        <Ionicons name="search" size={16} color="#94A3B8" />
                        <TextInput
                          style={styles.searchInput}
                          placeholder="Tìm theo tên hoặc mã học sinh..."
                          placeholderTextColor="#94A3B8"
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                        />
                        {searchQuery ? (
                          <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={16} color="#94A3B8" />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                      {filteredRoster.length > 0 ? (
                        filteredRoster.map((student) => {
                          const isUnmarked = student.status === 'UNMARKED';
                          const isPresent = student.status === 'PRESENT';
                          const isAbsent = student.status === 'ABSENT';
                          const canBoard = isToSchool
                            ? operationalState?.status === 'IN_PROGRESS'
                            : (operationalState?.status === 'SCHEDULED' && operationalState?.isAttendantReady) ||
                              operationalState?.status === 'IN_PROGRESS';
                          const canReset = isToSchool
                            ? !operationalState?.isSchoolArrived
                            : operationalState?.status === 'SCHEDULED';

                          return (
                            <View key={student.studentId} style={styles.rosterCard}>
                              {/* Student Header */}
                              <View style={styles.rosterCardHeader}>
                                <View style={styles.rosterOrderCircle}>
                                  <Text style={styles.rosterOrderText}>{student.stopOrder}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.rosterStudentName}>{student.fullName}</Text>
                                  <Text style={styles.rosterStudentCode}>
                                    {student.studentCode} • Dự kiến: {student.plannedArrivalTime || '—'}
                                  </Text>
                                </View>
                                <View
                                  style={[
                                    styles.rosterStatusBadge,
                                    isPresent
                                      ? styles.badgePresent
                                      : isAbsent
                                      ? styles.badgeAbsent
                                      : styles.badgeUnmarked,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.rosterStatusText,
                                      isPresent
                                        ? styles.textPresent
                                        : isAbsent
                                        ? styles.textAbsent
                                        : styles.textUnmarked,
                                    ]}
                                  >
                                    {isPresent ? 'Có mặt' : isAbsent ? 'Vắng mặt' : 'Chưa điểm danh'}
                                  </Text>
                                </View>
                              </View>

                              <Text style={styles.rosterAddress} numberOfLines={1}>
                                {student.addressText}
                              </Text>

                              {/* Absence reason display if absent */}
                              {isAbsent && student.absenceReason ? (
                                <View style={styles.rosterAbsenceReason}>
                                  <Text style={styles.rosterAbsenceReasonLabel}>Lý do:</Text>
                                  <Text style={styles.rosterAbsenceReasonText}>
                                    {student.absenceReason}
                                  </Text>
                                </View>
                              ) : null}

                              {/* Mutation Buttons (Bus Attendant only) */}
                              {isBusAttendant && (
                                <View style={styles.rosterActionRow}>
                                  {isUnmarked ? (
                                    <>
                                      <TouchableOpacity
                                        style={[
                                          styles.actionBtnPresent,
                                          !canBoard && styles.btnDisabled,
                                        ]}
                                        disabled={!canBoard}
                                        onPress={() => handleMarkPresent(student)}
                                      >
                                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                        <Text style={styles.actionBtnTextLight}>Có mặt</Text>
                                      </TouchableOpacity>

                                      <TouchableOpacity
                                        style={[
                                          styles.actionBtnAbsent,
                                          !canBoard && styles.btnDisabled,
                                        ]}
                                        disabled={!canBoard}
                                        onPress={() => handleOpenAbsenceModal(student)}
                                      >
                                        <Ionicons name="close" size={14} color="#FFFFFF" />
                                        <Text style={styles.actionBtnTextLight}>Vắng mặt</Text>
                                      </TouchableOpacity>
                                    </>
                                  ) : isPresent ? (
                                    <>
                                      <TouchableOpacity
                                        style={[
                                          styles.actionBtnSwitch,
                                          (!canBoard || Boolean(student.isAlighted)) && styles.btnDisabled,
                                        ]}
                                        disabled={!canBoard || Boolean(student.isAlighted)}
                                        onPress={() => handleOpenAbsenceModal(student)}
                                      >
                                        <Text style={styles.actionBtnTextDark}>Đổi vắng</Text>
                                      </TouchableOpacity>

                                      <TouchableOpacity
                                        style={[
                                          styles.actionBtnReset,
                                          (!canBoard || !canReset) && styles.btnDisabled,
                                        ]}
                                        disabled={!canBoard || !canReset}
                                        onPress={() => handleResetUnmarked(student)}
                                      >
                                        <Text style={styles.actionBtnTextDark}>Hoàn tác</Text>
                                      </TouchableOpacity>
                                    </>
                                  ) : (
                                    <>
                                      <TouchableOpacity
                                        style={[
                                          styles.actionBtnSwitch,
                                          !canBoard && styles.btnDisabled,
                                        ]}
                                        disabled={!canBoard}
                                        onPress={() => handleMarkPresent(student)}
                                      >
                                        <Text style={styles.actionBtnTextDark}>Đổi có mặt</Text>
                                      </TouchableOpacity>

                                      <TouchableOpacity
                                        style={[
                                          styles.actionBtnReset,
                                          (!canBoard || !canReset) && styles.btnDisabled,
                                        ]}
                                        disabled={!canBoard || !canReset}
                                        onPress={() => handleResetUnmarked(student)}
                                      >
                                        <Text style={styles.actionBtnTextDark}>Hoàn tác</Text>
                                      </TouchableOpacity>
                                    </>
                                  )}
                                </View>
                              )}
                            </View>
                          );
                        })
                      ) : (
                        <Text style={styles.emptyStopsText}>Không tìm thấy học sinh</Text>
                      )}
                    </KeyboardScrollView>
                  </View>
                )}

                {/* SUB-TAB 2: XUỐNG XE (ALIGHTING) */}
                {attendanceSubTab === 'alighting' && (
                  <View style={{ flex: 1 }}>
                    {/* Alighting Progress Bar */}
                    <View style={styles.attendanceHeaderBar}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.attendanceProgressText}>
                          Tiến độ xuống xe: {operationalState?.alightedCount || 0}/
                          {operationalState?.presentCount || 0} học sinh có mặt
                        </Text>
                        <View style={styles.progressBarBg}>
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                backgroundColor: '#0284C7',
                                width: `${
                                  operationalState?.presentCount
                                    ? Math.round(
                                        ((operationalState.alightedCount || 0) /
                                          operationalState.presentCount) *
                                          100
                                      )
                                    : 0
                                }%`,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>

                    {/* Notice if TO_SCHOOL and not yet arrived */}
                    {isToSchool && !operationalState?.isSchoolArrived && (
                      <View style={styles.alightingNoticeCard}>
                        <Ionicons name="time-outline" size={16} color="#D97706" />
                        <Text style={styles.alightingNoticeText}>
                          Chờ tài xế xác nhận xe đến trường để mở xác nhận học sinh xuống xe.
                        </Text>
                      </View>
                    )}

                    {/* Scroll List of PRESENT students only */}
                    <ScrollView style={styles.tabContentScroll} showsVerticalScrollIndicator={false}>
                      {filteredRoster.filter((s) => s.status === 'PRESENT').length > 0 ? (
                        filteredRoster
                          .filter((s) => s.status === 'PRESENT')
                          .map((student) => {
                            const isAlighted = Boolean(student.isAlighted);
                            const canAlight = operationalState?.status === 'IN_PROGRESS' &&
                              (!isToSchool || Boolean(operationalState?.isSchoolArrived));

                            return (
                              <View key={student.studentId} style={styles.rosterCard}>
                                <View style={styles.rosterCardHeader}>
                                  <View style={styles.rosterOrderCircle}>
                                    <Text style={styles.rosterOrderText}>{student.stopOrder}</Text>
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.rosterStudentName}>{student.fullName}</Text>
                                    <Text style={styles.rosterStudentCode}>
                                      {student.studentCode} • {student.addressText}
                                    </Text>
                                  </View>
                                  <View
                                    style={[
                                      styles.rosterStatusBadge,
                                      isAlighted ? styles.badgeAlighted : styles.badgeNotAlighted,
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.rosterStatusText,
                                        isAlighted ? styles.textAlighted : styles.textNotAlighted,
                                      ]}
                                    >
                                      {isAlighted ? 'Đã xuống xe' : 'Chưa xuống xe'}
                                    </Text>
                                  </View>
                                </View>

                                {/* Action Buttons for Alighting */}
                                {isBusAttendant && (
                                  <View style={styles.rosterActionRow}>
                                    {!isAlighted ? (
                                      <TouchableOpacity
                                        style={[
                                          styles.actionBtnAlight,
                                          !canAlight && styles.btnDisabled,
                                        ]}
                                        disabled={!canAlight}
                                        onPress={() => handleToggleAlighting(student, true)}
                                        activeOpacity={0.85}
                                      >
                                        <Ionicons name="walk-outline" size={15} color="#FFFFFF" />
                                        <Text style={styles.actionBtnTextLight}>Xác nhận xuống xe</Text>
                                      </TouchableOpacity>
                                    ) : (
                                      <TouchableOpacity
                                        style={[styles.actionBtnReset, !canAlight && styles.btnDisabled]}
                                        disabled={!canAlight}
                                        onPress={() => handleToggleAlighting(student, false)}
                                        activeOpacity={0.85}
                                      >
                                        <Text style={styles.actionBtnTextDark}>Hoàn tác</Text>
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                )}
                              </View>
                            );
                          })
                      ) : (
                        <Text style={styles.emptyStopsText}>Chưa có học sinh nào có mặt trên xe</Text>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {/* TAB 4: SỰ CỐ VẬN HÀNH */}
            {activeTab === 'INCIDENTS' && (
              <ScrollView style={styles.tabContentScroll} showsVerticalScrollIndicator={false}>
                {tripIncidents.length === 0 ? (
                  <View style={styles.emptyIncidentsBox}>
                    <Ionicons name="checkmark-circle-outline" size={40} color="#10B981" />
                    <Text style={styles.emptyIncidentsTitle}>Không có sự cố</Text>
                    <Text style={styles.emptyIncidentsSubtitle}>
                      Chuyến xe này không ghi nhận sự cố vận hành nào.
                    </Text>
                  </View>
                ) : (
                  tripIncidents.map((incident) => {
                    const isAttendantMissing = incident.type === 'ATTENDANT_MISSING';
                    const isDriverMissing = incident.type === 'DRIVER_MISSING';
                    const isOffRoute = incident.type === 'OFF_ROUTE';
                    const isLateStop = incident.type === 'LATE_STOP';

                    const typeBadgeText = isAttendantMissing
                      ? 'Vắng phụ xe'
                      : isDriverMissing
                      ? 'Vắng tài xế'
                      : isOffRoute
                      ? 'Lệch tuyến'
                      : isLateStop
                      ? 'Trễ đón/trả'
                      : incident.type;

                    const typeBadgeBg = isOffRoute ? '#FEE2E2' : isLateStop ? '#FFEDD5' : '#FEF3C7';
                    const typeBadgeColor = isOffRoute ? '#DC2626' : isLateStop ? '#C2410C' : '#B45309';

                    const isPendingConfirmation =
                      incident.status === 'WAITING_CONFIRMATION' ||
                      incident.status === ('PENDING_CONFIRMATION' as any);
                    const isClosed =
                      incident.status === 'CLOSED' ||
                      incident.status === ('CLOSED_WITHOUT_CONFIRMATION' as any);

                    const statusBadgeText =
                      incident.status === 'WAITING_ASSIGNMENT'
                        ? 'Chờ phân công'
                        : isPendingConfirmation
                        ? 'Chờ xác nhận'
                        : incident.status === 'RESOLVED'
                        ? 'Đã giải quyết'
                        : incident.status === 'CONFIRMED'
                        ? 'Đã xác nhận'
                        : isClosed
                        ? 'Đóng tự động'
                        : incident.status;

                    const statusBadgeBg =
                      incident.status === 'WAITING_ASSIGNMENT'
                        ? '#FEF3C7'
                        : isPendingConfirmation
                        ? '#EFF6FF'
                        : incident.status === 'RESOLVED' || incident.status === 'CONFIRMED'
                        ? '#DCFCE7'
                        : '#F1F5F9';

                    const statusBadgeColor =
                      incident.status === 'WAITING_ASSIGNMENT'
                        ? '#B45309'
                        : isPendingConfirmation
                        ? '#1D4ED8'
                        : incident.status === 'RESOLVED' || incident.status === 'CONFIRMED'
                        ? '#15803D'
                        : '#64748B';

                    return (
                      <View key={incident.id} style={styles.incidentTripCard}>
                        <View style={styles.incidentCardHeader}>
                          <View style={[styles.badgePill, { backgroundColor: typeBadgeBg }]}>
                            <Ionicons name="warning-outline" size={13} color={typeBadgeColor} />
                            <Text style={[styles.badgePillText, { color: typeBadgeColor }]}>
                              {typeBadgeText}
                            </Text>
                          </View>

                          <View style={[styles.badgePill, { backgroundColor: statusBadgeBg }]}>
                            <Text style={[styles.badgePillText, { color: statusBadgeColor }]}>
                              {statusBadgeText}
                            </Text>
                          </View>
                        </View>

                        {!isParent && incident.description ? (
                          <Text style={styles.incidentDesc}>{incident.description}</Text>
                        ) : null}

                        {!isParent && incident.contextData && (
                          <View style={styles.incidentContextBox}>
                            {incident.contextData.recordedDistanceMeters !== undefined && (
                              <Text style={styles.incidentContextItem}>
                                • Khoảng cách lệch: {Math.round(incident.contextData.recordedDistanceMeters)}m
                              </Text>
                            )}
                            {incident.contextData.recordedDelayMinutes !== undefined && (
                              <Text style={styles.incidentContextItem}>
                                • Dự kiến trễ: {Math.round(incident.contextData.recordedDelayMinutes)} phút
                              </Text>
                            )}
                          </View>
                        )}

                        {!isParent && incident.resolutionType && (
                          <View style={styles.incidentResBox}>
                            <Text style={styles.incidentResLabel}>
                              Xử lý: {
                                incident.resolutionType === 'ARRIVED'
                                  ? 'Nhân sự đã có mặt'
                                  : incident.resolutionType === 'REPLACED'
                                  ? `Thay thế: ${incident.replacementUserName || 'Người khác'}`
                                  : incident.resolutionType === 'CANCELLED_TRIP'
                                  ? 'Đã hủy chuyến'
                                  : incident.resolutionType === 'CONFIRMED'
                                  ? 'Phụ xe đã giải trình'
                                  : incident.resolutionType
                              }
                            </Text>
                            {incident.resolutionNote ? (
                              <Text style={styles.incidentResNote}>
                                Ghi chú: {incident.resolutionNote}
                              </Text>
                            ) : null}
                          </View>
                        )}

                        <View style={styles.incidentCardFooter}>
                          <Text style={styles.incidentTimeText}>
                            {new Date(incident.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })} • {new Date(incident.createdAt).toLocaleDateString('vi-VN')}
                          </Text>

                          {isBusAttendant && isPendingConfirmation && (
                            <TouchableOpacity
                              style={styles.incidentConfirmSmallBtn}
                              onPress={() => setActiveConfirmIncident(incident)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.incidentConfirmSmallBtnText}>Giải trình ngay</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        )}
      </Animated.View>

      {/* 3. Fixed Bottom Action Area (Pinned to screen bottom, respects safe area) */}
      {showBottomAction && (
        <View style={[styles.fixedBottomActionContainer, { paddingBottom: insets.bottom + 8 }]}>
          {isBusAttendant ? (
            /* BUS ATTENDANT BOTTOM ACTION */
            operationalState?.status === 'SCHEDULED' ? (
              operationalState.isAttendantReady ? (
                <View style={styles.readyBadgeRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#059669" />
                  <Text style={styles.readyBadgeText}>
                    Bạn đã xác nhận sẵn sàng khởi hành
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.primaryActionBtn,
                    styles.bgReady,
                    !canReady && styles.btnDisabled,
                  ]}
                  disabled={!canReady}
                  onPress={handleMarkReady}
                  activeOpacity={0.85}
                >
                  <Ionicons name="hand-right-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryActionBtnText}>
                    {canReady ? 'Xác nhận sẵn sàng' : readyDisabledText}
                  </Text>
                </TouchableOpacity>
              )
            ) : null
          ) : isDriver ? (
            /* DRIVER BOTTOM ACTION */
            operationalState?.status === 'SCHEDULED' ? (
              <TouchableOpacity
                style={[
                  styles.primaryActionBtn,
                  styles.bgStart,
                  !canStart && styles.btnDisabled,
                ]}
                disabled={!canStart}
                onPress={handleStartTrip}
                activeOpacity={0.85}
              >
                <Ionicons name="play" size={18} color="#FFFFFF" />
                <Text style={styles.primaryActionBtnText}>
                  {canStart ? 'Bắt đầu chuyến xe' : startDisabledText}
                </Text>
              </TouchableOpacity>
            ) : operationalState?.status === 'IN_PROGRESS' ? (
              isToSchool && !operationalState?.isSchoolArrived ? (
                <TouchableOpacity
                  style={[
                    styles.primaryActionBtn,
                    styles.bgArrive,
                    !canArriveAtSchool && styles.btnDisabled,
                  ]}
                  disabled={!canArriveAtSchool}
                  onPress={handleArriveAtSchool}
                  activeOpacity={0.85}
                >
                  <Ionicons name="school-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryActionBtnText}>
                    {canArriveAtSchool ? 'Xác nhận đến trường' : arriveDisabledText}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.primaryActionBtn,
                    styles.bgComplete,
                    !canComplete && styles.btnDisabled,
                  ]}
                  disabled={!canComplete}
                  onPress={handleCompleteTrip}
                  activeOpacity={0.85}
                >
                  <Ionicons name="flag-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryActionBtnText}>
                    {canComplete ? 'Hoàn thành chuyến xe' : completeDisabledText}
                  </Text>
                </TouchableOpacity>
              )
            ) : null
          ) : null}
        </View>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <Modal transparent animationType="fade" visible={confirmModal.visible}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{confirmModal.title}</Text>
              <Text style={styles.modalMessage}>{confirmModal.message}</Text>
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setConfirmModal(null)}
                >
                  <Text style={styles.modalCancelBtnText}>Hủy bỏ</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmBtn, { backgroundColor: confirmModal.confirmBg }]}
                  onPress={confirmModal.onConfirm}
                >
                  <Text style={styles.modalConfirmBtnText}>{confirmModal.confirmText}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Absence Reason Modal */}
      {absenceModalStudent && (
        <Modal transparent animationType="fade" visible={Boolean(absenceModalStudent)}>
          <KeyboardScrollView
            style={[styles.modalOverlay, { alignItems: undefined, justifyContent: undefined }]}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Lý do vắng mặt</Text>
              <Text style={styles.modalSubtitle}>
                Học sinh: {absenceModalStudent.fullName} ({absenceModalStudent.studentCode})
              </Text>
              <TextInput
                style={styles.absenceInput}
                placeholder="Nhập lý do vắng mặt (VD: Phụ huynh báo ốm)..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={absenceReasonText}
                onChangeText={setAbsenceReasonText}
              />
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => {
                    setAbsenceModalStudent(null);
                    setAbsenceReasonText('');
                  }}
                >
                  <Text style={styles.modalCancelBtnText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmBtn, { backgroundColor: '#DC2626' }]}
                  onPress={handleSubmitAbsence}
                >
                  <Text style={styles.modalConfirmBtnText}>Xác nhận vắng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardScrollView>
        </Modal>
      )}

      {/* QR Scanner Modal (D08: Student.code QR scanner) */}
      <Modal transparent animationType="slide" visible={qrModalVisible}>
        <KeyboardScrollView style={styles.qrModalContainer} contentContainerStyle={{ flexGrow: 1 }}>
          <View style={[styles.qrModalHeader, { paddingTop: insets.top + 10 }]}>
            <Text style={styles.qrModalTitle}>Quét thẻ học sinh</Text>
            <TouchableOpacity
              onPress={() => {
                setQrModalVisible(false);
                setVerifiedStudent(null);
              }}
              style={styles.qrModalCloseBtn}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {verifiedStudent ? (
            <View style={styles.qrVerifyCard}>
              <Ionicons name="checkmark-circle" size={48} color="#059669" />
              <Text style={styles.qrVerifyTitle}>Học sinh hợp lệ</Text>
              <Text style={styles.qrVerifyName}>{verifiedStudent.fullName}</Text>
              <Text style={styles.qrVerifyCode}>Mã: {verifiedStudent.studentCode}</Text>
              <Text style={styles.qrVerifyAddress} numberOfLines={2}>
                Trạm {verifiedStudent.stopOrder}: {verifiedStudent.addressText}
              </Text>

              <View style={styles.qrVerifyBtnRow}>
                <TouchableOpacity
                  style={styles.qrVerifyRetryBtn}
                  onPress={() => setVerifiedStudent(null)}
                >
                  <Text style={styles.qrVerifyRetryText}>Quét lại</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.qrVerifyConfirmBtn}
                  onPress={handleConfirmVerifiedQr}
                >
                  <Text style={styles.qrVerifyConfirmText}>Xác nhận có mặt</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.qrCameraContainer}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={(result) => {
                  if (result.data) {
                    handleScanQr(result.data);
                  }
                }}
              />
              <View style={styles.qrOverlayFrame}>
                <View style={styles.qrTargetBox} />
                <Text style={styles.qrGuideText}>Căn chỉnh mã QR học sinh vào giữa khung</Text>
              </View>

              {/* Manual Input Fallback */}
              <View style={styles.qrManualBox}>
                <TextInput
                  style={styles.qrManualInput}
                  placeholder="Hoặc nhập mã học sinh (VD: HS-2026-0001)..."
                  placeholderTextColor="#94A3B8"
                  value={qrManualCode}
                  onChangeText={setQrManualCode}
                />
                <TouchableOpacity
                  style={styles.qrManualSubmitBtn}
                  onPress={() => handleScanQr(qrManualCode)}
                >
                  <Text style={styles.qrManualSubmitText}>Kiểm tra</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </KeyboardScrollView>
      </Modal>

      {/* Report Incident Modal */}
      <Modal
        transparent
        animationType="fade"
        visible={reportModalVisible}
        onRequestClose={() => {
          Keyboard.dismiss();
          setReportModalVisible(false);
          setIncidentNote('');
        }}
      >
        <KeyboardScrollView
          style={[styles.modalOverlay, { alignItems: undefined, justifyContent: undefined }]}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={[styles.badgePill, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="warning" size={14} color="#DC2626" />
                <Text style={[styles.badgePillText, { color: '#DC2626' }]}>
                  Báo sự cố vận hành
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setReportModalVisible(false);
                  setIncidentNote('');
                }}
                disabled={reportingIncident}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Pinned Trip Info */}
            <View style={styles.pinnedTripBox}>
              <Text style={styles.pinnedTripTitle}>{trip?.routeName}</Text>
              <Text style={styles.pinnedTripSub}>
                {trip?.serviceDate} • {trip?.vehiclePlate || '—'} • {isToSchool ? 'Chiều đi' : 'Chiều về'}
              </Text>
            </View>

            {/* Incident Type display */}
            <View style={styles.incidentTargetBox}>
              <Text style={styles.incidentTargetLabel}>Loại sự cố báo cáo:</Text>
              <Text style={styles.incidentTargetValue}>
                {isDriver ? 'Vắng phụ xe (Giáo viên)' : 'Vắng tài xế'}
              </Text>
              {(incidentOptions?.expectedAssignee || (isDriver ? trip?.busAttendantName : trip?.driverName)) && (
                <Text style={styles.incidentTargetSub}>
                  Nhân sự dự kiến: {incidentOptions?.expectedAssignee?.fullName || (isDriver ? trip?.busAttendantName : trip?.driverName)}
                </Text>
              )}
            </View>

            {/* Note input Header with Dismiss Button */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.incidentTargetLabel}>Ghi chú thêm:</Text>
              <TouchableOpacity
                onPress={Keyboard.dismiss}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.keyboardDismissBtn}
              >
                <Ionicons name="chevron-down-outline" size={13} color="#64748B" />
                <Text style={styles.keyboardDismissBtnText}>Ẩn phím</Text>
              </TouchableOpacity>
            </View>

            {/* Note input */}
            <TextInput
              style={styles.incidentNoteInput}
              placeholder="Nhập ghi chú chi tiết về tình huống (không bắt buộc)..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              value={incidentNote}
              onChangeText={setIncidentNote}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  Keyboard.dismiss();
                  setReportModalVisible(false);
                  setIncidentNote('');
                }}
                disabled={reportingIncident}
              >
                <Text style={styles.modalCancelBtnText}>Hủy bỏ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: '#DC2626' }]}
                onPress={() => {
                  Keyboard.dismiss();
                  handleReportIncident();
                }}
                disabled={reportingIncident}
              >
                {reportingIncident ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Gửi báo cáo</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardScrollView>
      </Modal>

      {/* Bus Attendant Auto Incident Confirmation Popup */}
      <Modal
        transparent
        animationType="fade"
        visible={Boolean(activeConfirmIncident)}
        onRequestClose={() => {
          Keyboard.dismiss();
          setActiveConfirmIncident(null);
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
                  {activeConfirmIncident?.type === 'OFF_ROUTE'
                    ? 'Xác nhận lệch tuyến'
                    : 'Xác nhận trễ đón/trả'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setActiveConfirmIncident(null);
                  setConfirmReason('');
                }}
                disabled={confirmingIncident}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.confirmModalTitle}>Giải trình sự cố tự động</Text>
            <Text style={styles.confirmModalDesc}>
              {activeConfirmIncident?.description ||
                'Hệ thống phát hiện dấu hiệu bất thường trong quá trình di chuyển.'}
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
              placeholder="VD: Tuyến đường thi công phải đi vòng, tắc đường đột xuất..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              value={confirmReason}
              onChangeText={setConfirmReason}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalLaterBtn}
                onPress={() => {
                  Keyboard.dismiss();
                  if (activeConfirmIncident) {
                    setDismissedPendingIncidentIds((prev) => new Set(prev).add(activeConfirmIncident.id));
                  }
                  setActiveConfirmIncident(null);
                  setConfirmReason('');
                }}
                disabled={confirmingIncident}
              >
                <Text style={styles.modalLaterBtnText}>Để sau</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  { backgroundColor: '#059669' },
                  (!confirmReason.trim() || confirmReason.trim().length < 3) && styles.btnDisabled,
                ]}
                onPress={() => {
                  Keyboard.dismiss();
                  handleConfirmAutoIncident();
                }}
                disabled={confirmingIncident || !confirmReason.trim() || confirmReason.trim().length < 3}
              >
                {confirmingIncident ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Xác nhận & Gửi</Text>
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
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#1E293B',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  floatingHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  reportIncidentFloatingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  reportIncidentFloatingBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  reportIncidentFloatingBtnDisabled: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  floatingWarningBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  floatingWarningBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B45309',
  },
  floatingWarningBannerBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  floatingWarningBannerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sheetWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  sheetWarningBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B45309',
  },
  sheetWarningBannerBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  sheetWarningBannerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyIncidentsBox: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyIncidentsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  emptyIncidentsSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  incidentTripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 10,
    gap: 8,
  },
  incidentCardHeader: {
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
  incidentDesc: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  incidentContextBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    gap: 4,
  },
  incidentContextItem: {
    fontSize: 12,
    color: '#475569',
  },
  incidentResBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    padding: 8,
    gap: 2,
  },
  incidentResLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  incidentResNote: {
    fontSize: 12,
    color: '#166534',
  },
  incidentCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  incidentTimeText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  incidentConfirmSmallBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  incidentConfirmSmallBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pinnedTripBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    gap: 2,
  },
  pinnedTripTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  pinnedTripSub: {
    fontSize: 12,
    color: '#64748B',
  },
  incidentTargetBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    padding: 10,
    gap: 2,
  },
  incidentTargetLabel: {
    fontSize: 12,
    color: '#B45309',
  },
  incidentTargetValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B45309',
  },
  incidentTargetSub: {
    fontSize: 12,
    color: '#92400E',
  },
  incidentNoteInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 10,
    fontSize: 13,
    color: '#1E293B',
    textAlignVertical: 'top',
    minHeight: 70,
  },
  confirmModalTitle: {
    fontSize: 15,
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
    minHeight: 70,
  },
  modalLaterBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLaterBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
    overflow: 'hidden',
  },
  sheetHandleArea: {
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 8,
  },
  collapsedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetRouteName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  directionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  directionToSchool: {
    backgroundColor: '#EFF6FF',
  },
  directionToParking: {
    backgroundColor: '#FFFBEB',
  },
  directionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  directionTextToSchool: {
    color: '#2563EB',
  },
  directionTextToParking: {
    color: '#D97706',
  },
  sheetTimeText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  expandedContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tabBarWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 12,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 16,
  },
  tabBarParent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonParent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 4,
  },
  tabButtonActive: {
    borderBottomColor: '#D97706',
  },
  tabButtonActiveIncident: {
    borderBottomColor: '#DC2626',
  },
  tabButtonText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  tabButtonTextParent: {
    fontSize: 12,
  },
  tabButtonTextActive: {
    color: '#D97706',
    fontWeight: '700',
  },
  incidentHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 6,
  },
  incidentHeaderBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  tabContentScroll: {
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  infoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  infoSubtext: {
    fontSize: 12,
    color: '#64748B',
  },
  contactPhoneRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 6,
    rowGap: 2,
    marginTop: 6,
  },
  contactPhoneLabel: {
    fontSize: 12,
    color: colors.mutedText,
  },
  contactPhoneValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
    flexShrink: 1,
  },
  stopCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  stopOrderCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopOrderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stopHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stopName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  stopEta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  stopAddress: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  childAttendanceStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  childAttendanceStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyStopsText: {
    textAlign: 'center',
    padding: 24,
    color: '#94A3B8',
    fontSize: 13,
  },
  attendanceHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  attendanceProgressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#059669',
  },
  qrHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  qrHeaderBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 10,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  rosterCard: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    gap: 6,
  },
  rosterCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rosterOrderCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rosterOrderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  rosterStudentName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  rosterStudentCode: {
    fontSize: 11,
    color: '#64748B',
  },
  rosterStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePresent: {
    backgroundColor: '#DCFCE7',
  },
  badgeAbsent: {
    backgroundColor: '#FEE2E2',
  },
  badgeUnmarked: {
    backgroundColor: '#FEF3C7',
  },
  rosterStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textPresent: {
    color: '#15803D',
  },
  textAbsent: {
    color: '#B91C1C',
  },
  textUnmarked: {
    color: '#B45309',
  },
  rosterAddress: {
    fontSize: 12,
    color: '#64748B',
  },
  rosterAbsenceReason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rosterAbsenceReasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
  },
  rosterAbsenceReasonText: {
    fontSize: 11,
    color: '#991B1B',
    flex: 1,
  },
  rosterActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionBtnPresent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnAbsent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#DC2626',
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnSwitch: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnReset: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  actionBtnTextLight: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtnTextDark: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  fixedBottomActionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 10,
    zIndex: 99,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  bgReady: {
    backgroundColor: '#059669',
  },
  bgStart: {
    backgroundColor: '#15803D',
  },
  bgComplete: {
    backgroundColor: '#2563EB',
  },
  bgArrive: {
    backgroundColor: '#0284C7',
  },
  actionBtnAlight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#0284C7',
    paddingVertical: 6,
    borderRadius: 8,
  },
  subTabBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  subTabButton: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTabButtonActive: {
    backgroundColor: '#DBEAFE',
  },
  subTabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  subTabButtonTextActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  alightingNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  alightingNoticeText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
  },
  badgeAlighted: {
    backgroundColor: '#ECFDF5',
  },
  badgeNotAlighted: {
    backgroundColor: '#FFFBEB',
  },
  textAlighted: {
    color: '#059669',
  },
  textNotAlighted: {
    color: '#D97706',
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  readyBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  readyBadgeText: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '700',
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
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  modalMessage: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
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
  },
  modalConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  absenceInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 10,
    fontSize: 13,
    color: '#0F172A',
    textAlignVertical: 'top',
  },
  qrModalContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  qrModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 10,
  },
  qrModalTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  qrModalCloseBtn: {
    padding: 6,
  },
  qrCameraContainer: {
    flex: 1,
    position: 'relative',
  },
  qrOverlayFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrTargetBox: {
    width: 240,
    height: 240,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  qrGuideText: {
    color: '#FFFFFF',
    fontSize: 13,
    marginTop: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  qrManualBox: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 8,
  },
  qrManualInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
  },
  qrManualSubmitBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrManualSubmitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  qrVerifyCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    margin: 24,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  qrVerifyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  qrVerifyName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2563EB',
  },
  qrVerifyCode: {
    fontSize: 13,
    color: '#64748B',
  },
  qrVerifyAddress: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
  },
  qrVerifyBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: '100%',
  },
  qrVerifyRetryBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    alignItems: 'center',
  },
  qrVerifyRetryText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  qrVerifyConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#059669',
    borderRadius: 10,
    alignItems: 'center',
  },
  qrVerifyConfirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
import { AppHeader, HeaderAction } from '@/components/navigation/app-header';
