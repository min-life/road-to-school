import { memo, useLayoutEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import { journeyTones } from '@/constants/parent-journey';
import type { ParentHomeCardItem } from '@/services/api-client';
import type { ParentJourneyTelemetry } from '@/hooks/use-parent-journey-telemetry';
import { useReducedMotionPreference } from '@/hooks/use-reduced-motion-preference';
import { journeyRecordedClock, studentJourneyTimes, type JourneyTime } from '@/utils/parent-journey';
import { activeJourneyIncident, journeyIncidentLabel, journeyMinutesBeforeSchedule, journeyScheduleCountdown,
  journeySchoolArrived, journeyServiceDate, journeyStagePosition } from '@/utils/parent-journey-stage';

type Props = { card: ParentHomeCardItem; telemetry?: ParentJourneyTelemetry; active: boolean; showServiceDate?: boolean };

/** Workflow illustration only. Existing Trip Detail remains the real location tracking screen. */
export const ParentStudentJourney = memo(function ParentStudentJourney({ card, telemetry, active, showServiceDate }: Props) {
  const [boardingFrame, setBoardingFrame] = useState(false);
  const previousAttendance = useRef(card.attendanceStatus);
  useLayoutEffect(() => {
    const justBoarded = previousAttendance.current === 'UNMARKED' && card.attendanceStatus === 'PRESENT';
    previousAttendance.current = card.attendanceStatus;
    if (!active || card.direction !== 'TO_SCHOOL' || card.tripStatus !== 'IN_PROGRESS' || !justBoarded) {
      setBoardingFrame(false); return;
    }
    // Briefly acknowledge the observed attendance event, then show the next illustrative leg.
    setBoardingFrame(true);
    const timer = setTimeout(() => setBoardingFrame(false), 1600);
    return () => clearTimeout(timer);
  }, [card.attendanceStatus, card.direction, card.tripStatus, active]);
  const operation = telemetry?.unavailable ? undefined : telemetry?.operation;
  const arrived = journeySchoolArrived(operation, card.tripId);
  const stagePosition = journeyStagePosition(card.tripStatus, card.direction, card.attendanceStatus,
    Boolean(card.childIsAlighted), arrived, boardingFrame);
  const times = studentJourneyTimes(card, telemetry?.detail, operation);
  const remaining = journeyScheduleCountdown(card.serviceDate, times.plannedArrival, Date.now());
  const bubble = stagePosition !== null && stagePosition > 0.5 && stagePosition < 1 && !boardingFrame && remaining !== null
    ? remaining <= 60 ? remaining + 'p' : times.plannedArrival : null;
  const variance = journeyMinutesBeforeSchedule(card.serviceDate, times.plannedArrival, times.comparisonArrivalAt);
  const arrivalNote = variance === null ? null : variance > 0 ? 'Sớm ' + variance + ' phút' : variance < 0 ? 'Trễ ' + Math.abs(variance) + ' phút' : 'Đúng giờ';
  const incidents = telemetry?.incidents?.filter(i => activeJourneyIncident(i.status)) ?? [];
  return <>
    <StudentJourneyRouteHeader routeName={card.routeName} outbound={card.direction === 'TO_SCHOOL'} serviceDate={showServiceDate ? card.serviceDate : undefined} />
    <StudentJourneyDiagram stagePosition={stagePosition} outbound={card.direction === 'TO_SCHOOL'} active={active}
      departure={times.departure} arrival={times.arrival} pickup={times.pickup} pickupTitle={times.pickupTitle}
      arrivalTitle={times.arrivalTitle} arrivalNote={arrivalNote} late={variance !== null && variance < 0} bubble={bubble} />
    {card.direction === 'TO_PARKING' && times.routeScheduledEnd && <Text style={styles.scheduleNote}>Kết thúc tuyến theo lịch {times.routeScheduledEnd}</Text>}
    {(telemetry?.operationUnavailable || telemetry?.incidentsUnavailable || telemetry?.detailUnavailable) && <Text style={styles.scheduleNote}>Chưa cập nhật được đầy đủ dữ liệu chuyến.</Text>}
    {incidents.length > 0 && <View style={styles.incidentBox}>
      <Text style={styles.incidentTitle}>Chuyến có sự cố{telemetry?.incidentsUnavailable ? ' · dữ liệu trước đó' : ''}</Text>
      {incidents.map(incident => <View key={incident.id} style={styles.incidentRow}>
        <Ionicons name="warning-outline" size={16} color={journeyTones.danger.text} accessible={false} />
        <Text style={styles.incidentText}>{journeyIncidentLabel(incident.type)}{journeyRecordedClock(incident.createdAt) ? ' · ' + journeyRecordedClock(incident.createdAt) : ''}</Text>
      </View>)}
    </View>}
  </>;
});

export function StudentJourneyRouteHeader({ routeName, outbound, serviceDate }: { routeName: string; outbound: boolean; serviceDate?: string }) {
  return <View style={styles.routeHeader}>
    <Ionicons name={outbound ? 'arrow-forward-circle-outline' : 'arrow-back-circle-outline'} size={20} color={colors.navigationActive} accessible={false} />
    <View style={styles.routeIdentity}>
      <Text style={styles.routeName}>{routeName}</Text>
      <Text style={styles.routeDirection}>{outbound ? 'Đến trường' : 'Về điểm trả'}{serviceDate ? ' · ' + journeyServiceDate(serviceDate) : ''}</Text>
    </View>
  </View>;
}

type DiagramProps = {
  stagePosition: number | null;
  outbound: boolean;
  active: boolean;
  departure: JourneyTime;
  arrival: JourneyTime;
  pickup: JourneyTime;
  pickupTitle: string;
  arrivalTitle: string;
  arrivalNote?: string | null;
  late?: boolean;
  bubble?: string | null;
};

/** Positions are the PO-approved milestone illustrations, never live GPS or percentage measurements. */
export function StudentJourneyDiagram({ stagePosition, outbound, active, departure, arrival, pickup, pickupTitle, arrivalTitle, arrivalNote, late, bubble }: DiagramProps) {
  const reduced = useReducedMotionPreference();
  const position = useRef(new Animated.Value(stagePosition ?? 0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const [width, setWidth] = useState(0);
  // At a two-thirds stage adjacent markers are only one sixth of the rail apart.
  const markerScale = outbound && width > 0 ? Math.min(1, width / 186) : 1;
  useLayoutEffect(() => {
    position.setValue(stagePosition ?? 0);
    opacity.stopAnimation();
    if (reduced || !active) { opacity.setValue(1); return; }
    opacity.setValue(0.65);
    const animation = Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true, isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [stagePosition, position, opacity, active, reduced]);
  const onStart = stagePosition === 0, onHome = outbound && stagePosition === 0.5, onEnd = stagePosition === 1;
  return <View style={styles.container} accessible accessibilityRole="image"
    accessibilityLabel={'Tiến trình minh họa theo trạng thái. ' + (outbound ? 'Xuất phát, điểm đón của con, trường học. ' : 'Trường học, điểm trả của con. ')
      + 'Khởi hành ' + timeDescription(departure) + '. ' + (outbound ? pickupTitle + ' ' + timeDescription(pickup) + '. ' : '')
      + arrivalTitle + ' ' + timeDescription(arrival) + (arrivalNote ? '. ' + arrivalNote : '') + (bubble ? '. Còn ' + bubble + ' theo lịch, không phải ETA trực tiếp.' : '')}>
    <View style={styles.timeRow} aria-hidden>
      <JourneyTimeBadge title="Khởi hành" time={departure} returnLeg={!outbound} />
      {outbound && <JourneyTimeBadge title={pickupTitle} time={pickup} returnLeg={false} />}
      <JourneyTimeBadge title={arrivalTitle} time={arrival} returnLeg={!outbound} />
    </View>
    <View style={[styles.rail, { marginHorizontal: outbound ? '16.666667%' : '25%' }]} aria-hidden
      onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.track} />
      <View style={[styles.nodeConnector, { left: 0 }]} />
      {outbound && <View style={[styles.nodeConnector, { left: '50%' }]} />}
      <View style={[styles.nodeConnector, { right: 0 }]} />
      {stagePosition !== null && width > 0 && <Animated.View style={[styles.completed, { width,
        transform: [{ translateX: position.interpolate({ inputRange: [0, 1], outputRange: [-width / 2, 0] }) }, { scaleX: position }],
      }]} />}
      {!onStart && <View style={[styles.node, styles.start, { transform: [{ scale: markerScale }] }]}><Ionicons name={outbound ? 'car-outline' : 'school-outline'} size={17} color={colors.mutedText} /></View>}
      {outbound && !onHome && <View style={[styles.node, styles.home, { transform: [{ scale: markerScale }] }]}><Ionicons name="home-outline" size={18} color={colors.navigationActive} /></View>}
      {!onEnd && <View style={[styles.node, styles.end, { transform: [{ scale: markerScale }] }]}><Ionicons name={outbound ? 'school-outline' : 'home-outline'} size={17} color={colors.mutedText} /></View>}
      {stagePosition !== null && <Animated.View style={[styles.bus, { opacity,
        transform: [{ translateX: position.interpolate({ inputRange: [0, 1], outputRange: [0, width] }) }],
      }]}>
        <View style={[styles.busFace, { transform: [{ scale: markerScale }] }]}><Ionicons name="bus" size={20} color={colors.foreground} /></View>
        {bubble && <View style={styles.bubble}><Text style={styles.bubbleValue}>{bubble}</Text><Text style={styles.bubbleCaption}>theo lịch</Text><View style={styles.bubbleTail} /></View>}
      </Animated.View>}
    </View>
    <View style={styles.labels} aria-hidden>
      <Text style={styles.endpoint}>{outbound ? 'Xuất phát' : 'Trường học'}</Text>
      {outbound && <Text style={[styles.endpoint, styles.homeLabel]}>Điểm đón{'\n'}của con</Text>}
      <Text style={styles.endpoint}>{outbound ? 'Trường học' : 'Điểm trả của con'}</Text>
    </View>
    {arrivalNote && <View style={styles.diagramFooter} aria-hidden>
      <Text style={[styles.variance, late && styles.late]}>{arrivalNote}</Text>
    </View>}
  </View>;
}

function timeDescription(time: JourneyTime) {
  return time.value ? time.value + ', ' + (time.kind === 'actual' ? 'thực tế' : 'dự kiến') : 'chưa có giờ';
}

function JourneyTimeBadge({ title, time, returnLeg }: { title: string; time: JourneyTime; returnLeg: boolean }) {
  return <View style={[styles.timeColumn, returnLeg && styles.returnTimeColumn]}>
    <View style={[styles.timeBadge, time.kind === 'actual' && styles.actualTimeBadge]}>
      <Text style={styles.timeTitle}>{title}</Text>
      <Text style={styles.timeValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{time.value ?? '—:—'}</Text>
      <Text style={styles.timeKind}>{time.value ? time.kind === 'actual' ? 'Thực tế' : 'Dự kiến' : 'Chưa có giờ'}</Text>
      {time.kind === 'actual' && time.scheduledValue && <Text style={styles.plannedTime}>Lịch {time.scheduledValue}</Text>}
    </View>
    <View style={styles.timeStem} />
  </View>;
}

const styles = StyleSheet.create({
  routeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  routeIdentity: { flex: 1, minWidth: 0 },
  routeName: { color: colors.foreground, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  routeDirection: { color: colors.mutedText, fontSize: 11, lineHeight: 17, marginTop: 2 },
  container: { padding: 12, borderRadius: 16, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.navigationHighlight },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end' },
  timeColumn: { flex: 1, minWidth: 0, alignItems: 'center', paddingHorizontal: 2 },
  returnTimeColumn: { paddingHorizontal: 8 },
  timeBadge: { width: '100%', maxWidth: 110, minHeight: 94, justifyContent: 'center', alignItems: 'center', gap: 2, paddingHorizontal: 4, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, borderColor: colors.navigationHighlight, backgroundColor: colors.surface },
  actualTimeBadge: { borderColor: colors.primary, backgroundColor: colors.navigationHighlight },
  timeTitle: { fontSize: 10, lineHeight: 15, color: colors.mutedText, textAlign: 'center' },
  timeValue: { alignSelf: 'stretch', fontSize: 18, lineHeight: 24, fontWeight: '800', fontVariant: ['tabular-nums'], color: colors.foreground, textAlign: 'center' },
  timeKind: { fontSize: 9, lineHeight: 14, color: colors.navigationActive, textAlign: 'center' },
  plannedTime: { fontSize: 9, lineHeight: 14, color: colors.mutedText, textAlign: 'center' },
  variance: { fontSize: 9, lineHeight: 14, fontWeight: '700', color: journeyTones.success.text, textAlign: 'center' },
  late: { color: journeyTones.danger.text },
  timeStem: { width: 1, height: 30, backgroundColor: colors.border },
  rail: { height: 82, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, borderWidth: 1, borderColor: colors.mutedText, backgroundColor: colors.border, width: '100%' },
  nodeConnector: { position: 'absolute', top: 0, height: 27, width: 1, backgroundColor: colors.border },
  completed: { position: 'absolute', height: 6, borderRadius: 3, borderWidth: 1, borderColor: colors.navigationActive, backgroundColor: colors.primary },
  node: { position: 'absolute', top: 27, zIndex: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  start: { left: -14 }, end: { right: -14 },
  home: { left: '50%', marginLeft: -14, borderColor: colors.navigationActive, backgroundColor: colors.navigationHighlight },
  bus: { position: 'absolute', left: -16, top: 25, zIndex: 3, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  busFace: { width: 32, height: 32, borderRadius: 12, borderWidth: 2,
    borderColor: colors.surface, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  bubble: { position: 'absolute', bottom: 38, minWidth: 52, maxWidth: 76, paddingHorizontal: 6, paddingVertical: 3,
    alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface },
  bubbleValue: { fontSize: 11, lineHeight: 15, fontWeight: '800', color: colors.foreground },
  bubbleCaption: { fontSize: 8, lineHeight: 12, color: colors.mutedText },
  bubbleTail: { position: 'absolute', bottom: -4, width: 6, height: 6, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderRightWidth: 1, borderColor: colors.primary, transform: [{ rotate: '45deg' }] },
  labels: { flexDirection: 'row', alignItems: 'flex-start' },
  endpoint: { flex: 1, minWidth: 0, paddingHorizontal: 2, fontSize: 10, lineHeight: 16, color: colors.mutedText, textAlign: 'center' },
  homeLabel: { color: colors.navigationActive, fontWeight: '600' },
  diagramFooter: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  scheduleNote: { fontSize: 11, lineHeight: 17, color: colors.mutedText },
  incidentBox: { padding: 12, gap: 8, borderRadius: 12, backgroundColor: journeyTones.danger.bg },
  incidentTitle: { fontSize: 12, lineHeight: 18, fontWeight: '700', color: journeyTones.danger.text },
  incidentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  incidentText: { flex: 1, minWidth: 0, fontSize: 12, lineHeight: 18, color: journeyTones.danger.text },
});
