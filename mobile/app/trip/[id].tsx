import { AppAlert as Alert } from "@/services/app-alert";
import { AppModal as Modal } from "@/components/app-alert";
import { KeyboardScrollView } from "@/components/keyboard-scroll-view";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
  Keyboard,
  Pressable,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { WebView } from "react-native-webview";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { incidentStatusLabel, incidentTypeLabels } from "@/utils/trip-incident-label";
import { attendantTheme, colors, getStaffTheme } from "@/constants/theme";
import { parentHomeStyles } from "@/components/parent/home-styles";
import { useAuth } from "@/context/auth-context";
import {
  mobileApiClient,
  MobileTripDetail,
  MobileTripDetailStop,
  OperationalStateResponse,
  TripAttendanceStudentItem,
  TripAttendanceListResponse,
  VerifyQrResponse,
  AttendanceStatus,
  TripIncident,
  TripIncidentType,
  TripIncidentStatus,
  IncidentOptionsResponse,
} from "@/services/api-client";
import { canCancelAllAbsent, canCorrectAttendance, tripBlockLabel } from "@/utils/trip-operation";
import { useActiveRefresh } from "@/hooks/use-active-refresh";
import type { RefreshContext } from "@/utils/refresh-loop";
import { getTripMapSnapshot } from "@/utils/trip-map-data";
import { busMapIcon, schoolMapIcon } from "@/utils/trip-map-icons";
import {
  childMapPinCss,
  childMapPinScript,
  childMapPinSize,
  serializeMapScriptValue,
} from "@/utils/child-map-marker";
import { hasTripAction } from "@/utils/trip-map-layout";
import { useParentMapAvatars } from "@/hooks/use-parent-map-avatars";
import { decodePolyline } from "@/utils/polyline";
import { useTripNavigation } from "@/hooks/use-trip-navigation";
import { TripNavigationControls } from "@/components/trip-navigation-controls";
import { TripNextStopSummary } from "@/components/trip-next-stop-summary";
import { TripJoystick } from "@/components/trip-joystick";
import { TripContactCallButton } from "@/components/trip-contact-call-button";
import { RfidAttendanceEntry } from "@/components/rfid-attendance-entry";
import {
  loadLocationHistory,
  navigationApi,
  type LocationPoint,
  type LocationSource,
  type NavigationState,
} from "@/services/trip-navigation";
import {
  cumulativeDistances,
  projectProgress,
  recordedParts,
  splitSegment,
  type Coordinate,
} from "@/utils/trip-navigation";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const COLLAPSED_HEIGHT = 115;
const EXPANDED_HEIGHT = Math.round(SCREEN_HEIGHT * 0.72);

export default function MobileTripDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; incidentId?: string }>();
  const tripId = params.id;
  const { user } = useAuth();

  const [trip, setTrip] = useState<MobileTripDetail | null>(null);
  const [operationalState, setOperationalState] =
    useState<OperationalStateResponse | null>(null);
  const [attendance, setAttendance] = useState<TripAttendanceListResponse | null>(null);
  const attendanceRef = useRef<TripAttendanceListResponse | null>(null);
  const attendanceRoster = attendance?.students ?? [];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search in Attendance Tab
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText: string;
    studentId?: string;
    onConfirm: () => void;
  } | null>(null);

  const [reasonAction, setReasonAction] = useState<
    | { kind: "absence"; student: TripAttendanceStudentItem }
    | { kind: "correction"; student: TripAttendanceStudentItem; status: "PRESENT" | "ABSENT" }
    | { kind: "cancel" }
    | null
  >(null);
  const [reasonText, setReasonText] = useState("");
  const [submittingReason, setSubmittingReason] = useState(false);
  const reasonRequest = useRef(false);

  // QR Modal
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrScanning, setQrScanning] = useState(false);
  const qrGeneration = useRef(0);
  const [qrManualCode, setQrManualCode] = useState("");
  const [verifiedStudent, setVerifiedStudent] =
    useState<VerifyQrResponse | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Bottom Sheet 2-State Animation & Gesture
  const [isExpanded, setIsExpanded] = useState(false);
  const [bottomActionHeight, setBottomActionHeight] = useState(0);
  const [staffHeaderHeight, setStaffHeaderHeight] = useState(0);
  const isExpandedRef = useRef(false);
  const isSheetDragging = useRef(false);
  const collapsedHeightRef = useRef(COLLAPSED_HEIGHT);
  const sheetHeightAnim = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const currentHeight = useRef(COLLAPSED_HEIGHT);
  const dragStartHeight = useRef(COLLAPSED_HEIGHT);
  const [following, setFollowing] = useState(false);
  const prevModeRef = useRef<LocationSource | null>(null);

  const isDriverOrAttendant =
    user?.role === "DRIVER" || user?.role === "BUS_ATTENDANT";
  const isBusAttendant = user?.role === "BUS_ATTENDANT";
  const isDriver = user?.role === "DRIVER";
  const isParent = user?.role === "PARENT";
  const staffTheme = getStaffTheme(user?.role);
  const buttons = staffTheme?.buttons;
  const staffAccent = staffTheme?.colors.primary;
  const staffTabColor = staffAccent ?? "#D97706";
  const staffTabBorder = staffAccent ? { borderBottomColor: staffAccent } : styles.tabButtonActive;
  const staffTabText = buttons ? [styles.tabButtonTextActive, buttons.secondaryText] : styles.tabButtonTextActive;
  const incidentTabColor = staffAccent ?? "#DC2626";
  const attendanceTabBackground = buttons?.secondary ?? styles.subTabButtonActive;
  const mapActionBackground = staffTheme?.colors.secondary ?? colors.surface;
  const mapActionColor = staffAccent ?? colors.foreground;
  const attendantButtons = attendantTheme.buttons;
  const reasonDisabled = submittingReason || !reasonText.trim();
  const showNextStopSummary = isDriver && !isExpanded && operationalState?.status === "IN_PROGRESS";
  const showTripAction = hasTripAction(user?.role, operationalState?.status);
  const bottomActionOffset = showTripAction ? bottomActionHeight : 0;
  const sheetBottomPadding = showTripAction ? 10 : insets.bottom + 10;
  const collapsedHeight =
    isDriverOrAttendant && staffHeaderHeight > 0
      ? staffHeaderHeight + sheetBottomPadding
      : COLLAPSED_HEIGHT;
  collapsedHeightRef.current = collapsedHeight;

  const [activeTab, setActiveTab] = useState<
    "INFO" | "STOPS" | "ATTENDANCE" | "INCIDENTS"
  >(isBusAttendant ? "ATTENDANCE" : "INFO");
  const [attendanceSubTab, setAttendanceSubTab] = useState<
    "boarding" | "alighting"
  >("boarding");

  // Operational Incidents state
  const [incidentOptions, setIncidentOptions] =
    useState<IncidentOptionsResponse | null>(null);
  const [tripIncidents, setTripIncidents] = useState<TripIncident[]>([]);
  const [incidentReport, setIncidentReport] = useState<{
    type: TripIncidentType;
    student?: TripAttendanceStudentItem;
  } | null>(null);
  const [reportingIncident, setReportingIncident] = useState(false);
  const [incidentNote, setIncidentNote] = useState("");
  const [dismissedPendingIncidentIds, setDismissedPendingIncidentIds] =
    useState<Set<string>>(new Set());
  const [activeConfirmIncident, setActiveConfirmIncident] =
    useState<TripIncident | null>(null);
  const [confirmReason, setConfirmReason] = useState("");
  const [confirmingIncident, setConfirmingIncident] = useState(false);
  const autoConfirmDisabled = confirmingIncident || confirmReason.trim().length < 3;
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

  useEffect(() => {
    if (!isExpandedRef.current && !isSheetDragging.current)
      sheetHeightAnim.setValue(collapsedHeight);
  }, [collapsedHeight, sheetHeightAnim]);

  const animateTo = useCallback(
    (toValue: number, callback?: () => void) => {
      const willExpand = toValue === EXPANDED_HEIGHT;
      if (willExpand) {
        isExpandedRef.current = true;
        setIsExpanded(true);
      }
      Animated.spring(sheetHeightAnim, {
        toValue,
        friction: 8,
        tension: 40,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (!finished) return;
        isExpandedRef.current = willExpand;
        setIsExpanded(willExpand);
        callback?.();
      });
    },
    [sheetHeightAnim],
  );

  const toggleSheet = useCallback(() => {
    if (isExpandedRef.current) {
      animateTo(collapsedHeight);
    } else {
      animateTo(EXPANDED_HEIGHT);
    }
  }, [animateTo, collapsedHeight]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dy) > 4;
        },
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          isSheetDragging.current = true;
          sheetHeightAnim.stopAnimation();
          dragStartHeight.current = currentHeight.current;
        },
        onPanResponderMove: (_, gestureState) => {
          const newHeight = dragStartHeight.current - gestureState.dy;
          const clampedHeight = Math.min(
            EXPANDED_HEIGHT,
            Math.max(collapsedHeightRef.current, newHeight),
          );
          if (
            clampedHeight > collapsedHeightRef.current + 15 &&
            !isExpandedRef.current
          ) {
            isExpandedRef.current = true;
            setIsExpanded(true);
          }
          sheetHeightAnim.setValue(clampedHeight);
        },
        onPanResponderRelease: (_, gestureState) => {
          isSheetDragging.current = false;
          if (Math.abs(gestureState.dy) < 6 && Math.abs(gestureState.dx) < 6) {
            if (isExpandedRef.current) {
              animateTo(collapsedHeightRef.current);
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
            animateTo(collapsedHeightRef.current);
            return;
          }

          const midpoint = (collapsedHeightRef.current + EXPANDED_HEIGHT) / 2;
          if (currentHeight.current >= midpoint) {
            animateTo(EXPANDED_HEIGHT);
          } else {
            animateTo(collapsedHeightRef.current);
          }
        },
        onPanResponderTerminate: () => {
          isSheetDragging.current = false;
          const midpoint = (collapsedHeightRef.current + EXPANDED_HEIGHT) / 2;
          animateTo(
            currentHeight.current >= midpoint
              ? EXPANDED_HEIGHT
              : collapsedHeightRef.current,
          );
        },
      }),
    [animateTo, sheetHeightAnim],
  );

  const accessAllowed = useRef(true);
  const metadataAt = useRef(0);
  const identity = JSON.stringify([user?.id, user?.role, tripId]);
  const { children: linkedMapChildren, revision: mapAvatarRevision } =
    useParentMapAvatars(identity, isParent);
  const [navigation, setNavigation] = useState<NavigationState | null>(null);
  const [history, setHistory] = useState<LocationPoint[] | null>(null);
  const [showPlanned, setShowPlanned] = useState(false);
  const historyLoaded = useRef(false);
  const webView = useRef<WebView<object>>(null);
  const engine = useTripNavigation(
    identity,
    tripId,
    user?.id,
    trip?.stops ?? [],
    () => loadTripDetail(),
  );
  useEffect(() => {
    setTrip(null);
    setOperationalState(null);
    attendanceRef.current = null;
    setAttendance(null);
    setLoading(true);
    setConfirmModal(null);
    setReasonAction(null);
    setQrModalVisible(false);
    setVerifiedStudent(null);
    setIncidentReport(null);
    setIncidentNote("");
    setIncidentOptions(null);
    setTripIncidents([]);
    metadataAt.current = 0;
    accessAllowed.current = true;
    setNavigation(null);
    setHistory(null);
    historyLoaded.current = false;
    setShowPlanned(false);
    qrGeneration.current++;
  }, [identity]);

  const fetchTrip = async ({ isCurrent, immediate }: RefreshContext) => {
    if (!tripId || !user) return;
    try {
      const refreshMetadata =
        immediate || !trip || Date.now() - metadataAt.current >= 20000;
      const [state, roster, detail, location, incidents, options] =
        await Promise.all([
          mobileApiClient.getOperationalState(tripId),
          isDriverOrAttendant
            ? mobileApiClient.getTripAttendance(tripId)
            : Promise.resolve(null),
          refreshMetadata
            ? mobileApiClient.getMobileTripDetail(tripId)
            : Promise.resolve(null),
          navigationApi.state(tripId).catch((err) => {
            if ([401, 403, 404].includes(err?.statusCode)) throw err;
            return null; // Telemetry failures must not break Trip Operations.
          }),
          mobileApiClient.getTripIncidents(tripId).catch(() => []),
          isDriverOrAttendant
            ? mobileApiClient.getIncidentOptions(tripId).catch(() => null)
            : Promise.resolve(null),
        ]);
      if (!isCurrent()) return;
      setOperationalState(state);
      attendanceRef.current = roster;
      setAttendance(roster);
      if (roster) {
        const includes = (studentId: string) => roster.students.some((student) => student.studentId === studentId);
        setVerifiedStudent((current) => current && !includes(current.studentId) ? null : current);
        setConfirmModal((current) => current?.studentId && !includes(current.studentId) ? null : current);
        setReasonAction((current) => current && "student" in current && !includes(current.student.studentId) ? null : current);
      }
      if (detail) {
        setTrip(detail);
        metadataAt.current = Date.now();
      }
      if (incidents) setTripIncidents(incidents);
      setIncidentOptions(options);
      if (location) {
        setNavigation(location);
        void engine.observe(location);
      } else
        setNavigation((previous) =>
          previous ? { ...previous, freshness: "STALE" } : null,
        );
      if (
        (state.status === "COMPLETED" || state.status === "CANCELLED") &&
        !historyLoaded.current
      ) {
        try {
          const points = await loadLocationHistory(tripId, isCurrent);
          if (!isCurrent()) return;
          if (points) {
            setHistory(points);
            historyLoaded.current = true;
          }
        } catch {
          /* Keep the detail usable; a later focus retries history. */
        }
      }
      setError(null);
      return (
        (state.status !== "COMPLETED" && state.status !== "CANCELLED") ||
        !historyLoaded.current
      );
    } catch (err: any) {
      if (!isCurrent()) return;
      if ([401, 403, 404].includes(err?.statusCode)) {
        accessAllowed.current = false;
        setNavigation(null);
        setHistory(null);
        engine.clear();
        setTrip(null);
        setOperationalState(null);
        attendanceRef.current = null;
        setAttendance(null);
        setConfirmModal(null);
        setReasonAction(null);
        setQrModalVisible(false);
        setVerifiedStudent(null);
        setIncidentReport(null);
        setError(err.message);
        return false;
      }
      if (!trip) setError(err?.message || "Không thể tải thông tin chuyến xe");
    } finally {
      if (isCurrent()) setLoading(false);
    }
  };
  const identityRef = useRef(identity);
  useEffect(() => {
    identityRef.current = identity;
  }, [identity]);
  const { refresh: loadTripDetail, mutate } = useActiveRefresh(
    identity,
    fetchTrip,
    5000,
  );
  useEffect(() => {
    setConfirmModal(null);
    qrGeneration.current++;
    setQrScanning(false);
    if (operationalState?.isSchoolArrived) {
      setReasonAction((current) => current?.kind === "absence" ? null : current);
      setQrModalVisible(false);
      setVerifiedStudent(null);
    }
    if (
      operationalState?.status === "COMPLETED" ||
      operationalState?.status === "CANCELLED"
    ) {
      setConfirmModal(null);
      setReasonAction(null);
      setQrModalVisible(false);
      setVerifiedStudent(null);
      setIncidentReport(null);
    }
  }, [
    operationalState?.status,
    operationalState?.isSchoolArrived,
    operationalState?.isAttendantReady,
    operationalState?.canStartTrip,
    operationalState?.canArriveAtSchool,
    operationalState?.canCompleteTrip,
  ]);

  // Bus Attendant pending unconfirmed auto-incident
  const handledNotificationIncident = useRef<string | null>(null);
  useEffect(() => {
    if (
      !params.incidentId ||
      handledNotificationIncident.current === params.incidentId
    )
      return;
    const incident = tripIncidents.find(
      (item) => item.id === params.incidentId,
    );
    if (!incident) return;
    handledNotificationIncident.current = params.incidentId;
    setActiveTab("INCIDENTS");
    if (!isExpandedRef.current) toggleSheet();
    if (
      isBusAttendant &&
      incident.status === "WAITING_CONFIRMATION" &&
      operationalState?.status === "IN_PROGRESS"
    ) {
      hasAutoPromptedRef.current.add(incident.id);
      setActiveConfirmIncident(incident);
    }
  }, [
    params.incidentId,
    tripIncidents,
    isBusAttendant,
    operationalState?.status,
    toggleSheet,
  ]);
  const unconfirmedPendingIncident = useMemo(() => {
    if (!isBusAttendant) return null;
    return (
      tripIncidents.find(
        (inc) =>
          (inc.status === "WAITING_CONFIRMATION" ||
            inc.status === ("PENDING_CONFIRMATION" as any)) &&
          (inc.type === "OFF_ROUTE" || inc.type === "LATE_STOP"),
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
  }, [
    unconfirmedPendingIncident,
    dismissedPendingIncidentIds,
    activeConfirmIncident,
  ]);

  const handleReportIncident = async () => {
    if (!tripId || !incidentReport || reportingIncident) return;
    const { type, student } = incidentReport;
    const missingStaff = type === "ATTENDANT_MISSING" || type === "DRIVER_MISSING";
    if (missingStaff ? !incidentOptions?.canReport : operationalState?.status !== "IN_PROGRESS") {
      setIncidentReport(null);
      Alert.alert("Không thể báo sự cố", "Trạng thái chuyến đã thay đổi");
      return;
    }

    try {
      setReportingIncident(true);
      const reported = await mutate(async () => {
        const coords = navigation?.testMode ? undefined : (await Location.getLastKnownPositionAsync({
          maxAge: 30_000,
          requiredAccuracy: 100,
        }).catch(() => null))?.coords;
        if (identityRef.current !== identity || !accessAllowed.current) {
          throw new Error("Chuyến xe đã thay đổi");
        }
        if (student) {
          const current = assertActiveStudent(student.studentId);
          if (current.status !== "PRESENT" || current.isAlighted || current.alightedAt) {
            throw new Error("Học sinh không còn trên xe");
          }
        }
        return mobileApiClient.createManualIncident({
          tripId,
          type,
          note: incidentNote.trim() || undefined,
          studentId: student?.studentId,
          expectedAssigneeId: missingStaff ? incidentOptions?.expectedAssignee?.id : undefined,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
        });
      });
      if (identityRef.current !== identity) return;
      setIncidentReport(null);
      setIncidentNote("");
      if (student && (reported.contextData?.studentId ?? reported.context?.studentId) !== student.studentId) {
        Alert.alert("Đã có báo cáo", "Chuyến này đã có báo cáo không có người đón cho học sinh khác.");
        return;
      }
      Alert.alert("Đã ghi nhận", "Báo cáo sự cố đã được ghi nhận.");
    } catch (err: any) {
      Alert.alert("Lỗi", err?.message || "Không thể báo sự cố. Vui lòng thử lại.");
    } finally {
      setReportingIncident(false);
    }
  };

  const handleConfirmAutoIncident = async () => {
    if (!activeConfirmIncident) return;
    const trimmed = confirmReason.trim();
    if (!trimmed || trimmed.length < 3) {
      Alert.alert(
        "Lưu ý",
        "Vui lòng nhập lý do giải trình cụ thể (tối thiểu 3 ký tự).",
      );
      return;
    }
    try {
      setConfirmingIncident(true);
      await mobileApiClient.confirmAutoIncident(
        activeConfirmIncident.id,
        trimmed,
      );
      Alert.alert("Thành công", "Đã gửi xác nhận và giải trình sự cố.");
      setActiveConfirmIncident(null);
      setConfirmReason("");
      loadTripDetail();
    } catch (err: any) {
      Alert.alert(
        "Lỗi",
        err?.message || "Không thể xác nhận sự cố. Vui lòng thử lại.",
      );
    } finally {
      setConfirmingIncident(false);
    }
  };

  const tilemapKey = process.env.EXPO_PUBLIC_VIETMAP_TILEMAP_KEY || "";

  const mapData = getTripMapSnapshot(trip);
  const mapHtml = useMemo(() => {
    const data = JSON.parse(mapData);
    if (!data) return "";
    const coordsJson = JSON.stringify(
      data.polylineGeometry ? decodePolyline(data.polylineGeometry) : [],
    );
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
          var staffMap = ${isDriverOrAttendant};

          stops.forEach(function(s) {
            var iconHtml = '<div class="student-marker">' + s.order + '</div>';
            var schoolStop = s.type === 'SCHOOL_ARRIVAL' || s.type === 'SCHOOL_DEPARTURE';
            var ownChildPin = s.isMyChild && s.studentId && (s.type === 'PICKUP' || s.type === 'DROPOFF');
            var staffStopPin = staffMap && (s.type === 'PICKUP' || s.type === 'DROPOFF');
            if (s.type === 'PARKING_START' || s.type === 'PARKING_END') {
              iconHtml = '<div class="depot-marker">P</div>';
            } else if (ownChildPin) {
              iconHtml = window.createChildMapPin(s.studentId, s.name);
            } else if (staffStopPin) {
              iconHtml = window.createChildMapPin(null, s.name);
            }

            var pinMarker = ownChildPin || staffStopPin;
            var icon = L.divIcon(schoolStop ? ${JSON.stringify(schoolMapIcon)} : { className: '', html: iconHtml,
              iconSize: pinMarker ? [${childMapPinSize.width}, ${childMapPinSize.height}] : [28, 28],
              iconAnchor: pinMarker ? [${childMapPinSize.width / 2}, ${(childMapPinSize.height * 65) / 66}] : [14, 14],
              popupAnchor: pinMarker ? [0, -${childMapPinSize.height - 5}] : [0, 0] });
            var marker = L.marker([s.lat, s.lng], { icon: icon }).addTo(map);
            if (schoolStop && marker.getElement()) {
              marker.getElement().setAttribute('aria-label', s.name || 'Trường học');
            } else if (ownChildPin && marker.getElement()) {
              marker.getElement().setAttribute('aria-label', (s.type === 'PICKUP' ? 'Điểm đón: ' : 'Điểm trả: ') + s.name);
            } else if (staffStopPin && marker.getElement()) {
              marker.getElement().setAttribute('aria-label', 'Điểm dừng ' + s.order + ': ' + s.name);
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
              if (!vehicle) vehicle = L.marker(n.position, {
                icon: L.divIcon(${JSON.stringify(busMapIcon)}),
                title: 'Xe đưa đón học sinh',
              }).addTo(map);
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
  }, [mapData, tilemapKey, isDriverOrAttendant]);
  const mapSource = useMemo(() => ({ html: mapHtml }), [mapHtml]);
  const historyParts = useMemo(() => recordedParts(history ?? []), [history]);
  const terminal =
    operationalState?.status === "COMPLETED" ||
    operationalState?.status === "CANCELLED";
  const isDriverActiveNavigation =
    isDriver && !terminal && operationalState?.status === "IN_PROGRESS";

  const fullRouteCoords = useMemo(() => {
    return trip?.polylineGeometry ? decodePolyline(trip.polylineGeometry) : [];
  }, [trip?.polylineGeometry]);

  const fullRouteCumulative = useMemo(() => {
    return fullRouteCoords.length >= 2
      ? cumulativeDistances(fullRouteCoords)
      : [];
  }, [fullRouteCoords]);

  // Observer two-tone split: when vehicle is in progress and has latestPosition
  const observerSplit = useMemo(() => {
    if (isDriverActiveNavigation && engine.segment.length > 0) {
      return null; // Driver uses engine's active navigation segment
    }
    if (
      terminal ||
      operationalState?.status !== "IN_PROGRESS" ||
      !navigation?.latestPosition ||
      fullRouteCoords.length < 2
    ) {
      return null;
    }
    const vehPos: Coordinate = [
      navigation.latestPosition.latitude,
      navigation.latestPosition.longitude,
    ];
    const proj = projectProgress(
      fullRouteCoords,
      fullRouteCumulative,
      vehPos,
      0,
      Infinity,
    );
    return splitSegment(fullRouteCoords, fullRouteCumulative, proj.progress);
  }, [
    isDriverActiveNavigation,
    engine.segment.length,
    terminal,
    operationalState?.status,
    navigation?.latestPosition,
    fullRouteCoords,
    fullRouteCumulative,
  ]);

  const hasActiveRoutingDisplay =
    (isDriverActiveNavigation && engine.segment.length > 0) ||
    observerSplit !== null;
  const hidePlanned = hasActiveRoutingDisplay
    ? !showPlanned
    : terminal && !!history?.length && !showPlanned;

  const activeTraveled =
    isDriverActiveNavigation && engine.segment.length > 0
      ? engine.traveled
      : observerSplit
        ? observerSplit.traveled
        : [];
  const activeRemaining =
    isDriverActiveNavigation && engine.segment.length > 0
      ? engine.remaining
      : observerSplit
        ? observerSplit.remaining
        : [];
  const activeLeg =
    isDriverActiveNavigation && engine.segment.length > 0
      ? engine.segment
      : observerSplit
        ? fullRouteCoords
        : [];

  const centerOnStart = !prevModeRef.current && !!engine.mode;
  useEffect(() => {
    prevModeRef.current = engine.mode;
  }, [engine.mode]);
  const mapUpdate = JSON.stringify({
    position:
      (!terminal && engine.position) ||
      (navigation?.latestPosition
        ? [
            navigation.latestPosition.latitude,
            navigation.latestPosition.longitude,
          ]
        : null),
    traveled: terminal ? [] : activeTraveled,
    remaining: terminal ? [] : activeRemaining,
    leg: terminal ? [] : activeLeg,
    hidePlanned,
    recorded: terminal && !!history?.length && !showPlanned,
    parts: terminal && !showPlanned ? historyParts : [],
    centerOnStart,
  });
  const updateMap = useCallback(() => {
    webView.current?.injectJavaScript(
      "window.setNavigation && window.setNavigation(" + mapUpdate + "); true;",
    );
  }, [mapUpdate]);
  useEffect(updateMap, [updateMap]);
  const mapAvatars = serializeMapScriptValue(
    isParent
      ? linkedMapChildren.filter((child) =>
          trip?.stops.some(
            (stop) => stop.isMyChild && stop.studentId === child.id,
          ),
        )
      : [],
  );
  // A fresh successful read also retries an image that failed at the same URL.
  const updateMapAvatars = useCallback(() => {
    webView.current?.injectJavaScript(
      "window.setChildMapAvatars && window.setChildMapAvatars(" +
        mapAvatars +
        "); true;",
    );
  }, [mapAvatars, mapAvatarRevision]);
  useEffect(updateMapAvatars, [updateMapAvatars]);
  const handleMapLoad = useCallback(() => {
    updateMap();
    updateMapAvatars();
  }, [updateMap, updateMapAvatars]);

  // Operational Actions
  const handleMarkReady = () => {
    setConfirmModal({
      visible: true,
      title: "Xác nhận sẵn sàng",
      message:
        "Bạn xác nhận xe và các điều kiện đón học sinh đã sẵn sàng để khởi hành chuyến xe này?",
      confirmText: "Xác nhận sẵn sàng",
      onConfirm: async () => {
        try {
          await mutate(() => mobileApiClient.markAttendantReady(tripId));
          setConfirmModal(null);
        } catch (err: any) {
          Alert.alert("Lỗi", err?.message || "Không thể xác nhận sẵn sàng");
        }
      },
    });
  };

  const handleStartTrip = () => {
    setConfirmModal({
      visible: true,
      title: "Bắt đầu chuyến xe",
      message: "Bạn có chắc chắn muốn bắt đầu chuyến xe này ngay bây giờ?",
      confirmText: "Bắt đầu ngay",
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
                void engine.change("LIVE");
              }
            } catch {
              if (navigation?.testMode) {
                void engine.prepare();
              } else {
                void engine.change("LIVE");
              }
            }
          }
        } catch (err: any) {
          Alert.alert("Lỗi", err?.message || "Không thể bắt đầu chuyến xe");
        }
      },
    });
  };

  const handleArriveAtSchool = () => {
    setConfirmModal({
      visible: true,
      title: "Xác nhận đến trường",
      message:
        "Bạn xác nhận xe đã đến cổng trường an toàn để mở xác nhận học sinh xuống xe?",
      confirmText: "Xác nhận đến trường",
      onConfirm: async () => {
        try {
          await mutate(() => mobileApiClient.arriveAtSchool(tripId));
          setConfirmModal(null);
        } catch (err: any) {
          Alert.alert("Lỗi", err?.message || "Không thể xác nhận đến trường");
        }
      },
    });
  };

  const handleCompleteTrip = () => {
    const present = attendance?.presentCount || 0;
    const absent = attendance?.absentCount || 0;
    const alighted = attendance?.alightedCount || 0;
    setConfirmModal({
      visible: true,
      title: "Hoàn thành chuyến xe",
      message: `Bạn xác nhận hoàn thành chuyến xe này?\n\n• Có mặt: ${present} học sinh (Đã xuống xe: ${alighted})\n• Vắng mặt: ${absent} học sinh`,
      confirmText: "Xác nhận hoàn thành",
      onConfirm: async () => {
        try {
          await mutate(() => mobileApiClient.completeTrip(tripId));
          setConfirmModal(null);
        } catch (err: any) {
          Alert.alert("Lỗi", err?.message || "Không thể hoàn thành chuyến xe");
        }
      },
    });
  };

  const assertActiveStudent = (studentId: string) => {
    const student = attendanceRef.current?.students.find((item) => item.studentId === studentId);
    if (!student) throw new Error("Học sinh không còn trong danh sách phục vụ của chuyến");
    return student;
  };

  const mutateStudent = <T,>(studentId: string, operation: () => Promise<T>) =>
    mutate(() => {
      assertActiveStudent(studentId);
      return operation();
    });

  const handleMarkPresent = (student: TripAttendanceStudentItem) => {
    setConfirmModal({
      visible: true,
      title: "Điểm danh có mặt",
      message: `Xác nhận học sinh ${student.fullName} (${student.studentCode}) có mặt trên xe?`,
      confirmText: "Có mặt",
      studentId: student.studentId,
      onConfirm: async () => {
        try {
          await mutateStudent(student.studentId, () =>
            mobileApiClient.updateAttendance(
              tripId,
              student.studentId,
              "PRESENT",
            ),
          );
          setConfirmModal(null);
        } catch (err: any) {
          Alert.alert("Lỗi", err?.message || "Không thể cập nhật điểm danh");
        }
      },
    });
  };

  const handleOpenAbsenceModal = (student: TripAttendanceStudentItem) => {
    setReasonAction({ kind: "absence", student });
    setReasonText(student.absenceReason || "");
  };

  const handleSubmitReason = async () => {
    const reason = reasonText.trim();
    if (!isBusAttendant || !reasonAction || !reason || reasonRequest.current) return;

    reasonRequest.current = true;
    setSubmittingReason(true);
    try {
      if (reasonAction.kind === "cancel") {
        if (!canCancelAllAbsent(trip?.direction, operationalState, attendanceRef.current?.students ?? [])) {
          throw new Error("Chuyến không còn đủ điều kiện hủy vì tất cả học sinh vắng");
        }
        await mutate(() => mobileApiClient.cancelAllAbsent(tripId, reason));
      } else {
        const { student } = reasonAction;
        if (reasonAction.kind === "correction" &&
          !canCorrectAttendance(trip?.direction, operationalState, assertActiveStudent(student.studentId))) {
          throw new Error("Học sinh hoặc chuyến không còn đủ điều kiện đính chính");
        }
        await mutateStudent(student.studentId, () =>
          reasonAction.kind === "correction"
            ? mobileApiClient.correctAttendance(tripId, student.studentId, {
                status: reasonAction.status,
                expectedStatus: student.status,
                reason,
              })
            : mobileApiClient.updateAttendance(tripId, student.studentId, "ABSENT", reason),
        );
      }
      setReasonAction(null);
      setReasonText("");
    } catch (err: any) {
      Alert.alert("Lỗi", err?.message || "Không thể lưu thao tác");
    } finally {
      reasonRequest.current = false;
      setSubmittingReason(false);
    }
  };

  const handleResetUnmarked = (student: TripAttendanceStudentItem) => {
    setConfirmModal({
      visible: true,
      title: "Hoàn tác điểm danh",
      message: `Đưa trạng thái điểm danh của học sinh ${student.fullName} về Chưa điểm danh?`,
      confirmText: "Hoàn tác",
      studentId: student.studentId,
      onConfirm: async () => {
        try {
          await mutateStudent(student.studentId, () =>
            mobileApiClient.updateAttendance(
              tripId,
              student.studentId,
              "UNMARKED",
            ),
          );
          setConfirmModal(null);
        } catch (err: any) {
          Alert.alert("Lỗi", err?.message || "Không thể hoàn tác điểm danh");
        }
      },
    });
  };

  const handleToggleAlighting = (
    student: TripAttendanceStudentItem,
    isAlighted: boolean,
  ) => {
    setConfirmModal({
      visible: true,
      title: isAlighted ? "Xác nhận xuống xe" : "Hoàn tác xuống xe",
      message: isAlighted
        ? `Xác nhận học sinh ${student.fullName} (${student.studentCode}) đã xuống xe an toàn?`
        : `Đưa trạng thái của học sinh ${student.fullName} về Chưa xuống xe?`,
      confirmText: isAlighted ? "Đã xuống xe" : "Hoàn tác",
      studentId: student.studentId,
      onConfirm: async () => {
        try {
          await mutateStudent(student.studentId, () =>
            mobileApiClient.updateAlighting(
              tripId,
              student.studentId,
              isAlighted,
            ),
          );
          setConfirmModal(null);
        } catch (err: any) {
          Alert.alert(
            "Lỗi",
            err?.message || "Không thể cập nhật trạng thái xuống xe",
          );
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
      if (
        identityRef.current !== requestIdentity ||
        !accessAllowed.current ||
        qrGeneration.current !== requestGeneration
      )
        return;
      assertActiveStudent(res.studentId);
      setVerifiedStudent(res);
    } catch (err: any) {
      Alert.alert(
        "Không hợp lệ",
        err?.message ||
          "Mã QR không thuộc danh sách học sinh của chuyến xe này",
      );
    } finally {
      setQrScanning(false);
    }
  };

  const handleConfirmVerifiedQr = async () => {
    if (!verifiedStudent || !canScanQr) return;
    try {
      await mutateStudent(verifiedStudent.studentId, () =>
        mobileApiClient.updateAttendance(
          tripId,
          verifiedStudent.studentId,
          "PRESENT",
        ),
      );
      setVerifiedStudent(null);
      setQrModalVisible(false);
    } catch (err: any) {
      Alert.alert("Lỗi", err?.message || "Không thể cập nhật điểm danh từ QR");
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
        s.addressText.toLowerCase().includes(q),
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
          <TouchableOpacity
            style={[
              styles.retryButton,
              isDriverOrAttendant && parentHomeStyles.primaryBtn,
              buttons?.primary,
            ]}
            onPress={loadTripDetail}
          >
            <Text
              style={[
                styles.retryButtonText,
                isDriverOrAttendant && parentHomeStyles.primaryBtnText,
                buttons?.primaryText,
              ]}
            >
              Thử lại
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const visibleStops = trip.stops.map((stop) => {
    const child = operationalState?.children?.find(
      (item) => item.studentId === stop.studentId,
    );
    return child
      ? {
          ...stop,
          attendanceStatus: child.attendanceStatus,
          absenceReason: child.absenceReason,
          attendanceMarkedAt: child.markedAt,
        }
      : stop;
  });
  const isToSchool = trip.direction === "TO_SCHOOL";
  const correctingAttendance = isToSchool && operationalState?.isSchoolArrived && operationalState.status === "IN_PROGRESS";
  const showCancelAllAbsent = isBusAttendant && canCancelAllAbsent(trip.direction, operationalState, attendanceRoster);
  const canScanQr =
    isBusAttendant &&
    (isToSchool
      ? operationalState?.status === "IN_PROGRESS" &&
        !operationalState.isSchoolArrived
      : operationalState?.status === "IN_PROGRESS" ||
        (operationalState?.status === "SCHEDULED" &&
          operationalState.isAttendantReady));

  const canReady = Boolean(
    operationalState?.canMarkReady ?? operationalState?.canAttendantReady,
  );
  const canStart = Boolean(
    operationalState?.canStartTrip ?? operationalState?.canDriverStart,
  );
  const canArriveAtSchool = Boolean(operationalState?.canArriveAtSchool);
  const canComplete = Boolean(
    operationalState?.canCompleteTrip ?? operationalState?.canDriverComplete,
  );

  const readyReason =
    operationalState?.disabledReasons?.ready ||
    operationalState?.readyDisabledReason;
  const startReason =
    operationalState?.disabledReasons?.start ||
    operationalState?.startDisabledReason;
  const arriveReason =
    operationalState?.disabledReasons?.arriveAtSchool ||
    operationalState?.arriveAtSchoolDisabledReason;
  const completeReason =
    operationalState?.disabledReasons?.complete ||
    operationalState?.completeDisabledReason;

  const readyDisabledText =
    readyReason === "ALREADY_READY"
      ? "Đã xác nhận sẵn sàng"
      : readyReason === "TOO_EARLY"
        ? "Chưa đến giờ sẵn sàng (Mở trước 15p)"
        : tripBlockLabel(readyReason) || "Chưa thể xác nhận sẵn sàng";

  const startDisabledText =
    startReason === "WAITING_FOR_ATTENDANT"
      ? "Chờ giáo viên sẵn sàng"
      : startReason === "EMPTY_ROSTER"
        ? "Chuyến xe chưa có học sinh"
        : startReason === "PENDING_BOARDING"
          ? `Còn ${attendance?.unmarkedCount || 0} học sinh chưa lên xe`
          : startReason === "TOO_EARLY"
            ? "Chưa đến giờ bắt đầu (Mở trước 5p)"
            : tripBlockLabel(startReason) || "Chưa thể bắt đầu";

  const arriveDisabledText =
    arriveReason === "PENDING_BOARDING"
      ? `Còn ${attendance?.unmarkedCount || 0} học sinh chưa điểm danh`
      : arriveReason === "EMPTY_ROSTER"
        ? "Chuyến xe chưa có học sinh"
        : tripBlockLabel(arriveReason) || "Chưa thể đến trường";

  const completeDisabledText =
    completeReason === "EMPTY_ROSTER"
      ? "Chuyến xe chưa có học sinh"
      : completeReason === "PENDING_ATTENDANCE"
        ? `Còn ${attendance?.unmarkedCount || 0} học sinh chưa điểm danh`
        : completeReason === "NOT_ARRIVED_AT_SCHOOL"
          ? "Xe chưa xác nhận đến trường"
          : completeReason === "STUDENTS_NOT_ALIGHTED"
            ? `Còn ${attendance?.pendingAlightCount || 0} học sinh chưa xuống xe`
            : tripBlockLabel(completeReason) || "Chưa thể hoàn thành";

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
              if (msg.type === "FOLLOW_CHANGE") setFollowing(!!msg.following);
            } catch {}
          }}
        />
      </View>

      <View
        style={{
          position: "absolute",
          top: insets.top + 64,
          left: 12,
          right: 12,
        }}
      >
        <TripNavigationControls
          staffTheme={staffTheme}
          isDriver={isDriver}
          canPublish={
            isDriver &&
            (!!navigation?.canPublish ||
              operationalState?.status === "IN_PROGRESS") &&
            !terminal
          }
          testMode={!!navigation?.testMode}
          mode={engine.mode}
          guidance={engine.guidance}
          message={engine.message}
          change={engine.change}
          retry={engine.retry}
          canRetry={isDriver && !engine.segment.length && !terminal}
          speedKmh={engine.speedKmh}
          onIncreaseSpeed={engine.increaseSpeed}
          onDecreaseSpeed={engine.decreaseSpeed}
          freshness={navigation?.freshness}
          hasLocalPosition={isDriver && (!!engine.position || !!engine.mode)}
          targetName={
            trip?.stops.find((s) => s.id === engine.targetStopId)
              ?.studentName ||
            trip?.stops.find((s) => s.id === engine.targetStopId)?.addressText
          }
          historyLabel={
            terminal && history !== null
              ? history.length && !showPlanned
                ? "Hành trình ghi nhận"
                : "Tuyến dự kiến"
              : undefined
          }
          hasGaps={!showPlanned && historyParts.length > 1}
          showPlanned={showPlanned}
          selectPlan={terminal && history?.length ? setShowPlanned : undefined}
        />
      </View>
      {(engine.position || navigation?.latestPosition) && (
        <View
          style={{
            position: "absolute",
            top: insets.top + 12,
            right: 12,
            flexDirection: "row",
            gap: 6,
          }}
        >
          {isDriverActiveNavigation && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={
                showPlanned ? "Ẩn tuyến dự kiến" : "Xem tuyến dự kiến"
              }
              accessibilityState={{ selected: showPlanned }}
              onPress={() => setShowPlanned((s) => !s)}
              style={{
                backgroundColor: showPlanned && !staffTheme ? colors.primary : mapActionBackground,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: showPlanned ? (staffAccent ?? colors.primary) : colors.border,
              }}
            >
              <Text
                style={{
                  color: mapActionColor,
                  fontWeight: "600",
                  fontSize: 12,
                }}
              >
                {showPlanned ? "Dự kiến" : "Tham chiếu"}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Căn giữa xe"
            onPress={() =>
              webView.current?.injectJavaScript(
                "window.centerVehicle && window.centerVehicle(); true;",
              )
            }
            style={{
              backgroundColor: mapActionBackground,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                color: mapActionColor,
                fontWeight: "600",
                fontSize: 12,
              }}
            >
              Căn giữa
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={following ? "Hủy bám xe" : "Bám theo xe"}
            accessibilityState={{ selected: following }}
            onPress={() =>
              webView.current?.injectJavaScript(
                "window.toggleFollow && window.toggleFollow(); true;",
              )
            }
            style={{
              backgroundColor: following && !staffTheme ? colors.primary : mapActionBackground,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: following ? (staffAccent ?? colors.primary) : colors.border,
            }}
          >
            <Text
              style={{
                color: mapActionColor,
                fontWeight: "600",
                fontSize: 12,
              }}
            >
              {following ? "Đang bám" : "Theo xe"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Floating Header (Back Button) */}
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
        <HeaderAction
          icon="arrow-back"
          label="Quay lại"
          staffTheme={staffTheme}
          onPress={() => router.back()}
        />
      </View>

      {/* Bus Attendant Unconfirmed Incident Warning Banner */}
      {unconfirmedPendingIncident && (
        <View style={[styles.floatingWarningBanner, { top: insets.top + 60 }]}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              flex: 1,
            }}
          >
            <Ionicons name="warning" size={16} color="#B45309" />
            <Text style={styles.floatingWarningBannerText} numberOfLines={1}>
              Cần xác nhận:{" "}
              {unconfirmedPendingIncident.type === "OFF_ROUTE"
                ? "Lệch tuyến"
                : "Trễ đón/trả"}
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

      {isDriver &&
        navigation?.testMode &&
        engine.mode === "TEST_JOYSTICK" &&
        !terminal &&
        !isExpanded && (
          <Animated.View
            style={{
              position: "absolute",
              right: 12,
              bottom: Animated.add(sheetHeightAnim, bottomActionOffset + 16),
            }}
          >
            <TripJoystick onMove={engine.joystick} />
          </Animated.View>
        )}

      {/* 2. Persistent 2-State Draggable Bottom Sheet */}
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            height: sheetHeightAnim,
            bottom: bottomActionOffset,
            paddingBottom: sheetBottomPadding,
          },
        ]}
      >
        {/* Drag Handle & Header */}
        <View
          {...panResponder.panHandlers}
          onLayout={
            isDriverOrAttendant
              ? (event) => {
                  if (!isSheetDragging.current)
                    setStaffHeaderHeight(
                      Math.ceil(event.nativeEvent.layout.height),
                    );
                }
              : undefined
          }
          style={styles.sheetHandleArea}
          accessible={!showNextStopSummary}
          accessibilityRole="button"
          accessibilityLabel={
            isExpanded ? "Thu gọn chi tiết" : "Mở rộng chi tiết"
          }
        >
          <View style={styles.sheetHandle} />

          <View style={styles.collapsedHeader}>
            <View style={{ flex: 1 }}>
              {showNextStopSummary ? (
                <TripNextStopSummary estimate={engine.nextStopEstimate} />
              ) : (
              <>
              <View style={styles.titleRow}>
                <Text style={styles.sheetRouteName} numberOfLines={1}>
                  {trip.routeName}
                </Text>
                <View
                  style={[
                    styles.directionBadge,
                    isToSchool
                      ? styles.directionToSchool
                      : styles.directionToParking,
                  ]}
                >
                  <Text
                    style={[
                      styles.directionText,
                      isToSchool
                        ? styles.directionTextToSchool
                        : styles.directionTextToParking,
                    ]}
                  >
                    {isToSchool ? "Chiều đi" : "Chiều về"}
                  </Text>
                </View>

                {unconfirmedPendingIncident ? (
                  <TouchableOpacity
                    style={[
                      styles.incidentHeaderBadge,
                      {
                        backgroundColor: "#FEE2E2",
                        borderColor: "#FCA5A5",
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() =>
                      setActiveConfirmIncident(unconfirmedPendingIncident)
                    }
                    activeOpacity={0.8}
                  >
                    <Ionicons name="alert-circle" size={12} color="#DC2626" />
                    <Text
                      style={[
                        styles.incidentHeaderBadgeText,
                        { color: "#DC2626", fontWeight: "700" },
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
                      setActiveTab("INCIDENTS");
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="warning" size={12} color="#DC2626" />
                    <Text style={styles.incidentHeaderBadgeText}>
                      {tripIncidents.some((incident) => incident.type === "GPS_SIGNAL_LOST" && incident.status === "WAITING_ASSIGNMENT")
                        ? "Mất GPS"
                        : tripIncidents.length + " sự cố"}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {isDriverOrAttendant && operationalState?.status === "CANCELLED" && (
                  <TouchableOpacity accessibilityRole="button" style={styles.incidentHeaderBadge} onPress={loadTripDetail}>
                    <Text style={styles.incidentHeaderBadgeText}>Tải lại chuyến</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.sheetTimeText}>
                {trip.scheduledStartTime} – {trip.scheduledEndTime} •{" "}
                {trip.schoolName} •{" "}
                {
                  {
                    SCHEDULED: "Chờ khởi hành",
                    IN_PROGRESS: "Đang chạy",
                    COMPLETED: "Đã hoàn thành",
                    CANCELLED: "Đã hủy",
                  }[operationalState?.status || trip.status]
                }
              </Text>
              </>
              )}
            </View>

            <TouchableOpacity
              onPress={toggleSheet}
              accessibilityRole="button"
              accessibilityLabel={isExpanded ? "Thu gọn chi tiết" : "Mở rộng chi tiết"}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isExpanded ? "chevron-down" : "chevron-up"}
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

            {/* Tab Switcher */}
            <View style={styles.tabBarWrapper}>
              {!isDriverOrAttendant ? (
                /* PARENT: Exactly 3 tabs, fixed width flex: 1, 100% visible on any screen without scrolling */
                <View style={styles.tabBarParent}>
                  <TouchableOpacity
                    onPress={() => setActiveTab("INFO")}
                    style={[
                      styles.tabButton,
                      styles.tabButtonParent,
                      activeTab === "INFO" && styles.tabButtonActive,
                    ]}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={15}
                      color={activeTab === "INFO" ? "#D97706" : "#64748B"}
                    />
                    <Text
                      style={[
                        styles.tabButtonText,
                        styles.tabButtonTextParent,
                        activeTab === "INFO" && styles.tabButtonTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      Thông tin
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setActiveTab("STOPS")}
                    style={[
                      styles.tabButton,
                      styles.tabButtonParent,
                      activeTab === "STOPS" && styles.tabButtonActive,
                    ]}
                  >
                    <Ionicons
                      name="location-outline"
                      size={15}
                      color={activeTab === "STOPS" ? "#D97706" : "#64748B"}
                    />
                    <Text
                      style={[
                        styles.tabButtonText,
                        styles.tabButtonTextParent,
                        activeTab === "STOPS" && styles.tabButtonTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      Điểm đón ({trip.stops?.length || 0})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setActiveTab("INCIDENTS")}
                    style={[
                      styles.tabButton,
                      styles.tabButtonParent,
                      activeTab === "INCIDENTS" &&
                        styles.tabButtonActiveIncident,
                    ]}
                  >
                    <Ionicons
                      name="warning-outline"
                      size={15}
                      color={activeTab === "INCIDENTS" ? "#DC2626" : "#64748B"}
                    />
                    <Text
                      style={[
                        styles.tabButtonText,
                        styles.tabButtonTextParent,
                        activeTab === "INCIDENTS" && styles.tabButtonTextActive,
                        activeTab === "INCIDENTS" && { color: "#DC2626" },
                      ]}
                      numberOfLines={1}
                    >
                      Sự cố ({tripIncidents.length})
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Keep staff labels and counts on one line; allow horizontal scrolling. */
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.tabScrollStaff}
                  contentContainerStyle={styles.tabBarStaff}
                >
                  <TouchableOpacity
                    onPress={() => setActiveTab("INFO")}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: activeTab === "INFO" }}
                    style={[
                      styles.tabButton,
                      styles.tabButtonParent,
                      styles.tabButtonStaff,
                      activeTab === "INFO" && staffTabBorder,
                    ]}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={15}
                      color={activeTab === "INFO" ? staffTabColor : colors.mutedText}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.tabButtonText,
                        styles.tabButtonTextParent,
                        styles.tabButtonTextStaff,
                        activeTab === "INFO" && staffTabText,
                      ]}
                    >
                      Thông tin
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setActiveTab("STOPS")}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: activeTab === "STOPS" }}
                    style={[
                      styles.tabButton,
                      styles.tabButtonParent,
                      styles.tabButtonStaff,
                      activeTab === "STOPS" && staffTabBorder,
                    ]}
                  >
                    <Ionicons
                      name="location-outline"
                      size={15}
                      color={activeTab === "STOPS" ? staffTabColor : colors.mutedText}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.tabButtonText,
                        styles.tabButtonTextParent,
                        styles.tabButtonTextStaff,
                        activeTab === "STOPS" && staffTabText,
                      ]}
                    >
                      Điểm đón ({trip.stops?.length || 0})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setActiveTab("ATTENDANCE")}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: activeTab === "ATTENDANCE" }}
                    style={[
                      styles.tabButton,
                      styles.tabButtonParent,
                      styles.tabButtonStaff,
                      activeTab === "ATTENDANCE" && staffTabBorder,
                    ]}
                  >
                    <Ionicons
                      name="checkbox-outline"
                      size={15}
                      color={activeTab === "ATTENDANCE" ? staffTabColor : colors.mutedText}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.tabButtonText,
                        styles.tabButtonTextParent,
                        styles.tabButtonTextStaff,
                        activeTab === "ATTENDANCE" && staffTabText,
                      ]}
                    >
                      Điểm danh ({attendance?.markedCount || 0}/
                      {attendance?.totalStudents || 0})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setActiveTab("INCIDENTS")}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: activeTab === "INCIDENTS" }}
                    style={[
                      styles.tabButton,
                      styles.tabButtonParent,
                      styles.tabButtonStaff,
                      activeTab === "INCIDENTS" &&
                        (staffTheme ? staffTabBorder : styles.tabButtonActiveIncident),
                    ]}
                  >
                    <Ionicons
                      name="warning-outline"
                      size={15}
                      color={activeTab === "INCIDENTS" ? incidentTabColor : colors.mutedText}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.tabButtonText,
                        styles.tabButtonTextParent,
                        styles.tabButtonTextStaff,
                        activeTab === "INCIDENTS" && staffTabText,
                        activeTab === "INCIDENTS" && !staffTheme && { color: "#DC2626" },
                      ]}
                    >
                      Sự cố ({tripIncidents.length})
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>

            {/* TAB 1: THÔNG TIN */}
            {activeTab === "INFO" && (
              <ScrollView
                style={styles.tabContentScroll}
                showsVerticalScrollIndicator={false}
              >
                {/* Xe */}
                <View style={styles.infoCard}>
                  <View style={styles.infoIconCircle}>
                    {isDriverOrAttendant ? (
                      <Ionicons name="bus-outline" size={24} color={staffTabColor} />
                    ) : (
                      <Image
                        source={require("@/assets/driver/Bus.png")}
                        style={{ width: 24, height: 24 }}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>Phương tiện đưa đón</Text>
                    <Text style={styles.infoTitle}>
                      {trip.vehiclePlate || "Chưa gán xe"}
                    </Text>
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
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.infoLabel}>Tài xế phụ trách</Text>
                    <Text style={styles.infoTitle}>
                      {trip.driverName || "Chưa gán tài xế"}
                    </Text>
                  </View>
                  <TripContactCallButton
                    phone={trip.driverPhone}
                    contactLabel="tài xế phụ trách"
                    staffTheme={staffTheme}
                  />
                </View>

                {/* Giáo viên */}
                <View style={styles.infoCard}>
                  <View style={styles.infoIconCircle}>
                    <Ionicons name="school-outline" size={20} color="#059669" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.infoLabel}>Giáo viên phụ xe</Text>
                    <Text style={styles.infoTitle}>
                      {trip.busAttendantName || "Chưa gán giáo viên"}
                    </Text>
                  </View>
                  <TripContactCallButton
                    phone={trip.busAttendantPhone}
                    contactLabel="giáo viên phụ xe"
                    staffTheme={staffTheme}
                  />
                </View>
              </ScrollView>
            )}

            {/* TAB 2: ĐIỂM ĐÓN (With Parent child absence reason display - D10) */}
            {activeTab === "STOPS" && (
              <ScrollView
                style={styles.tabContentScroll}
                showsVerticalScrollIndicator={false}
              >
                {visibleStops.length > 0 ? (
                  visibleStops.map((stop, idx) => {
                    const isParking =
                      stop.stopType === "PARKING_START" ||
                      stop.stopType === "PARKING_END";
                    const isSchool =
                      stop.stopType === "SCHOOL_ARRIVAL" ||
                      stop.stopType === "SCHOOL_DEPARTURE";

                    return (
                      <View
                        key={stop.id || idx}
                        style={[
                          styles.stopTimelineRow,
                          idx === visibleStops.length - 1 &&
                            styles.stopTimelineLastRow,
                        ]}
                      >
                        <View style={styles.stopTimelineRail}>
                          {idx < visibleStops.length - 1 && (
                            <View style={styles.stopTimelineConnector} />
                          )}
                          <View style={styles.stopOrderCircle}>
                            <Text style={styles.stopOrderText}>
                              {stop.stopOrder}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.stopCard}>
                          <View style={styles.stopHeaderRow}>
                            <Text style={styles.stopName}>
                              {isParking
                                ? "Bãi xe trung tâm"
                                : isSchool
                                  ? trip.schoolName
                                  : stop.studentName || "Điểm đón học sinh"}
                            </Text>

                            {stop.plannedArrivalTime ? (
                              <Text style={styles.stopEta}>
                                {stop.plannedArrivalTime}
                              </Text>
                            ) : null}
                          </View>

                          <Text style={styles.stopAddress}>
                            {stop.addressText}
                          </Text>

                          {/* D10: Parent sees attendance status and absence reason for OWN child */}
                          {isParent && stop.isMyChild && (
                            <View style={styles.childAttendanceStatusBox}>
                              <Ionicons
                                name={
                                  stop.attendanceStatus === "PRESENT"
                                    ? "checkmark-circle"
                                    : stop.attendanceStatus === "ABSENT"
                                      ? "close-circle"
                                      : "time-outline"
                                }
                                size={15}
                                color={
                                  stop.attendanceStatus === "PRESENT"
                                    ? "#15803D"
                                    : stop.attendanceStatus === "ABSENT"
                                      ? "#B91C1C"
                                      : "#B45309"
                                }
                              />
                              <Text
                                style={[
                                  styles.childAttendanceStatusText,
                                  {
                                    color:
                                      stop.attendanceStatus === "PRESENT"
                                        ? "#15803D"
                                        : stop.attendanceStatus === "ABSENT"
                                          ? "#B91C1C"
                                          : "#B45309",
                                  },
                                ]}
                              >
                                {stop.attendanceStatus === "PRESENT"
                                  ? operationalState?.children?.find(
                                      (child) =>
                                        child.studentId === stop.studentId,
                                    )?.isAlighted
                                    ? "Đã xuống xe an toàn"
                                    : "Đã có mặt trên xe"
                                  : stop.attendanceStatus === "ABSENT"
                                    ? `Vắng mặt: ${stop.absenceReason || "Không có lý do"}`
                                    : "Chưa điểm danh"}
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
            {activeTab === "ATTENDANCE" && isDriverOrAttendant && (
              <View style={{ flex: 1 }}>
                {/* Sub Tab Switcher: Lên xe / Xuống xe */}
                <View style={styles.subTabBar}>
                  <TouchableOpacity
                    style={[
                      styles.subTabButton,
                      attendanceSubTab === "boarding" &&
                        attendanceTabBackground,
                    ]}
                    onPress={() => setAttendanceSubTab("boarding")}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.subTabButtonText,
                        attendanceSubTab === "boarding" &&
                          styles.subTabButtonTextActive,
                        attendanceSubTab === "boarding" && buttons?.secondaryText,
                      ]}
                    >
                      Lên xe ({attendance?.markedCount || 0}/
                      {attendance?.totalStudents || 0})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.subTabButton,
                      attendanceSubTab === "alighting" &&
                        attendanceTabBackground,
                    ]}
                    onPress={() => setAttendanceSubTab("alighting")}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.subTabButtonText,
                        attendanceSubTab === "alighting" &&
                          styles.subTabButtonTextActive,
                        attendanceSubTab === "alighting" && buttons?.secondaryText,
                      ]}
                    >
                      Xuống xe ({attendance?.alightedCount || 0}/
                      {attendance?.presentCount || 0})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* SUB-TAB 1: LÊN XE (BOARDING) */}
                {attendanceSubTab === "boarding" && (
                  <View style={{ flex: 1 }}>
                    {/* Header with progress & QR scanner launcher */}
                    <View style={styles.attendanceHeaderBar}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.attendanceProgressText}>
                          Tiến độ lên xe: {attendance?.markedCount || 0}/
                          {attendance?.totalStudents || 0} học sinh
                        </Text>
                        <View style={styles.progressBarBg}>
                          <View
                            style={[
                              styles.progressBarFill,
                              isBusAttendant && attendantButtons.primary,
                              {
                                width: `${
                                  attendance?.totalStudents
                                    ? Math.round(
                                        ((attendance.markedCount || 0) /
                                          attendance.totalStudents) *
                                          100,
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
                          accessibilityRole="button"
                          style={[
                            styles.qrHeaderBtn,
                            canScanQr ? attendantButtons.selected : attendantButtons.disabled,
                            !canScanQr && { borderColor: attendantTheme.colors.disabled },
                          ]}
                          disabled={!canScanQr}
                          onPress={async () => {
                            const version = qrGeneration.current;
                            if (!cameraPermission?.granted) {
                              await requestCameraPermission();
                            }
                            if (
                              version !== qrGeneration.current ||
                              !accessAllowed.current
                            )
                              return;
                            setQrModalVisible(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name="qr-code-outline"
                            size={16}
                            color={canScanQr ? attendantTheme.colors.primary : attendantTheme.colors.disabledText}
                          />
                          <Text style={[styles.qrHeaderBtnText,
                            canScanQr ? attendantButtons.secondaryText : attendantButtons.disabledText]}>Quét QR</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Roster Scroll List */}
                    <KeyboardScrollView
                      style={styles.tabContentScroll}
                      showsVerticalScrollIndicator={false}
                    >
                      {isBusAttendant && trip && !error && !terminal && (
                        <RfidAttendanceEntry
                          key={`${identity}:boarding`}
                          identity={identity}
                          tripId={tripId}
                          phaseFilter="BOARDING"
                          runMutation={mutate}
                          onUpdated={() => loadTripDetail()}
                        />
                      )}
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
                          <TouchableOpacity onPress={() => setSearchQuery("")}>
                            <Ionicons
                              name="close-circle"
                              size={16}
                              color="#94A3B8"
                            />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                      {filteredRoster.length > 0 ? (
                        filteredRoster.map((student) => {
                          const isUnmarked = student.status === "UNMARKED";
                          const isPresent = student.status === "PRESENT";
                          const isAbsent = student.status === "ABSENT";
                          const canBoard = isToSchool
                            ? operationalState?.status === "IN_PROGRESS" && !operationalState.isSchoolArrived
                            : (operationalState?.status === "SCHEDULED" &&
                                operationalState?.isAttendantReady) ||
                              operationalState?.status === "IN_PROGRESS";
                          const canReset = isToSchool
                            ? !operationalState?.isSchoolArrived
                            : operationalState?.status === "SCHEDULED";

                          return (
                            <View
                              key={student.studentId}
                              style={styles.rosterCard}
                            >
                              {/* Student Header */}
                              <View style={styles.rosterCardHeader}>
                                <View style={styles.rosterOrderCircle}>
                                  <Text style={styles.rosterOrderText}>
                                    {student.stopOrder}
                                  </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.rosterStudentName}>
                                    {student.fullName}
                                  </Text>
                                  <Text style={styles.rosterStudentCode}>
                                    {student.studentCode} • Dự kiến:{" "}
                                    {student.plannedArrivalTime || "—"}
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
                                    {isPresent
                                      ? "Có mặt"
                                      : isAbsent
                                        ? "Vắng mặt"
                                        : "Chưa điểm danh"}
                                  </Text>
                                </View>
                              </View>

                              <Text
                                style={styles.rosterAddress}
                                numberOfLines={1}
                              >
                                {student.addressText}
                              </Text>

                              {/* Absence reason display if absent */}
                              {isAbsent && student.absenceReason ? (
                                <View style={styles.rosterAbsenceReason}>
                                  <Text style={styles.rosterAbsenceReasonLabel}>
                                    Lý do:
                                  </Text>
                                  <Text style={styles.rosterAbsenceReasonText}>
                                    {student.absenceReason}
                                  </Text>
                                </View>
                              ) : null}

                              {/* Mutation Buttons (Bus Attendant only) */}
                              {isBusAttendant && canCorrectAttendance(trip.direction, operationalState, student) && (
                                <TouchableOpacity
                                  accessibilityRole="button"
                                  style={[styles.actionBtnSwitch, styles.standaloneTripAction]}
                                  onPress={() => {
                                    setReasonText("");
                                    setReasonAction({
                                      kind: "correction",
                                      student,
                                      status: student.status === "PRESENT" ? "ABSENT" : "PRESENT",
                                    });
                                  }}
                                >
                                  <Text style={[styles.actionBtnTextDark, attendantButtons.secondaryText]}>Đính chính điểm danh</Text>
                                </TouchableOpacity>
                              )}
                              {isBusAttendant && !correctingAttendance && (
                                <View style={styles.rosterActionRow}>
                                  {isUnmarked ? (
                                    <>
                                      <TouchableOpacity
                                        style={[
                                          styles.actionBtnAbsent,
                                          !canBoard && attendantButtons.disabled,
                                        ]}
                                        disabled={!canBoard}
                                        onPress={() =>
                                          handleOpenAbsenceModal(student)
                                        }
                                      >
                                        <Ionicons
                                          name="close"
                                          size={14}
                                          color={canBoard ? attendantTheme.colors.primary : attendantTheme.colors.disabledText}
                                        />
                                        <Text style={[styles.actionBtnTextLight,
                                          canBoard ? attendantButtons.secondaryText : attendantButtons.disabledText]}>
                                          Vắng mặt
                                        </Text>
                                      </TouchableOpacity>

                                      <TouchableOpacity
                                        style={[
                                          styles.actionBtnPresent,
                                          !canBoard && attendantButtons.disabled,
                                        ]}
                                        disabled={!canBoard}
                                        onPress={() =>
                                          handleMarkPresent(student)
                                        }
                                      >
                                        <Ionicons
                                          name="checkmark"
                                          size={14}
                                          color={canBoard ? colors.surface : attendantTheme.colors.disabledText}
                                        />
                                        <Text style={[styles.actionBtnTextLight,
                                          canBoard ? attendantButtons.primaryText : attendantButtons.disabledText]}>
                                          Có mặt
                                        </Text>
                                      </TouchableOpacity>
                                    </>
                                  ) : isPresent ? (
                                    <>
                                      <TouchableOpacity
                                        style={[
                                          styles.actionBtnSwitch,
                                          (!canBoard || student.isAlighted) && attendantButtons.disabled,
                                        ]}
                                        disabled={
                                          !canBoard ||
                                          Boolean(student.isAlighted)
                                        }
                                        onPress={() =>
                                          handleOpenAbsenceModal(student)
                                        }
                                      >
                                        <Text style={[styles.actionBtnTextDark,
                                          canBoard && !student.isAlighted ? attendantButtons.secondaryText : attendantButtons.disabledText]}>
                                          Đổi vắng
                                        </Text>
                                      </TouchableOpacity>

                                      <TouchableOpacity
                                        style={[
                                          styles.actionBtnReset,
                                          (!canBoard || !canReset) && styles.attendantOutlineDisabled,
                                        ]}
                                        disabled={!canBoard || !canReset}
                                        onPress={() =>
                                          handleResetUnmarked(student)
                                        }
                                      >
                                        <Text style={[styles.actionBtnTextDark,
                                          canBoard && canReset ? attendantButtons.secondaryText : attendantButtons.disabledText]}>
                                          Hoàn tác
                                        </Text>
                                      </TouchableOpacity>
                                    </>
                                  ) : (
                                    <>
                                      <TouchableOpacity
                                        style={[
                                          styles.actionBtnSwitch,
                                          !canBoard && attendantButtons.disabled,
                                        ]}
                                        disabled={!canBoard}
                                        onPress={() =>
                                          handleMarkPresent(student)
                                        }
                                      >
                                        <Text style={[styles.actionBtnTextDark, canBoard ? attendantButtons.secondaryText : attendantButtons.disabledText]}>
                                          Đổi có mặt
                                        </Text>
                                      </TouchableOpacity>

                                      <TouchableOpacity
                                        style={[
                                          styles.actionBtnReset,
                                          (!canBoard || !canReset) && styles.attendantOutlineDisabled,
                                        ]}
                                        disabled={!canBoard || !canReset}
                                        onPress={() =>
                                          handleResetUnmarked(student)
                                        }
                                      >
                                        <Text style={[styles.actionBtnTextDark,
                                          canBoard && canReset ? attendantButtons.secondaryText : attendantButtons.disabledText]}>
                                          Hoàn tác
                                        </Text>
                                      </TouchableOpacity>
                                    </>
                                  )}
                                </View>
                              )}
                            </View>
                          );
                        })
                      ) : (
                        <Text style={styles.emptyStopsText}>
                          Không tìm thấy học sinh
                        </Text>
                      )}
                    </KeyboardScrollView>
                  </View>
                )}

                {/* SUB-TAB 2: XUỐNG XE (ALIGHTING) */}
                {attendanceSubTab === "alighting" && (
                  <View style={{ flex: 1 }}>
                    {/* Alighting Progress Bar */}
                    <View style={styles.attendanceHeaderBar}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.attendanceProgressText}>
                          Tiến độ xuống xe:{" "}
                          {attendance?.alightedCount || 0}/
                          {attendance?.presentCount || 0} học sinh có mặt
                        </Text>
                        <View style={styles.progressBarBg}>
                          <View
                            style={[
                              styles.progressBarFill,
                              isBusAttendant && attendantButtons.primary,
                              {
                                backgroundColor: "#0284C7",
                                width: `${
                                  attendance?.presentCount
                                    ? Math.round(
                                        ((attendance.alightedCount || 0) /
                                          attendance.presentCount) *
                                          100,
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
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color="#D97706"
                        />
                        <Text style={styles.alightingNoticeText}>
                          Chờ tài xế xác nhận xe đến trường để mở xác nhận học
                          sinh xuống xe.
                        </Text>
                      </View>
                    )}

                    {/* Scroll List of PRESENT students only */}
                    <ScrollView
                      style={styles.tabContentScroll}
                      showsVerticalScrollIndicator={false}
                    >
                      {isBusAttendant && trip && !error && !terminal && (
                        <RfidAttendanceEntry
                          key={`${identity}:alighting`}
                          identity={identity}
                          tripId={tripId}
                          phaseFilter="ALIGHTING"
                          runMutation={mutate}
                          onUpdated={() => loadTripDetail()}
                        />
                      )}
                      {filteredRoster.filter((s) => s.status === "PRESENT")
                        .length > 0 ? (
                        filteredRoster
                          .filter((s) => s.status === "PRESENT")
                          .map((student) => {
                            const isAlighted = Boolean(student.isAlighted);
                            const canAlight =
                              operationalState?.status === "IN_PROGRESS" &&
                              (!isToSchool ||
                                Boolean(operationalState?.isSchoolArrived));

                            return (
                              <View
                                key={student.studentId}
                                style={styles.rosterCard}
                              >
                                <View style={styles.rosterCardHeader}>
                                  <View style={styles.rosterOrderCircle}>
                                    <Text style={styles.rosterOrderText}>
                                      {student.stopOrder}
                                    </Text>
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.rosterStudentName}>
                                      {student.fullName}
                                    </Text>
                                    <Text style={styles.rosterStudentCode}>
                                      {student.studentCode} •{" "}
                                      {student.addressText}
                                    </Text>
                                  </View>
                                  <View
                                    style={[
                                      styles.rosterStatusBadge,
                                      isAlighted
                                        ? styles.badgeAlighted
                                        : styles.badgeNotAlighted,
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.rosterStatusText,
                                        isAlighted
                                          ? styles.textAlighted
                                          : styles.textNotAlighted,
                                      ]}
                                    >
                                      {isAlighted
                                        ? "Đã xuống xe"
                                        : "Chưa xuống xe"}
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
                                          !canAlight && attendantButtons.disabled,
                                        ]}
                                        disabled={!canAlight}
                                        onPress={() =>
                                          handleToggleAlighting(student, true)
                                        }
                                        activeOpacity={0.85}
                                      >
                                        <Ionicons
                                          name="walk-outline"
                                          size={15}
                                          color={canAlight ? colors.surface : attendantTheme.colors.disabledText}
                                        />
                                        <Text style={[styles.actionBtnTextLight,
                                          canAlight ? attendantButtons.primaryText : attendantButtons.disabledText]}>
                                          Xác nhận xuống xe
                                        </Text>
                                      </TouchableOpacity>
                                    ) : (
                                      <TouchableOpacity
                                        style={[
                                          styles.actionBtnReset,
                                          !canAlight && styles.attendantOutlineDisabled,
                                        ]}
                                        disabled={!canAlight}
                                        onPress={() =>
                                          handleToggleAlighting(student, false)
                                        }
                                        activeOpacity={0.85}
                                      >
                                        <Text style={[styles.actionBtnTextDark, canAlight ? attendantButtons.secondaryText : attendantButtons.disabledText]}>
                                          Hoàn tác
                                        </Text>
                                      </TouchableOpacity>
                                    )}
                                    {!isToSchool && canAlight && !isAlighted && !student.alightedAt && (
                                      <TouchableOpacity
                                        accessibilityRole="button"
                                        style={[styles.actionBtnSwitch, styles.reportStudentAction]}
                                        onPress={() => {
                                          setIncidentNote("");
                                          setIncidentReport({ type: "NO_GUARDIAN_AT_STOP", student });
                                        }}
                                      >
                                        <Text style={[styles.actionBtnTextDark, attendantButtons.secondaryText]}>Báo không có người đón</Text>
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                )}
                              </View>
                            );
                          })
                      ) : (
                        <Text style={styles.emptyStopsText}>
                          Chưa có học sinh nào có mặt trên xe
                        </Text>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {/* TAB 4: SỰ CỐ VẬN HÀNH */}
            {activeTab === "INCIDENTS" && (
              <ScrollView
                style={styles.tabContentScroll}
                showsVerticalScrollIndicator={false}
              >
                {/* Báo sự cố */}
                {isDriverOrAttendant && operationalState?.status === "SCHEDULED" && (
                    <TouchableOpacity
                      style={[
                        styles.reportIncidentButton,
                        buttons?.secondary,
                        incidentOptions &&
                          !incidentOptions.canReport &&
                          (buttons?.disabled ?? styles.reportIncidentButtonDisabled),
                      ]}
                      onPress={() => {
                        if (!incidentOptions) {
                          loadTripDetail();
                          Alert.alert("Chưa tải được điều kiện báo sự cố", "Vui lòng thử lại.");
                          return;
                        }
                        if (!incidentOptions.canReport) {
                          const reasonMap: Record<string, string> = {
                            ATTENDANT_ALREADY_READY:
                              "Giáo viên phụ xe đã xác nhận sẵn sàng khởi hành.",
                            ALREADY_REPORTED:
                              "Đang có báo cáo sự cố chưa được xử lý.",
                            TRIP_NOT_SCHEDULED:
                              "Chuyến xe đã bắt đầu hoặc không ở trạng thái chờ khởi hành.",
                            TOO_EARLY: `Chưa đến khung giờ báo sự cố (bắt đầu từ ${
                              incidentOptions.reportAvailableAt
                                ? new Date(
                                    incidentOptions.reportAvailableAt,
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "15 phút trước giờ chạy"
                            }).`,
                            SCHEDULED_END_TIME_EXCEEDED:
                              "Chuyến xe đã quá giờ kết thúc dự kiến.",
                            NOT_ASSIGNED_DRIVER:
                              "Bạn không phải tài xế được phân công cho chuyến này.",
                            NOT_ASSIGNED_ATTENDANT:
                              "Bạn không phải phụ xe được phân công cho chuyến này.",
                            MISSING_SCHEDULE_TIMES:
                              "Chuyến xe chưa có thông tin giờ bắt đầu/kết thúc lịch trình.",
                          };
                          Alert.alert(
                            "Không thể báo sự cố",
                            reasonMap[incidentOptions.disabledReason || ""] ||
                              "Hiện tại chuyến xe chưa đủ điều kiện để báo sự cố.",
                          );
                          return;
                        }
                        setIncidentNote("");
                        setIncidentReport({ type: isDriver ? "ATTENDANT_MISSING" : "DRIVER_MISSING" });
                      }}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name="warning"
                        size={15}
                        color={mapActionColor}
                      />
                      <Text style={[styles.reportIncidentButtonText, buttons?.secondaryText]}>
                        Báo sự cố
                      </Text>
                    </TouchableOpacity>
                  )}
                {isDriverOrAttendant && operationalState?.status === "IN_PROGRESS" && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[styles.reportIncidentButton, buttons?.secondary]}
                    onPress={() => {
                      setIncidentNote("");
                      setIncidentReport({ type: "TRAFFIC_DELAY" });
                    }}
                  >
                    <Ionicons name="warning" size={15} color={mapActionColor} />
                    <Text style={[styles.reportIncidentButtonText, buttons?.secondaryText]}>
                      Báo tắc đường
                    </Text>
                  </TouchableOpacity>
                )}
                {tripIncidents.length === 0 ? (
                  <View style={styles.emptyIncidentsBox}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={40}
                      color="#10B981"
                    />
                    <Text style={styles.emptyIncidentsTitle}>
                      Không có sự cố
                    </Text>
                    <Text style={styles.emptyIncidentsSubtitle}>
                      Chuyến xe này không ghi nhận sự cố vận hành nào.
                    </Text>
                  </View>
                ) : (
                  tripIncidents.map((incident) => {
                    const isOffRoute = incident.type === "OFF_ROUTE";
                    const isLateStop = incident.type === "LATE_STOP";
                    const typeBadgeText = incidentTypeLabels[incident.type] ?? incident.type;

                    const typeBadgeBg = isOffRoute
                      ? "#FEE2E2"
                      : isLateStop
                        ? "#FFEDD5"
                        : "#FEF3C7";
                    const typeBadgeColor = isOffRoute
                      ? "#DC2626"
                      : isLateStop
                        ? "#C2410C"
                        : "#B45309";

                    const isPendingConfirmation =
                      incident.status === "WAITING_CONFIRMATION" ||
                      incident.status === ("PENDING_CONFIRMATION" as any);
                    const statusBadgeText = incidentStatusLabel(incident);

                    const statusBadgeBg =
                      incident.status === "WAITING_ASSIGNMENT"
                        ? "#FEF3C7"
                        : isPendingConfirmation
                          ? "#EFF6FF"
                          : incident.status === "RESOLVED" ||
                              incident.status === "CONFIRMED"
                            ? "#DCFCE7"
                            : "#F1F5F9";

                    const statusBadgeColor =
                      incident.status === "WAITING_ASSIGNMENT"
                        ? "#B45309"
                        : isPendingConfirmation
                          ? "#1D4ED8"
                          : incident.status === "RESOLVED" ||
                              incident.status === "CONFIRMED"
                            ? "#15803D"
                            : "#64748B";

                    return (
                      <View key={incident.id} style={styles.incidentTripCard}>
                        <View style={styles.incidentCardHeader}>
                          <View
                            style={[
                              styles.badgePill,
                              { backgroundColor: typeBadgeBg },
                            ]}
                          >
                            <Ionicons
                              name="warning-outline"
                              size={13}
                              color={typeBadgeColor}
                            />
                            <Text
                              style={[
                                styles.badgePillText,
                                { color: typeBadgeColor },
                              ]}
                            >
                              {typeBadgeText}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.badgePill,
                              { backgroundColor: statusBadgeBg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.badgePillText,
                                { color: statusBadgeColor },
                              ]}
                            >
                              {statusBadgeText}
                            </Text>
                          </View>
                        </View>

                        {!isParent && incident.description ? (
                          <Text style={styles.incidentDesc}>
                            {incident.description}
                          </Text>
                        ) : null}

                        {!isParent && incident.contextData && (
                          <View style={styles.incidentContextBox}>
                            {incident.contextData.recordedDistanceMeters !==
                              undefined && (
                              <Text style={styles.incidentContextItem}>
                                • Khoảng cách lệch:{" "}
                                {Math.round(
                                  incident.contextData.recordedDistanceMeters,
                                )}
                                m
                              </Text>
                            )}
                            {incident.contextData.recordedDelayMinutes !==
                              undefined && (
                              <Text style={styles.incidentContextItem}>
                                • Dự kiến trễ:{" "}
                                {Math.round(
                                  incident.contextData.recordedDelayMinutes,
                                )}{" "}
                                phút
                              </Text>
                            )}
                          </View>
                        )}

                        {!isParent && incident.resolutionType && (
                          <View style={styles.incidentResBox}>
                            <Text style={styles.incidentResLabel}>
                              Xử lý:{" "}
                              {incident.resolutionType === "ARRIVED"
                                ? "Nhân sự đã có mặt"
                                : incident.resolutionType === "REPLACED"
                                  ? `Thay thế: ${incident.replacementUserName || "Người khác"}`
                                  : incident.resolutionType === "CANCELLED_TRIP"
                                    ? "Đã hủy chuyến"
                                    : incident.resolutionType === "CONFIRMED"
                                      ? "Phụ xe đã giải trình"
                                      : incident.resolutionType}
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
                            {new Date(incident.createdAt).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}{" "}
                            •{" "}
                            {new Date(incident.createdAt).toLocaleDateString(
                              "vi-VN",
                            )}
                          </Text>

                          {isBusAttendant && isPendingConfirmation && (
                            <TouchableOpacity
                              style={styles.incidentConfirmSmallBtn}
                              onPress={() => setActiveConfirmIncident(incident)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.incidentConfirmSmallBtnText}>
                                Giải trình ngay
                              </Text>
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

      {showTripAction && (
        <View
          onLayout={(event) =>
            setBottomActionHeight(event.nativeEvent.layout.height)
          }
          style={[
            styles.fixedBottomActionContainer,
            { paddingBottom: insets.bottom + 8 },
          ]}
        >
          {isBusAttendant ? (
            /* BUS ATTENDANT ACTION */
            operationalState?.status === "SCHEDULED" ? (
              operationalState.isAttendantReady ? (
                <View style={styles.readyActions}>
                  <View style={styles.readyBadgeRow}>
                    <Ionicons name="checkmark-circle" size={20} color="#059669" />
                    <Text style={styles.readyBadgeText}>Đã xác nhận sẵn sàng</Text>
                  </View>
                  {showCancelAllAbsent && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={[styles.actionBtnSwitch, styles.standaloneTripAction]}
                      onPress={() => {
                        setReasonText("");
                        setReasonAction({ kind: "cancel" });
                      }}
                    >
                      <Text style={[styles.actionBtnTextDark, attendantButtons.secondaryText]}>Hủy chuyến vì tất cả vắng</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canReady }}
                  style={[
                    styles.primaryActionBtn,
                    canReady ? attendantButtons.primary : attendantButtons.disabled,
                  ]}
                  disabled={!canReady}
                  onPress={handleMarkReady}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="hand-right-outline"
                    size={18}
                    color={canReady ? colors.surface : attendantTheme.colors.disabledText}
                  />
                  <Text style={[styles.primaryActionBtnText,
                    canReady ? attendantButtons.primaryText : attendantButtons.disabledText]}>
                    {canReady ? "Xác nhận sẵn sàng" : readyDisabledText}
                  </Text>
                </TouchableOpacity>
              )
            ) : null
          ) : isDriver ? (
            /* DRIVER ACTION */
            operationalState?.status === "SCHEDULED" ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ disabled: !canStart }}
                style={[
                  styles.primaryActionBtn,
                  canStart ? buttons?.primary : buttons?.disabled,
                ]}
                disabled={!canStart}
                onPress={handleStartTrip}
                activeOpacity={0.85}
              >
                <Ionicons name="play" size={18} color={canStart ? colors.surface : staffTheme?.colors.disabledText} />
                <Text style={[styles.primaryActionBtnText, canStart ? buttons?.primaryText : buttons?.disabledText]}>
                  {canStart ? "Bắt đầu chuyến xe" : startDisabledText}
                </Text>
              </TouchableOpacity>
            ) : operationalState?.status === "IN_PROGRESS" ? (
              isToSchool && !operationalState?.isSchoolArrived ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canArriveAtSchool }}
                  style={[
                    styles.primaryActionBtn,
                    canArriveAtSchool ? buttons?.primary : buttons?.disabled,
                  ]}
                  disabled={!canArriveAtSchool}
                  onPress={handleArriveAtSchool}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="school-outline"
                    size={18}
                    color={canArriveAtSchool ? colors.surface : staffTheme?.colors.disabledText}
                  />
                  <Text style={[styles.primaryActionBtnText, canArriveAtSchool ? buttons?.primaryText : buttons?.disabledText]}>
                    {canArriveAtSchool
                      ? "Xác nhận đến trường"
                      : arriveDisabledText}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canComplete }}
                  style={[
                    styles.primaryActionBtn,
                    canComplete ? buttons?.primary : buttons?.disabled,
                  ]}
                  disabled={!canComplete}
                  onPress={handleCompleteTrip}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="flag-outline"
                    size={18}
                    color={canComplete ? colors.surface : staffTheme?.colors.disabledText}
                  />
                  <Text style={[styles.primaryActionBtnText, canComplete ? buttons?.primaryText : buttons?.disabledText]}>
                    {canComplete
                      ? "Hoàn thành chuyến xe"
                      : completeDisabledText}
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
                  style={[styles.modalConfirmBtn, buttons?.primary]}
                  onPress={confirmModal.onConfirm}
                >
                  <Text style={[styles.modalConfirmBtnText, buttons?.primaryText]}>
                    {confirmModal.confirmText}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, buttons?.secondary]}
                  onPress={() => setConfirmModal(null)}
                >
                  <Text style={[styles.modalCancelBtnText, buttons?.secondaryText]}>Hủy bỏ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {reasonAction && (
        <Modal transparent animationType="fade" visible onRequestClose={() => { if (!submittingReason) setReasonAction(null); }}>
          <KeyboardScrollView
            style={[styles.modalOverlay, { alignItems: undefined, justifyContent: undefined }]}
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {reasonAction.kind === "cancel" ? "Hủy chuyến" :
                  reasonAction.kind === "correction" ? "Đính chính điểm danh" : "Lý do vắng mặt"}
              </Text>
              {"student" in reasonAction && (
                <Text style={styles.modalSubtitle}>{reasonAction.student.fullName}</Text>
              )}
              {reasonAction.kind === "correction" && (
                <View style={styles.rosterActionRow}>
                  {(["PRESENT", "ABSENT"] as const).map((status) => (
                    <TouchableOpacity
                      key={status}
                      accessibilityRole="button"
                      accessibilityState={{ selected: status === reasonAction.status, disabled: submittingReason || status === reasonAction.student.status }}
                      style={[styles.actionBtnSwitch,
                        submittingReason || status === reasonAction.student.status ? attendantButtons.disabled :
                          status === reasonAction.status ? attendantButtons.selected : attendantButtons.secondary]}
                      disabled={submittingReason || status === reasonAction.student.status}
                      onPress={() => setReasonAction({ ...reasonAction, status })}
                    >
                      <Text style={[styles.actionBtnTextDark, submittingReason || status === reasonAction.student.status
                        ? attendantButtons.disabledText : attendantButtons.secondaryText]}>
                        {status === reasonAction.status ? "✓ " : ""}{status === "PRESENT" ? "Có mặt" : "Vắng mặt"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <TextInput
                style={styles.absenceInput}
                placeholder="Nhập lý do"
                accessibilityLabel="Lý do"
                placeholderTextColor="#94A3B8"
                multiline
                maxLength={500}
                editable={!submittingReason}
                value={reasonText}
                onChangeText={setReasonText}
              />
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ disabled: reasonDisabled, busy: submittingReason }}
                  disabled={reasonDisabled}
                  style={[styles.modalConfirmBtn, reasonDisabled ? attendantButtons.disabled : attendantButtons.primary,
                    reasonAction.kind === "cancel" && !reasonDisabled && styles.cancelTripConfirmBtn]}
                  onPress={handleSubmitReason}
                >
                  <Text style={[styles.modalConfirmBtnText, reasonDisabled ? attendantButtons.disabledText : attendantButtons.primaryText]}>
                    {submittingReason ? "Đang lưu…" : reasonAction.kind === "cancel" ? "Xác nhận hủy" : "Xác nhận"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" disabled={submittingReason} style={[styles.modalCancelBtn, submittingReason ? attendantButtons.disabled : attendantButtons.secondary]}
                  onPress={() => setReasonAction(null)}>
                  <Text style={[styles.modalCancelBtnText, submittingReason ? attendantButtons.disabledText : attendantButtons.secondaryText]}>Đóng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardScrollView>
        </Modal>
      )}

      {/* QR Scanner Modal (D08: Student.code QR scanner) */}
      <Modal transparent animationType="slide" visible={qrModalVisible}>
        <KeyboardScrollView
          style={styles.qrModalContainer}
          contentContainerStyle={{ flexGrow: 1 }}
        >
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
              <Text style={styles.qrVerifyName}>
                {verifiedStudent.fullName}
              </Text>
              <Text style={styles.qrVerifyCode}>
                Mã: {verifiedStudent.studentCode}
              </Text>
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
                  <Text style={styles.qrVerifyConfirmText}>
                    Xác nhận có mặt
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.qrCameraContainer}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: ["qr"],
                }}
                onBarcodeScanned={(result) => {
                  if (result.data) {
                    handleScanQr(result.data);
                  }
                }}
              />
              <View style={styles.qrOverlayFrame}>
                <View style={styles.qrTargetBox} />
                <Text style={styles.qrGuideText}>
                  Căn chỉnh mã QR học sinh vào giữa khung
                </Text>
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
        visible={Boolean(incidentReport)}
        onRequestClose={() => {
          Keyboard.dismiss();
          setIncidentReport(null);
          setIncidentNote("");
        }}
      >
        <KeyboardScrollView
          style={[
            styles.modalOverlay,
            { alignItems: undefined, justifyContent: undefined },
          ]}
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={Keyboard.dismiss}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={[styles.badgePill, { backgroundColor: "#FEE2E2" }]}>
                <Ionicons name="warning" size={14} color="#DC2626" />
                <Text style={[styles.badgePillText, { color: "#DC2626" }]}>
                  Báo sự cố vận hành
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setIncidentReport(null);
                  setIncidentNote("");
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
                {trip?.serviceDate} • {trip?.vehiclePlate || "—"} •{" "}
                {isToSchool ? "Chiều đi" : "Chiều về"}
              </Text>
            </View>

            {/* Incident Type display */}
            <View style={styles.incidentTargetBox}>
              <Text style={styles.incidentTargetLabel}>
                Loại sự cố báo cáo:
              </Text>
              <Text style={styles.incidentTargetValue}>
                {incidentReport && incidentTypeLabels[incidentReport.type]}
              </Text>
              {incidentReport?.student && (
                <Text style={styles.incidentTargetSub}>{incidentReport.student.fullName}</Text>
              )}
              {(incidentReport?.type === "ATTENDANT_MISSING" || incidentReport?.type === "DRIVER_MISSING") &&
                (incidentOptions?.expectedAssignee ||
                  (isDriver ? trip?.busAttendantName : trip?.driverName)) && (
                <Text style={styles.incidentTargetSub}>
                  Nhân sự dự kiến:{" "}
                  {incidentOptions?.expectedAssignee?.fullName ||
                    (isDriver ? trip?.busAttendantName : trip?.driverName)}
                </Text>
              )}
            </View>

            {/* Note input Header with Dismiss Button */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={styles.incidentTargetLabel}>Ghi chú thêm:</Text>
              <TouchableOpacity
                onPress={Keyboard.dismiss}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[styles.keyboardDismissBtn, buttons?.secondary]}
              >
                <Ionicons
                  name="chevron-down-outline"
                  size={13}
                  color={staffAccent ?? colors.mutedText}
                />
                <Text style={[styles.keyboardDismissBtnText, buttons?.secondaryText]}>Ẩn phím</Text>
              </TouchableOpacity>
            </View>

            {/* Note input */}
            <TextInput
              style={styles.incidentNoteInput}
              placeholder="Nhập ghi chú chi tiết về tình huống (không bắt buộc)..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              maxLength={500}
              value={incidentNote}
              onChangeText={setIncidentNote}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalConfirmBtn,
                  reportingIncident ? buttons?.disabled : buttons?.primary]}
                onPress={() => {
                  Keyboard.dismiss();
                  handleReportIncident();
                }}
                disabled={reportingIncident}
              >
                {reportingIncident ? (
                  <ActivityIndicator size="small" color={staffTheme?.colors.disabledText ?? colors.foreground} />
                ) : (
                  <Text style={[styles.modalConfirmBtnText, buttons?.primaryText]}>Gửi báo cáo</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalCancelBtn, buttons?.secondary]}
                onPress={() => {
                  Keyboard.dismiss();
                  setIncidentReport(null);
                  setIncidentNote("");
                }}
                disabled={reportingIncident}
              >
                <Text style={[styles.modalCancelBtnText, buttons?.secondaryText]}>Hủy bỏ</Text>
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
          setConfirmReason("");
        }}
      >
        <KeyboardScrollView
          style={[
            styles.modalOverlay,
            { alignItems: undefined, justifyContent: undefined },
          ]}
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={Keyboard.dismiss}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={[styles.badgePill, { backgroundColor: "#FFEDD5" }]}>
                <Ionicons name="alert-circle" size={14} color="#C2410C" />
                <Text style={[styles.badgePillText, { color: "#C2410C" }]}>
                  {activeConfirmIncident?.type === "OFF_ROUTE"
                    ? "Xác nhận lệch tuyến"
                    : "Xác nhận trễ đón/trả"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setActiveConfirmIncident(null);
                  setConfirmReason("");
                }}
                disabled={confirmingIncident}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.confirmModalTitle}>
              Giải trình sự cố tự động
            </Text>
            <Text style={styles.confirmModalDesc}>
              {activeConfirmIncident?.description ||
                "Hệ thống phát hiện dấu hiệu bất thường trong quá trình di chuyển."}
            </Text>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={styles.confirmReasonLabel}>
                Lý do / Giải trình (bắt buộc):
              </Text>
              <TouchableOpacity
                onPress={Keyboard.dismiss}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.keyboardDismissBtn}
              >
                <Ionicons
                  name="chevron-down-outline"
                  size={13}
                  color="#64748B"
                />
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
                style={[
                  styles.modalConfirmBtn,
                  autoConfirmDisabled ? attendantButtons.disabled : attendantButtons.primary,
                ]}
                onPress={() => {
                  Keyboard.dismiss();
                  handleConfirmAutoIncident();
                }}
                disabled={autoConfirmDisabled}
              >
                {confirmingIncident ? (
                  <ActivityIndicator size="small" color={attendantTheme.colors.disabledText} />
                ) : (
                  <Text style={[styles.modalConfirmBtnText, autoConfirmDisabled ? attendantButtons.disabledText : attendantButtons.primaryText]}>
                    Xác nhận & Gửi
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalLaterBtn, confirmingIncident ? attendantButtons.disabled : attendantButtons.secondary]}
                onPress={() => {
                  Keyboard.dismiss();
                  if (activeConfirmIncident) {
                    setDismissedPendingIncidentIds((prev) =>
                      new Set(prev).add(activeConfirmIncident.id),
                    );
                  }
                  setActiveConfirmIncident(null);
                  setConfirmReason("");
                }}
                disabled={confirmingIncident}
              >
                <Text style={[styles.modalLaterBtnText, confirmingIncident ? attendantButtons.disabledText : attendantButtons.secondaryText]}>Để sau</Text>
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
    backgroundColor: "#000",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 10,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 12,
  },
  errorText: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#1E293B",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  floatingHeader: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  reportIncidentButton: {
    ...parentHomeStyles.primaryBtn,
    marginTop: 12,
    marginBottom: 12,
  },
  reportIncidentButtonText: parentHomeStyles.primaryBtnText,
  reportIncidentButtonDisabled: parentHomeStyles.disabled,
  floatingWarningBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  floatingWarningBannerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#B45309",
  },
  floatingWarningBannerBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 24,
  },
  floatingWarningBannerBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.foreground,
  },
  sheetWarningBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  sheetWarningBannerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#B45309",
  },
  sheetWarningBannerBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 24,
  },
  sheetWarningBannerBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.foreground,
  },
  emptyIncidentsBox: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyIncidentsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  emptyIncidentsSubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
  },
  incidentTripCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 10,
    gap: 8,
  },
  incidentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  incidentDesc: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
  },
  incidentContextBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 8,
    gap: 4,
  },
  incidentContextItem: {
    fontSize: 12,
    color: "#475569",
  },
  incidentResBox: {
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    padding: 8,
    gap: 2,
  },
  incidentResLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
  },
  incidentResNote: {
    fontSize: 12,
    color: "#166534",
  },
  incidentCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 8,
  },
  incidentTimeText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  incidentConfirmSmallBtn: {
    ...attendantTheme.buttons.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 24,
  },
  incidentConfirmSmallBtnText: {
    fontSize: 11,
    fontWeight: "700",
    ...attendantTheme.buttons.secondaryText,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pinnedTripBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
    gap: 2,
  },
  pinnedTripTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  pinnedTripSub: {
    fontSize: 12,
    color: "#64748B",
  },
  incidentTargetBox: {
    backgroundColor: "#FFFBEB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FEF3C7",
    padding: 10,
    gap: 2,
  },
  incidentTargetLabel: {
    fontSize: 12,
    color: "#B45309",
  },
  incidentTargetValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#B45309",
  },
  incidentTargetSub: {
    fontSize: 12,
    color: "#92400E",
  },
  incidentNoteInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    padding: 10,
    fontSize: 13,
    color: "#1E293B",
    textAlignVertical: "top",
    minHeight: 70,
  },
  confirmModalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  confirmModalDesc: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
  },
  confirmReasonLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  keyboardDismissBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.navigationHighlight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 24,
  },
  keyboardDismissBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  confirmReasonInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    padding: 10,
    fontSize: 13,
    color: "#1E293B",
    textAlignVertical: "top",
    minHeight: 70,
  },
  modalLaterBtn: parentHomeStyles.secondaryBtn,
  modalLaterBtnText: parentHomeStyles.secondaryBtnText,
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
    overflow: "hidden",
  },
  sheetHandleArea: {
    flexShrink: 0,
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    marginBottom: 8,
  },
  collapsedHeader: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sheetRouteName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  directionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  directionToSchool: {
    backgroundColor: "#EFF6FF",
  },
  directionToParking: {
    backgroundColor: "#FFFBEB",
  },
  directionText: {
    fontSize: 11,
    fontWeight: "700",
  },
  directionTextToSchool: {
    color: "#2563EB",
  },
  directionTextToParking: {
    color: "#D97706",
  },
  sheetTimeText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  expandedContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tabBarWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    marginBottom: 12,
  },
  tabScrollStaff: { flexGrow: 0 },
  tabBarStaff: {
    flexDirection: "row",
    flexGrow: 1,
    alignItems: "stretch",
    gap: 4,
    paddingRight: 8,
  },
  tabButtonStaff: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "auto",
    minHeight: 44,
    paddingHorizontal: 4,
    gap: 6,
  },
  tabButtonTextStaff: { flexShrink: 0, textAlign: "center" },
  tabBarParent: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    justifyContent: "space-between",
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabButtonParent: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 4,
    gap: 4,
  },
  tabButtonActive: {
    borderBottomColor: "#D97706",
  },
  tabButtonActiveIncident: {
    borderBottomColor: "#DC2626",
  },
  tabButtonText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  tabButtonTextParent: {
    fontSize: 12,
  },
  tabButtonTextActive: {
    color: "#D97706",
    fontWeight: "700",
  },
  incidentHeaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 6,
  },
  incidentHeaderBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
  tabContentScroll: {
    flex: 1,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },
  infoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  infoLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  infoSubtext: {
    fontSize: 12,
    color: "#64748B",
  },
  stopTimelineRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
    paddingBottom: 16,
  },
  stopTimelineLastRow: { paddingBottom: 0 },
  stopTimelineRail: { width: 26, alignItems: "center", paddingTop: 12 },
  // Extend through the row gap; card height can grow with its content.
  stopTimelineConnector: {
    position: "absolute",
    top: 42,
    bottom: -24,
    width: 2,
    backgroundColor: colors.border,
  },
  stopCard: {
    flex: 1,
    minWidth: 0,
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  stopOrderCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  stopOrderText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  stopHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 6,
  },
  stopName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 120,
    lineHeight: 19,
  },
  stopEta: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
    lineHeight: 19,
    flexShrink: 0,
    maxWidth: "100%",
  },
  stopAddress: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 18,
  },
  childAttendanceStatusBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    alignSelf: "flex-start",
    maxWidth: "100%",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  childAttendanceStatusText: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    flexShrink: 1,
  },
  emptyStopsText: {
    textAlign: "center",
    padding: 24,
    color: "#94A3B8",
    fontSize: 13,
  },
  attendanceHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  attendanceProgressText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 4,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#059669",
  },
  qrHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  qrHeaderBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.foreground,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 10,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
  },
  rosterCard: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
    gap: 6,
  },
  rosterCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rosterOrderCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  rosterOrderText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  rosterStudentName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  rosterStudentCode: {
    fontSize: 11,
    color: "#64748B",
  },
  rosterStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePresent: {
    backgroundColor: "#DCFCE7",
  },
  badgeAbsent: {
    backgroundColor: "#FEE2E2",
  },
  badgeUnmarked: {
    backgroundColor: "#FEF3C7",
  },
  rosterStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  textPresent: {
    color: "#15803D",
  },
  textAbsent: {
    color: "#B91C1C",
  },
  textUnmarked: {
    color: "#B45309",
  },
  rosterAddress: {
    fontSize: 12,
    color: "#64748B",
  },
  rosterAbsenceReason: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rosterAbsenceReasonLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B91C1C",
  },
  rosterAbsenceReasonText: {
    fontSize: 11,
    color: "#991B1B",
    flex: 1,
  },
  rosterActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  actionBtnPresent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    ...attendantTheme.buttons.primary,
    paddingVertical: 6,
    borderRadius: 24,
  },
  actionBtnAbsent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    ...attendantTheme.buttons.secondary,
    paddingVertical: 6,
    borderRadius: 24,
  },
  actionBtnSwitch: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    ...attendantTheme.buttons.secondary,
    paddingVertical: 6,
    borderRadius: 24,
  },
  standaloneTripAction: { flex: 0, minHeight: 44, paddingHorizontal: 12 },
  reportStudentAction: { minHeight: 44, paddingHorizontal: 8 },
  actionBtnReset: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
    ...attendantTheme.buttons.selected,
    paddingVertical: 6,
    borderRadius: 24,
    borderWidth: 1,
  },
  actionBtnTextLight: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: "600",
  },
  actionBtnTextDark: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: "600",
  },
  attendantOutlineDisabled: { ...attendantTheme.buttons.disabled, borderColor: attendantTheme.colors.disabled },
  fixedBottomActionContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    elevation: 10,
    zIndex: 20,
  },
  primaryActionBtn: parentHomeStyles.primaryBtn,
  actionBtnAlight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    ...attendantTheme.buttons.primary,
    paddingVertical: 6,
    borderRadius: 24,
  },
  subTabBar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  subTabButton: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  subTabButtonActive: {
    backgroundColor: "#DBEAFE",
  },
  subTabButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  subTabButtonTextActive: {
    color: "#1D4ED8",
    fontWeight: "700",
  },
  alightingNoticeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  alightingNoticeText: {
    fontSize: 12,
    color: "#92400E",
    flex: 1,
  },
  badgeAlighted: {
    backgroundColor: "#ECFDF5",
  },
  badgeNotAlighted: {
    backgroundColor: "#FFFBEB",
  },
  textAlighted: {
    color: "#059669",
  },
  textNotAlighted: {
    color: "#D97706",
  },
  primaryActionBtnText: parentHomeStyles.primaryBtnText,
  readyActions: { gap: 8 },
  readyBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  readyBadgeText: {
    color: "#15803D",
    fontSize: 13,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    gap: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#64748B",
  },
  modalMessage: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
  },
  modalBtnRow: {
    flexDirection: "column",
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: parentHomeStyles.secondaryBtn,
  modalCancelBtnText: parentHomeStyles.secondaryBtnText,
  modalConfirmBtn: parentHomeStyles.primaryBtn,
  cancelTripConfirmBtn: { backgroundColor: "#B91C1C" },
  modalConfirmBtnText: parentHomeStyles.primaryBtnText,
  absenceInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    padding: 10,
    fontSize: 13,
    color: "#0F172A",
    textAlignVertical: "top",
  },
  qrModalContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  qrModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 10,
  },
  qrModalTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  qrModalCloseBtn: {
    padding: 6,
  },
  qrCameraContainer: {
    flex: 1,
    position: "relative",
  },
  qrOverlayFrame: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  qrTargetBox: {
    width: 240,
    height: 240,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#38BDF8",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  qrGuideText: {
    color: "#FFFFFF",
    fontSize: 13,
    marginTop: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  qrManualBox: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: "row",
    gap: 8,
  },
  qrManualInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: "#0F172A",
  },
  qrManualSubmitBtn: {
    ...attendantTheme.buttons.primary,
    paddingHorizontal: 16,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  qrManualSubmitText: {
    ...attendantTheme.buttons.primaryText,
    fontSize: 13,
    fontWeight: "700",
  },
  qrVerifyCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    margin: 24,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  qrVerifyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  qrVerifyName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2563EB",
  },
  qrVerifyCode: {
    fontSize: 13,
    color: "#64748B",
  },
  qrVerifyAddress: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
  },
  qrVerifyBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    width: "100%",
  },
  qrVerifyRetryBtn: { ...parentHomeStyles.secondaryBtn, ...attendantTheme.buttons.secondary, flex: 1 },
  qrVerifyRetryText: { ...parentHomeStyles.secondaryBtnText, ...attendantTheme.buttons.secondaryText },
  qrVerifyConfirmBtn: { ...parentHomeStyles.primaryBtn, ...attendantTheme.buttons.primary, flex: 1 },
  qrVerifyConfirmText: { ...parentHomeStyles.primaryBtnText, ...attendantTheme.buttons.primaryText },
});
import { AppHeader, HeaderAction } from "@/components/navigation/app-header";
