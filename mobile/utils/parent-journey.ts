import type { ParentHomeCardItem, MobileTripDetail, OperationalStateResponse } from '../services/api-client';
import type { NavigationState } from '../services/trip-navigation';
import { decodePolyline } from './polyline';
import { cumulativeDistances, distance, type Coordinate } from './trip-navigation';

type TripStatus = ParentHomeCardItem['tripStatus'];
type Direction = ParentHomeCardItem['direction'];
type Attendance = ParentHomeCardItem['attendanceStatus'];

export type JourneyTime = { value: string | null; kind: 'scheduled' | 'actual'; scheduledValue?: string | null };

export function journeyClock(value?: string | null): string | null {
  const match = value?.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59 || Number(match[3] ?? 0) > 59) return null;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

export function journeyScheduleRange(value: string) {
  const parts = value.split(/\s*[-–—]\s*/);
  return { start: parts.length === 2 ? journeyClock(parts[0]) : null, end: parts.length === 2 ? journeyClock(parts[1]) : null };
}

export function journeyArrivalClock(direction: Direction, stopTime?: string | null, routeEndTime?: string | null) {
  // The return trip ends at the parking lot, after this child's drop-off.
  return journeyClock(stopTime) ?? (direction === 'TO_SCHOOL' ? journeyClock(routeEndTime) : null);
}

export function journeyRecordedClock(value?: string | null): string | null {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  try {
    return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));
  } catch { return null; }
}

export function studentJourneyTimes(card: ParentHomeCardItem, detail?: MobileTripDetail, operation?: OperationalStateResponse) {
  const validDetail = detail?.id === card.tripId && detail.direction === card.direction ? detail : undefined;
  const range = journeyScheduleRange(card.scheduledTime);
  const destination = validDetail?.stops.find(s => card.direction === 'TO_SCHOOL' ? s.stopType === 'SCHOOL_ARRIVAL'
    : s.stopType === 'DROPOFF' && s.studentId === card.studentId && s.isMyChild === true);
  const validOperation = operation?.tripId === card.tripId && (!operation.direction || operation.direction === card.direction) ? operation : undefined;
  const scheduledDeparture = range.start ?? journeyClock(validDetail?.scheduledStartTime);
  const plannedArrival = journeyArrivalClock(card.direction, destination?.plannedArrivalTime, journeyClock(validDetail?.scheduledEndTime) ?? range.end);
  const start = journeyRecordedClock(validOperation?.actualStartTime);
  const schoolAt = journeyRecordedClock(validOperation?.arrivedAtSchoolAt) ? validOperation?.arrivedAtSchoolAt : null;
  const downAt = card.attendanceStatus === 'PRESENT' && card.childIsAlighted ? card.childAlightedAt : null;
  const arrivalAt = card.direction === 'TO_SCHOOL' ? schoolAt ?? downAt : downAt;
  const actualArrival = journeyRecordedClock(arrivalAt);
  const arrived = Boolean(actualArrival || (card.direction === 'TO_SCHOOL' && validOperation?.isSchoolArrived));
  const pickupStop = validDetail?.stops.find(s => s.stopType === 'PICKUP' && s.studentId === card.studentId && s.isMyChild === true);
  const pickupActual = card.attendanceStatus !== 'UNMARKED' ? journeyRecordedClock(card.markedAt) : null;
  return {
    departure: { value: start ?? scheduledDeparture, kind: start ? 'actual' : 'scheduled', scheduledValue: scheduledDeparture } as JourneyTime,
    arrival: { value: arrived ? actualArrival : plannedArrival, kind: arrived ? 'actual' : 'scheduled', scheduledValue: plannedArrival } as JourneyTime,
    pickup: { value: pickupActual ?? journeyClock(pickupStop?.plannedArrivalTime), kind: pickupActual ? 'actual' : 'scheduled' } as JourneyTime,
    pickupTitle: pickupActual ? card.attendanceStatus === 'ABSENT' ? card.hasLeaveNotice ? 'Báo nghỉ' : 'Báo vắng' : 'Điểm danh' : 'Đón con',
    arrivalTitle: card.direction === 'TO_SCHOOL' ? (!schoolAt && actualArrival ? 'Xuống xe' : 'Đến trường') : 'Đến điểm trả',
    comparisonArrivalAt: card.direction === 'TO_SCHOOL' ? schoolAt : downAt,
    plannedArrival,
    routeScheduledEnd: range.end,
  };
}

/** Equal visual legs are schematic, not equal distances. GPS still determines progress within each leg. */
export function journeyDiagramPosition(progress: number | null, homeFraction: number | undefined, outbound: boolean): number | null {
  if (progress === null || !Number.isFinite(progress) || progress < 0 || progress > 1) return null;
  if (!outbound || progress === 0 || progress === 1) return progress;
  if (homeFraction === undefined || !Number.isFinite(homeFraction) || homeFraction <= 0 || homeFraction >= 1) return null;
  return progress <= homeFraction ? (progress / homeFraction) / 2 : 0.5 + (progress - homeFraction) / (1 - homeFraction) / 2;
}

/** Presentation labels, never additional TripStatus/AttendanceStatus values. */
export function studentJourneyMilestone(status: TripStatus, direction: Direction, attendance: Attendance, alighted = false) {
  if (status === 'CANCELLED') return { label: 'Chuyến đã hủy', progress: null, inactive: true };
  if (attendance === 'ABSENT') return { label: 'Vắng mặt', progress: null, inactive: true };
  if (attendance === 'PRESENT' && alighted) return {
    label: direction === 'TO_SCHOOL' ? 'Đã đến trường' : 'Đã về điểm trả', progress: 1, inactive: false,
  };
  // Return-trip boarding can happen at school before the driver starts the trip.
  if (status === 'SCHEDULED') return { label: 'Chờ khởi hành', progress: 0, inactive: false };
  if (status === 'COMPLETED') return { label: 'Chuyến đã hoàn thành', progress: null, inactive: true };
  return {
    label: attendance === 'PRESENT' ? 'Đang trên xe' : direction === 'TO_SCHOOL' ? 'Chờ xe đón' : 'Chưa điểm danh',
    progress: null, inactive: false,
  };
}

export function validCoordinate(p: Coordinate) {
  return p.every(Number.isFinite) && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180;
}

/** Conservative projection: reject off-route fixes and ambiguous crossings/loops. */
export function locateOnJourney(coords: Coordinate[], position: Coordinate, min = 0) {
  if (coords.length < 2 || !coords.every(validCoordinate) || !validCoordinate(position)) return null;
  const cumulative = cumulativeDistances(coords);
  const cos = Math.cos(position[0] * Math.PI / 180);
  const candidates: { metres: number; gap: number }[] = [];
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1], b = coords[i];
    const dx = (b[1] - a[1]) * cos, dy = b[0] - a[0];
    const t = Math.max(0, Math.min(1, (((position[1] - a[1]) * cos) * dx + (position[0] - a[0]) * dy) / (dx * dx + dy * dy || 1)));
    const projected: Coordinate = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const metres = cumulative[i - 1] + t * (cumulative[i] - cumulative[i - 1]);
    if (metres >= min - 1) candidates.push({ metres, gap: distance(projected, position) });
  }
  candidates.sort((a, b) => a.gap - b.gap);
  const best = candidates[0];
  if (!best || best.gap > 50 || candidates.some(c => c.gap <= best.gap + 5 && Math.abs(c.metres - best.metres) > 100)) return null;
  return best.metres;
}

export type JourneyPath = { coords: Coordinate[]; start: number; home: number; boarding: number; end: number; homeFraction: number };

export function studentJourneyPath(detail: MobileTripDetail, studentId: string): JourneyPath | null {
  // No straight-line fallback: it would pretend the bus follows an unknown road.
  const encoded = detail.polylineGeometry;
  if (!encoded || encoded.length > 200000 || !/^[?-~]+$/.test(encoded)) return null;
  let groups = 0, scalars = 0;
  for (const char of encoded) {
    if (++groups > 6) return null;
    if (char.charCodeAt(0) - 63 < 32) { scalars++; groups = 0; }
  }
  if (groups !== 0 || scalars < 4 || scalars % 2 !== 0) return null;
  const coords = decodePolyline(encoded);
  if (coords.length < 2 || !coords.every(validCoordinate)) return null;
  const stops = [...detail.stops].sort((a, b) => a.stopOrder - b.stopOrder);
  const outbound = detail.direction === 'TO_SCHOOL';
  const origin = stops.find(s => s.stopType === (outbound ? 'PARKING_START' : 'SCHOOL_DEPARTURE'));
  const home = stops.find(s => s.studentId === studentId && s.isMyChild === true && s.stopType === (outbound ? 'PICKUP' : 'DROPOFF'));
  const school = stops.find(s => s.stopType === 'SCHOOL_ARRIVAL');
  if (!origin || !home || (outbound && !school)) return null;
  if (origin.stopOrder > home.stopOrder || (school && outbound && home.stopOrder > school.stopOrder)) return null;
  const start = locateOnJourney(coords, [origin.latitude, origin.longitude]);
  if (start === null) return null;
  const atHome = locateOnJourney(coords, [home.latitude, home.longitude], start);
  if (atHome === null) return null;
  const end = outbound ? locateOnJourney(coords, [school!.latitude, school!.longitude], atHome) : atHome;
  if (end === null || end - start < 1 || atHome < start || atHome > end) return null;
  return { coords, start, home: atHome, boarding: outbound ? atHome : start, end, homeFraction: (atHome - start) / (end - start) };
}

/** A stale fix never advances the bus. Milestones are handled separately. */
export function observedJourneyProgress(path: JourneyPath, navigation: NavigationState, attendance: Attendance) {
  const point = navigation.latestPosition;
  if (!point || navigation.status !== 'IN_PROGRESS') return null;
  const age = Date.parse(navigation.serverNow) - Date.parse(point.recordedAt);
  return progressForJourneyFix(path, [point.latitude, point.longitude], navigation.freshness === 'FRESH', age, attendance === 'PRESENT');
}

/** Pure geometry/freshness check; no sample data, clock extrapolation, or estimated speed. */
export function progressForJourneyFix(path: JourneyPath, position: Coordinate, fresh: boolean, ageMs: number, boarded: boolean) {
  if (!fresh || !Number.isFinite(ageMs) || ageMs < -5000 || ageMs > 15000) return null;
  const metres = locateOnJourney(path.coords, position);
  if (metres === null || metres < path.start - 50 || metres > path.end + 50) return null;
  // A sampled position before this child's boarding must not overwrite that milestone.
  if (boarded && metres < path.boarding - 50) return null;
  return Math.max(0, Math.min(1, (metres - path.start) / (path.end - path.start)));
}
