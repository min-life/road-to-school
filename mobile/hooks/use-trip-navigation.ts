import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { navigationApi, type Checkpoint, type LocationSource, type NavigationSegment, type NavigationState, type PositionSample } from '../services/trip-navigation';
import { autoPosition, coordinate, cumulativeDistances, distance, joystickPosition, nextGuidance, projectProgress, splitSegment, type Coordinate } from '../utils/trip-navigation';
import { decodePolyline } from '../utils/polyline';
import type { MobileTripDetailStop } from '../services/api-client';
import { navigationResumeStorage } from '../services/navigation-resume-storage';

type Leg = NavigationSegment & { coords: Coordinate[]; cumulative: number[]; progress: number; travelled: number };
type ViewState = {
  mode: LocationSource | null;
  position: Coordinate | null;
  segment: Coordinate[];
  traveled: Coordinate[];
  remaining: Coordinate[];
  guidance: ReturnType<typeof nextGuidance>;
  message: string | null;
  targetStopId: string | null;
};
const empty: ViewState = {
  mode: null,
  position: null,
  segment: [],
  traveled: [],
  remaining: [],
  guidance: null,
  message: null,
  targetStopId: null,
};

/** One foreground engine. Remote state is supplied by the existing detail refresh, not another poller. */
export function useTripNavigation(identity: string, tripId: string, userId: string | undefined, stops: MobileTripDetailStop[], onRefresh: () => void) {
  const [view, setView] = useState<ViewState>(empty);
  const remote = useRef<NavigationState | null>(null), cp = useRef<Checkpoint | null>(null);
  const stopsRef = useRef(stops); stopsRef.current = stops;
  const refreshRef = useRef(onRefresh); refreshRef.current = onRefresh;
  const generation = useRef(0), foreground = useRef(false), busy = useRef(false);
  const watcher = useRef<Location.LocationSubscription | null>(null), timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const leg = useRef<Leg | null>(null), sample = useRef<PositionSample | null>(null);
  const sequence = useRef(1), routeBusy = useRef(false), publishBusy = useRef(false);
  const routeAt = useRef(0), publishedAt = useRef(0);
  const arrivedSince = useRef<number | null>(null), offrouteSince = useRef<number | null>(null);
  const control = useRef({ bearing: 0, speed: 0, pressStartedAt: 0, pendingDuration: 0, pendingBearing: 0 });

  // Dedicated monotonic request IDs to guarantee request ownership without stuck busy flags
  const activeRouteId = useRef(0);
  const activePublishId = useRef(0);
  const activeActionId = useRef(0);

  // Controlled retry coordination: exactly one retry timer at any time
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const accumulatedTraveled = useRef<Coordinate[]>([]);

  // Simulation speed control in km/h (default 30 km/h, range 10-120 km/h)
  const [speedKmh, setSpeedKmh] = useState(30);
  const speedKmhRef = useRef(30);
  speedKmhRef.current = speedKmh;

  const increaseSpeed = useCallback(() => {
    setSpeedKmh(prev => Math.min(120, prev + 10));
  }, []);

  const decreaseSpeed = useCallback(() => {
    setSpeedKmh(prev => Math.max(10, prev - 10));
  }, []);

  const cancelRetry = useCallback(() => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    retryCount.current = 0;
  }, []);

  const suspend = useCallback(() => {
    generation.current++;
    activeRouteId.current++;
    activePublishId.current++;
    activeActionId.current++;
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    retryCount.current = 0;
    accumulatedTraveled.current = [];
    watcher.current?.remove(); watcher.current = null;
    if (timer.current) clearInterval(timer.current);
    timer.current = null; cp.current = null; leg.current = null; sample.current = null;
    control.current = { bearing: 0, speed: 0, pressStartedAt: 0, pendingDuration: 0, pendingBearing: 0 };
    arrivedSince.current = null; offrouteSince.current = null;
    routeBusy.current = false; publishBusy.current = false; busy.current = false;
    setView(v => ({ ...v, mode: null, segment: [], traveled: [], remaining: [], guidance: null, message: null }));
  }, []);

  const denied = (error: unknown) => [401, 403, 404].includes((error as { statusCode?: number })?.statusCode ?? 0);

  const scheduleControlledRetry = useCallback((delayMs?: number) => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    if (!foreground.current || !remote.current?.canPublish || remote.current?.status !== 'IN_PROGRESS') return;
    if (leg.current) return;

    const delay = typeof delayMs === 'number' && Number.isFinite(delayMs) && delayMs > 0
      ? delayMs
      : Math.min(30000, 3000 * Math.pow(1.5, Math.min(retryCount.current, 5)));
    retryCount.current++;
    const token = generation.current;

    retryTimer.current = setTimeout(() => {
      retryTimer.current = null;
      if (token !== generation.current || !foreground.current || leg.current || routeBusy.current) return;
      void route('CURRENT', token);
    }, delay);
  }, []);

  async function route(action: 'CURRENT' | 'ADVANCE', token: number) {
    const state = cp.current;
    if (!state?.targetStopId || routeBusy.current || !foreground.current) return;
    const cooldown = 3000;
    if (action === 'CURRENT' && Date.now() - routeAt.current < cooldown) return;
    routeAt.current = Date.now();
    routeBusy.current = true;
    const reqId = ++activeRouteId.current;

    // Dynamically read current vehicle position for every route dispatch
    const posCoord = sample.current ? coordinate(sample.current) : (view.position ?? coordinate(stopsRef.current[0]));
    const position: PositionSample = {
      latitude: posCoord[0],
      longitude: posCoord[1],
      capturedAt: new Date().toISOString(),
    };
    sample.current = position;

    setView(v => ({ ...v, message: action === 'CURRENT' && v.segment.length ? 'Đang cập nhật chỉ dẫn' : 'Đang tải tuyến đường' }));
    try {
      const result = await navigationApi.segment(tripId, state, position, action);
      if (token !== generation.current || reqId !== activeRouteId.current) return;
      cancelRetry();
      cp.current = { ...state, targetStopId: result.targetStopId };
      arrivedSince.current = null; offrouteSince.current = null;
      if (result.finished) {
        leg.current = null;
        setView(v => ({ ...v, segment: [], traveled: [], remaining: [], guidance: null, targetStopId: null, message: 'Đã đến điểm cuối' }));
        return;
      }
      if (action === 'ADVANCE' && leg.current?.coords?.length) {
        const prevSplit = splitSegment(leg.current.coords, leg.current.cumulative, leg.current.travelled);
        if (prevSplit.traveled.length > 0) {
          accumulatedTraveled.current = [...accumulatedTraveled.current, ...prevSplit.traveled];
        }
      }
      const coords = decodePolyline(result.geometry);
      const cumulative = cumulativeDistances(coords);
      leg.current = { ...result, coords, cumulative, progress: 0, travelled: 0 };
      const { traveled, remaining } = splitSegment(coords, cumulative, 0);
      const fullTraveled = [...accumulatedTraveled.current, ...traveled];
      setView(v => ({
        ...v,
        segment: coords,
        traveled: fullTraveled,
        remaining,
        targetStopId: result.targetStopId,
        guidance: nextGuidance(result.instructions, cumulative, 0),
        message: null,
      }));
    } catch (error: any) {
      if (token !== generation.current || reqId !== activeRouteId.current) return;
      const retryMs = (error as { retryAfterMs?: number })?.retryAfterMs;
      const isRateLimit = (error as { statusCode?: number })?.statusCode === 429;
      const statusCode = (error as { statusCode?: number })?.statusCode;

      if (typeof retryMs === 'number' && Number.isFinite(retryMs) && retryMs > 0) {
        routeAt.current = Date.now() - cooldown + retryMs;
      } else if (action === 'CURRENT') {
        routeAt.current = Date.now() - cooldown + 3000;
      }

      if (action === 'ADVANCE') {
        refreshRef.current();
      }

      let displayMsg = 'Chưa thể tải tuyến đường';
      if (denied(error)) {
        leg.current = null;
        displayMsg = 'Không có quyền điều hướng';
        setView(v => ({ ...v, segment: [], traveled: [], remaining: [], guidance: null, message: displayMsg }));
        suspend();
        return;
      } else if (isRateLimit) {
        const seconds = Math.ceil((retryMs ?? 3000) / 1000);
        displayMsg = `Chờ cập nhật chỉ dẫn (${seconds}s)`;
      } else if (statusCode === 409) {
        displayMsg = 'Phiên điều hướng đã thay đổi';
        refreshRef.current();
      } else if (statusCode === 502) {
        displayMsg = 'Chưa thể tải tuyến đường';
      } else if (statusCode === 503) {
        displayMsg = 'Dịch vụ định tuyến tạm gián đoạn';
      }
      setView(v => ({ ...v, message: displayMsg }));

      if (!leg.current && remote.current?.status === 'IN_PROGRESS') {
        scheduleControlledRetry(retryMs);
      }
    } finally {
      if (reqId === activeRouteId.current) {
        routeBusy.current = false;
      }
    }
  }

  async function publish(token: number) {
    if (publishBusy.current || !cp.current || !sample.current || Date.now() - publishedAt.current < 5000) return;
    const state = cp.current, position = sample.current;
    if (Date.now() - Date.parse(position.capturedAt) > 10000) return;
    publishBusy.current = true;
    publishedAt.current = Date.now();
    const pubId = ++activePublishId.current;
    try {
      const ack = await navigationApi.publish(tripId, state, sequence.current, position);
      if (token === generation.current && pubId === activePublishId.current) {
        sequence.current = Math.max(sequence.current, ack.nextSequence);
      }
    } catch (error) {
      if (token !== generation.current || pubId !== activePublishId.current) return;
      if (denied(error)) { suspend(); remote.current = null; }
      else if ((error as { statusCode?: number })?.statusCode === 409) {
        refreshRef.current();
      }
    } finally {
      if (pubId === activePublishId.current) {
        publishBusy.current = false;
      }
    }
  }

  function accept(position: PositionSample, token: number) {
    if (token !== generation.current || !foreground.current || !cp.current) return;
    const age = Date.now() - Date.parse(position.capturedAt);
    if (!Number.isFinite(age) || age > 10000 || age < -5000) return;
    if (cp.current.activeSource === 'LIVE' && position.capturedAt === sample.current?.capturedAt) return;
    if (cp.current.activeSource === 'LIVE' && (position.accuracyMeters == null || position.accuracyMeters > 50)) {
      setView(v => ({ ...v, guidance: null, message: 'GPS yếu' })); return;
    }
    if (cp.current.activeSource === 'LIVE' && sample.current) {
      const seconds = (Date.parse(position.capturedAt) - Date.parse(sample.current.capturedAt)) / 1000;
      if (seconds <= 0 || distance(coordinate(sample.current), coordinate(position)) > Math.max(100, seconds * 70 + 100)) {
        setView(v => ({ ...v, guidance: null, message: 'GPS yếu' })); return;
      }
    }
    sample.current = position;
    const p = coordinate(position);
    const current = leg.current;
    const target = stopsRef.current.find(s => s.id === cp.current?.targetStopId);
    if (!current) {
      setView(v => ({ ...v, position: p, guidance: null }));
      const first = stopsRef.current[0];
      if (target && first?.id === target.id && distance(p, coordinate(target)) <= 20) {
        if (!arrivedSince.current) arrivedSince.current = Date.now();
        else if (Date.now() - arrivedSince.current >= 2500) {
          arrivedSince.current = null;
          void route('ADVANCE', token);
        }
      } else {
        arrivedSince.current = null;
        void route('CURRENT', token);
      }
    } else if (!routeBusy.current) {
      const projection = projectProgress(current.coords, current.cumulative, p, current.progress);
      if (projection.gap > 40) {
        arrivedSince.current = null;
        if (!offrouteSince.current) offrouteSince.current = Date.now();
        setView(v => ({ ...v, position: p, guidance: null, message: 'Đang lệch tuyến' }));
        if (Date.now() - offrouteSince.current >= 3000) {
          offrouteSince.current = null;
          setView(v => ({ ...v, guidance: null, message: 'Đang tìm lộ trình mới...' }));
          void route('CURRENT', token);
        }
      } else {
        offrouteSince.current = null;
        current.progress = projection.progress;
        current.travelled = projection.progress; // keep travelled synchronized with manual progress
        const { traveled, remaining } = splitSegment(current.coords, current.cumulative, current.progress);
        const fullTraveled = [...accumulatedTraveled.current, ...traveled];
        let shouldAdvance = false;
        if (target) {
          const targetCoord = coordinate(target);
          const distToTarget = distance(p, targetCoord);
          const targetProg = projectProgress(current.coords, current.cumulative, targetCoord, 0, Infinity).progress;
          const passed = current.progress >= targetProg;
          const nextTarget = stopsRef.current.find((s, i) => {
            const currIdx = stopsRef.current.findIndex(x => x.id === target.id);
            return i > currIdx && distance(coordinate(s), targetCoord) > 1;
          });
          const closerToNext = nextTarget ? distance(p, coordinate(nextTarget)) < distToTarget : false;
          // Advance immediately if vehicle passed within 100m, or arrived at stop (dist <= 30m), or passed towards next target
          if ((distToTarget <= 100 && (passed || distToTarget <= 30)) || (passed && (distToTarget <= 150 || closerToNext))) {
            shouldAdvance = true;
          }
        }
        if (shouldAdvance) {
          arrivedSince.current = null;
          void route('ADVANCE', token);
        } else {
          arrivedSince.current = null;
        }
        setView(v => ({
          ...v,
          position: p,
          traveled: fullTraveled,
          remaining,
          guidance: nextGuidance(current.instructions, current.cumulative, current.progress),
          message: null,
        }));
      }
    } else {
      setView(v => ({ ...v, position: p }));
    }
    void publish(token);
  }

  async function activate(state: NavigationState, token: number, preservePosition?: Coordinate) {
    if (!state.checkpoint?.enabled || token !== generation.current || !foreground.current) return;
    cp.current = state.checkpoint; sequence.current = state.nextSequence;
    if (userId) void navigationResumeStorage.remember(userId, tripId).catch(() => {});
    routeAt.current = 0; publishedAt.current = 0;
    arrivedSince.current = null; offrouteSince.current = null;
    setView(v => ({
      ...v,
      mode: state.checkpoint!.activeSource,
      targetStopId: state.checkpoint!.targetStopId,
      message: state.checkpoint!.targetStopId ? null : 'Đã đến điểm cuối',
    }));
    if (state.checkpoint.activeSource === 'LIVE') {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (token !== generation.current || !foreground.current) return;
        if (!permission.granted) { setView(v => ({ ...v, message: 'Chưa có GPS' })); return; }
        const subscription = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 2 }, p =>
          accept({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracyMeters: p.coords.accuracy, capturedAt: new Date(p.timestamp).toISOString() }, token));
        if (token !== generation.current || !foreground.current) subscription.remove();
        else {
          watcher.current = subscription;
          timer.current = setInterval(() => {
            if (token !== generation.current) return;
            if (!sample.current || Date.now() - Date.parse(sample.current.capturedAt) > 10000) {
              setView(v => ({ ...v, guidance: null, message: 'Chưa có GPS' }));
            }
          }, 1000);
        }
      } catch { if (token === generation.current) setView(v => ({ ...v, message: 'Chưa có GPS' })); }
      return;
    }
    // For simulation (TEST_AUTO or TEST_JOYSTICK): prioritize preservePosition if provided, avoid snapping back to old DB position
    const origin = preservePosition ? { latitude: preservePosition[0], longitude: preservePosition[1] }
      : (state.latestPosition ?? stopsRef.current[0]);
    if (!origin) { setView(v => ({ ...v, message: 'Chưa có điểm xuất phát' })); return; }
    let p = coordinate(origin), lastTick = performance.now();
    sample.current = { latitude: p[0], longitude: p[1], capturedAt: new Date().toISOString() };
    setView(v => ({
      ...v,
      position: p,
      message: leg.current ? null : 'Đang cập nhật chỉ dẫn',
    }));
    if (!leg.current) {
      void route('CURRENT', token);
    }
    timer.current = setInterval(() => {
      if (token !== generation.current || !foreground.current) return;
      const now = performance.now(), seconds = Math.min(0.5, (now - lastTick) / 1000); lastTick = now;
      const current = leg.current;
      const speedMps = speedKmhRef.current / 3.6;
      if (cp.current?.activeSource === 'TEST_AUTO') {
        if (current && !routeBusy.current) {
          current.travelled = Math.min(current.cumulative.at(-1) ?? 0, current.travelled + seconds * speedMps);
          p = autoPosition(current.coords, current.cumulative, current.travelled);
        }
      } else {
        let moveSeconds = 0;
        let moveBearing = control.current.bearing;
        let moveSpeed = control.current.speed > 0 ? speedMps : 0;
        if (moveSpeed > 0) {
          moveSeconds = seconds;
        } else if (control.current.pendingDuration > 0) {
          moveSeconds = control.current.pendingDuration;
          moveBearing = control.current.pendingBearing;
          moveSpeed = speedMps;
          control.current.pendingDuration = 0;
        }
        if (moveSeconds > 0) {
          p = joystickPosition(p, moveBearing, moveSpeed, moveSeconds);
        }
      }
      accept({ latitude: p[0], longitude: p[1], capturedAt: new Date().toISOString() }, token);
    }, 100);
  }

  const observe = async (state: NavigationState) => {
    remote.current = state;
    if (!state.canPublish || state.status !== 'IN_PROGRESS') { if (cp.current) suspend(); return; }
    if (cp.current) {
      if (!state.checkpoint?.enabled || state.checkpoint.runId !== cp.current.runId || state.routeVersion !== cp.current.routeVersion) { suspend(); return; }
      sequence.current = Math.max(sequence.current, state.nextSequence);
      if (!routeBusy.current && cp.current.targetStopId !== state.checkpoint.targetStopId) {
        cp.current = state.checkpoint; leg.current = null;
        arrivedSince.current = null; offrouteSince.current = null;
        setView(v => ({ ...v, segment: [], traveled: [], remaining: [], guidance: null, targetStopId: state.checkpoint!.targetStopId }));
      }
      if (!leg.current && !routeBusy.current && !retryTimer.current) {
        scheduleControlledRetry(1000);
      }
      return;
    }
    if (!foreground.current || busy.current || !state.checkpoint?.enabled || !stopsRef.current.length) return;

    // Automatic resume: ONLY resume active movement if the user previously had an active session remembered in SecureStore
    let shouldAutoResume = false;
    if (userId) {
      try {
        const rememberedTripId = await navigationResumeStorage.get(userId);
        shouldAutoResume = rememberedTripId === tripId;
      } catch {}
    }

    if (shouldAutoResume) {
      const actId = ++activeActionId.current;
      busy.current = true;
      const token = generation.current;
      try {
        const resumed = await navigationApi.session(tripId, 'RESUME', state.checkpoint.runId);
        if (token !== generation.current || actId !== activeActionId.current) return;
        remote.current = resumed;
        await activate(resumed, token);
      } catch {
        if (token === generation.current && actId === activeActionId.current) {
          setView(v => ({ ...v, message: 'Chưa thể khôi phục điều hướng' }));
          scheduleControlledRetry(3000);
        }
      } finally {
        if (actId === activeActionId.current) {
          busy.current = false;
        }
      }
    } else {
      // Prepared state or reload without remembered movement:
      // Recover route for prepared state without starting movement timer!
      void prepare(state);
    }
  };

  /**
   * Prepares navigation geometry and initial vehicle marker in TEST mode.
   * Does NOT start movement timer or auto-advance. Leaves view.mode as null until user selects Auto or Manual.
   */
  async function prepare(freshState?: NavigationState) {
    if (!foreground.current) return;
    const actId = ++activeActionId.current;
    busy.current = true;
    const token = generation.current;
    try {
      let state = freshState ?? remote.current;
      if (!state?.canPublish) {
        try {
          state = await navigationApi.state(tripId);
          remote.current = state;
        } catch {
          // State fetch failed
        }
      }
      if (!state?.canPublish) {
        if (token === generation.current && actId === activeActionId.current) {
          setView(v => ({ ...v, message: 'Chưa thể khởi tạo điều hướng' }));
        }
        return;
      }

      const currentPos = sample.current
        ? coordinate(sample.current)
        : (view.position ?? (state.latestPosition ? coordinate(state.latestPosition) : coordinate(stopsRef.current[0])));
      const p = currentPos;
      const expectedRunId = state.checkpoint?.runId ?? state.controlRunId ?? null;
      const result = await navigationApi.session(tripId, 'START', expectedRunId, 'TEST_AUTO');
      if (token !== generation.current || actId !== activeActionId.current) return;
      remote.current = result;
      if (!result.checkpoint?.enabled) return;
      cp.current = result.checkpoint;
      sequence.current = result.nextSequence;
      sample.current = { latitude: p[0], longitude: p[1], capturedAt: new Date().toISOString() };

      // Prepared state: clear any active resume storage so reopening app does not auto-start movement
      if (userId) void navigationResumeStorage.clear(userId).catch(() => {});

      setView(v => ({
        ...v,
        mode: null, // User has not chosen Auto or Manual yet
        position: p,
        targetStopId: result.checkpoint!.targetStopId,
        message: 'Đang tải tuyến đường',
      }));

      const seg = await navigationApi.segment(tripId, result.checkpoint, sample.current, 'CURRENT');
      if (token !== generation.current || actId !== activeActionId.current) return;
      cancelRetry();
      accumulatedTraveled.current = [];
      const coords = decodePolyline(seg.geometry);
      const cumulative = cumulativeDistances(coords);
      leg.current = { ...seg, coords, cumulative, progress: 0, travelled: 0 };
      const split = splitSegment(coords, cumulative, 0);
      setView(v => ({
        ...v,
        mode: null,
        position: p,
        segment: coords,
        traveled: split.traveled,
        remaining: split.remaining,
        targetStopId: seg.targetStopId,
        guidance: nextGuidance(seg.instructions, cumulative, 0),
        message: null,
      }));
    } catch (err: any) {
      if (token === generation.current && actId === activeActionId.current) {
        const isRateLimit = err?.statusCode === 429;
        const retryAfter = err?.retryAfterMs;
        let displayMsg = 'Chưa thể tải tuyến đường';
        if (isRateLimit) {
          const s = Math.ceil((retryAfter ?? 3000) / 1000);
          displayMsg = `Chờ cập nhật chỉ dẫn (${s}s)`;
        } else if (err?.statusCode === 503) {
          displayMsg = 'Dịch vụ định tuyến tạm gián đoạn';
        }
        setView(v => ({ ...v, message: displayMsg }));
        scheduleControlledRetry(retryAfter);
      }
    } finally {
      if (actId === activeActionId.current) {
        busy.current = false;
      }
    }
  }

  const retry = useCallback(async () => {
    if (!foreground.current || routeBusy.current || !remote.current?.canPublish) return;
    cancelRetry();
    const token = generation.current;
    if (cp.current) {
      await route('CURRENT', token);
    } else {
      await prepare();
    }
  }, [cancelRetry]);

  async function change(source?: LocationSource) {
    if (!remote.current?.canPublish || !foreground.current) return;
    const actId = ++activeActionId.current;
    busy.current = true;
    const previous = cp.current;
    const isSwitchingTest = previous?.enabled && source && previous.activeSource !== 'LIVE' && source !== 'LIVE';

    // Capture current local position before any state updates
    const currentLocalPos: Coordinate = sample.current ? coordinate(sample.current) : (view.position ?? coordinate(stopsRef.current[0]));

    if (!isSwitchingTest) {
      suspend();
    } else {
      generation.current++;
      activeRouteId.current++; // Invalidate any inflight route from the previous mode
      routeBusy.current = false; // Release routeBusy so new mode can route immediately
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      control.current = { bearing: 0, speed: 0, pressStartedAt: 0, pendingDuration: 0, pendingBearing: 0 };
    }
    const token = generation.current;
    try {
      const action = !source ? 'STOP' : previous?.enabled ? 'SWITCH' : 'START';
      const expectedRunId = previous?.runId ?? remote.current.controlRunId ?? null;
      const result = await navigationApi.session(tripId, action, expectedRunId, source);
      if (token !== generation.current || actId !== activeActionId.current) return;
      remote.current = result;

      if (!source) {
        if (userId) void navigationResumeStorage.clear(userId).catch(() => {});
        suspend();
      } else {
        if (userId) void navigationResumeStorage.remember(userId, tripId).catch(() => {});

        // Mode switch geometry reuse validation:
        if (isSwitchingTest && leg.current) {
          const sameTarget = leg.current.targetStopId === result.checkpoint?.targetStopId;
          const sameVersion = leg.current.routeVersion === result.checkpoint?.routeVersion;
          if (sameTarget && sameVersion) {
            const proj = projectProgress(leg.current.coords, leg.current.cumulative, currentLocalPos, leg.current.progress);
            if (proj.gap <= 40) {
              // On-route: synchronize travelled with progress
              leg.current.progress = proj.progress;
              leg.current.travelled = proj.progress;
            } else {
              // Off-route: invalidate old geometry so activate requests a fresh route from current position
              leg.current = null;
            }
          } else {
            leg.current = null;
          }
        }

        // Activate with preserved local position, avoiding snapping back to old DB position
        await activate(result, token, isSwitchingTest ? currentLocalPos : undefined);
      }
      refreshRef.current();
    } catch (error) {
      if (token === generation.current && actId === activeActionId.current) {
        setView(v => ({ ...v, message: error instanceof Error ? error.message : 'Chưa thể điều hướng' }));
      }
      refreshRef.current();
    } finally {
      if (actId === activeActionId.current) {
        busy.current = false;
      }
    }
  }

  useEffect(() => { remote.current = null; suspend(); setView(empty); }, [identity, suspend]);
  useFocusEffect(useCallback(() => {
    foreground.current = AppState.currentState === 'active';
    const sub = AppState.addEventListener('change', state => {
      foreground.current = state === 'active';
      if (!foreground.current) suspend();
    });
    return () => { foreground.current = false; sub.remove(); suspend(); };
  }, [identity, suspend]));

  return {
    ...view,
    speedKmh,
    increaseSpeed,
    decreaseSpeed,
    observe,
    change,
    prepare,
    retry,
    clear: () => { cancelRetry(); suspend(); remote.current = null; setView(empty); },
    joystick: (bearing: number, speed: number) => {
      const now = performance.now();
      if (speed > 0) {
        control.current.bearing = bearing;
        control.current.speed = speed;
        control.current.pressStartedAt = now;
      } else {
        if (control.current.speed > 0 && control.current.pressStartedAt > 0) {
          const heldMs = now - control.current.pressStartedAt;
          if (heldMs < 150) {
            control.current.pendingDuration += Math.max(0.1, heldMs / 1000);
            control.current.pendingBearing = control.current.bearing;
          }
        }
        control.current.bearing = 0;
        control.current.speed = 0;
        control.current.pressStartedAt = 0;
      }
    },
  };
}
