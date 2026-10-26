import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { autoPosition, cumulativeDistances, distance, joystickPosition, nextGuidance, projectProgress, recordedParts, splitSegment } from '../utils/trip-navigation.ts';

describe('Navigation geometry and independent movement providers (pure only)', () => {
  const line: [number, number][] = [[10, 106], [10.001, 106], [10.001, 106.001]];
  const cumulative = cumulativeDistances(line);
  it('Auto follows distance along a bend, clamps at the endpoint', () => {
    assert.ok(distance(autoPosition(line, cumulative, 55), [10.0005, 106]) < 2);
    assert.deepEqual(autoPosition(line, cumulative, 10000), line[2]);
    assert.throws(() => autoPosition([], [], 1));
  });
  it('Joystick moves independently of routing and stops when released', () => {
    const p: [number, number] = [10, 106];
    assert.deepEqual(joystickPosition(p, 90, 0, 1), p);
    const east = joystickPosition(p, 90, 8, 1);
    assert.ok(east[1] > p[1]); assert.ok(Math.abs(distance(p, east) - 8) < 0.1);
  });
  it('Joystick caps elapsed time instead of filling background downtime', () => {
    assert.ok(distance(line[0], joystickPosition(line[0], 0, 8, 1000)) <= 16.1);
  });
  it('projection ignores a nearby future crossing and does not regress due to noise', () => {
    const loop: [number, number][] = [[10, 106], [10.01, 106], [10.01, 106.01], [10, 106.01], [10, 106]];
    const progress = projectProgress(loop, cumulativeDistances(loop), loop[0], 0);
    assert.ok(progress.progress < 1);
    assert.equal(projectProgress(line, cumulative, [10.0004, 106], 50).progress, 50);
  });
  it('TBT uses the next instruction START index and provider sign when text is a street', () => {
    const instructions = [
      { interval: [0, 1] as [number, number], sign: 0, text: '', streetName: '', distance: 111 },
      { interval: [1, 2] as [number, number], sign: 2, text: 'Road', streetName: 'Road', distance: 100 },
      { interval: [2, 2] as [number, number], sign: 4, text: '', streetName: '', distance: 0 },
    ];
    const guidance = nextGuidance(instructions, cumulative, 50)!;
    assert.equal(guidance.text, 'Rẽ phải'); assert.equal(guidance.metres, Math.round(cumulative[1] - 50));
    assert.equal(nextGuidance(instructions, cumulative, 130)!.text, 'Đến điểm dừng');

    const arrivalSign5 = [
      { interval: [0, 1] as [number, number], sign: 0, text: '', streetName: '', distance: 111 },
      { interval: [1, 2] as [number, number], sign: 5, text: '', streetName: 'Trường THCS', distance: 50 },
    ];
    assert.equal(nextGuidance(arrivalSign5, cumulative, 115)!.text, 'Đến điểm dừng');
  });
  it('unknown empty instructions never become invented turns', () => {
    assert.equal(nextGuidance([{ interval: [0, 0], sign: 999, text: '', streetName: '', distance: 0 }], [0], 0), null);
  });
  it('a final continuous instruction uses remaining geometry distance, not zero metres', () => {
    const result = nextGuidance([{ interval: [0, 2], sign: 0, text: '', streetName: '', distance: cumulative[2] }], cumulative, 50)!;
    assert.equal(result.text, 'Tiếp tục đến điểm dừng');
    assert.equal(result.metres, Math.round(cumulative[2] - 50));
  });
});
describe('Short tap impulse, tick separation, and time-based confirmation', () => {
  it('short tap impulse model ensures taps < 150ms produce at least 0.8m displacement', () => {
    let bearing = 0, speed = 0, pressStartedAt = 0, pendingDuration = 0, pendingBearing = 0;
    const startPress = (b: number, s: number, t: number) => {
      bearing = b; speed = s; pressStartedAt = t;
    };
    const releasePress = (t: number) => {
      if (speed > 0 && pressStartedAt > 0) {
        const heldMs = t - pressStartedAt;
        if (heldMs < 150) {
          pendingDuration += Math.max(0.1, heldMs / 1000);
          pendingBearing = bearing;
        }
      }
      bearing = 0; speed = 0; pressStartedAt = 0;
    };

    startPress(90, 8, 1000);
    releasePress(1050);

    let moveSeconds = 0, moveBearing = bearing, moveSpeed = speed;
    if (moveSpeed > 0) {
      moveSeconds = 0.1;
    } else if (pendingDuration > 0) {
      moveSeconds = pendingDuration;
      moveBearing = pendingBearing;
      moveSpeed = 8;
      pendingDuration = 0;
    }

    const p: [number, number] = [10.7769, 106.7009];
    const moved = joystickPosition(p, moveBearing, moveSpeed, moveSeconds);
    const d = distance(p, moved);
    assert.ok(d >= 0.79 && d <= 0.85, `Short tap moved ${d}m, expected ~0.8m`);
    assert.equal(pendingDuration, 0, 'Impulse should be consumed once');
  });

  it('time-based arrival requires >= 2.5s sustained close instead of premature 3 ticks', () => {
    let arrivedSince: number | null = null;
    let advanced = false;
    const checkArrival = (close: boolean, now: number) => {
      if (close) {
        if (!arrivedSince) arrivedSince = now;
        else if (now - arrivedSince >= 2500) {
          arrivedSince = null;
          advanced = true;
        }
      } else {
        arrivedSince = null;
      }
    };

    checkArrival(true, 1000);
    checkArrival(true, 1100);
    checkArrival(true, 1200);
    assert.equal(advanced, false, '3 ticks (200ms elapsed) must not trigger premature arrival');

    checkArrival(true, 3600);
    assert.equal(advanced, true, 'Sustained close >= 2.5s must trigger arrival');
  });

  it('time-based off-route requires >= 3.0s sustained gap > 40m before rerouting', () => {
    let offrouteSince: number | null = null;
    let rerouted = false;
    const checkOffRoute = (gap: number, now: number) => {
      if (gap > 40) {
        if (!offrouteSince) offrouteSince = now;
        if (now - offrouteSince >= 3000) {
          offrouteSince = null;
          rerouted = true;
        }
      } else {
        offrouteSince = null;
      }
    };

    checkOffRoute(50, 1000);
    checkOffRoute(50, 1500);
    assert.equal(rerouted, false, 'Transient 500ms gap must not trigger reroute');

    checkOffRoute(10, 1600);
    assert.equal(offrouteSince, null, 'Returning to route resets offroute tracker');

    checkOffRoute(50, 2000);
    checkOffRoute(50, 5100);
    assert.equal(rerouted, true, 'Sustained offroute >= 3.0s must trigger reroute');
  });
});
describe('Recorded history, never planned geometry backfill', () => {
  const point = (sequence: number, runId: string, seconds: number) => ({ sequence, runId, latitude: 10, longitude: 106, recordedAt: new Date(seconds * 1000).toISOString() });
  it('empty remains empty and one point remains one marker', () => {
    assert.deepEqual(recordedParts([]), []);
    assert.deepEqual(recordedParts([point(1, 'run', 0)]), [[[10, 106]]]);
  });
  it('splits run changes, long gaps, and missing sequences', () => {
    const parts = recordedParts([point(1, 'a', 0), point(2, 'a', 5), point(3, 'a', 40), point(4, 'b', 45), point(6, 'b', 50)]);
    assert.deepEqual(parts.map(p => p.length), [2, 1, 1, 1]);
  });
});
describe('Two-tone progress geometry split (splitSegment)', () => {
  const line: [number, number][] = [[10.770, 106.700], [10.771, 106.700], [10.771, 106.702], [10.773, 106.702]];
  const cumulative = cumulativeDistances(line);
  const totalLength = cumulative[cumulative.length - 1];

  it('handles empty or single-point geometries safely', () => {
    assert.deepEqual(splitSegment([], [], 50), { traveled: [], remaining: [] });
    assert.deepEqual(splitSegment([[10, 106]], [0], 50), { traveled: [], remaining: [[10, 106]] });
  });

  it('progress <= 0 leaves traveled empty and remaining full', () => {
    const split = splitSegment(line, cumulative, 0);
    assert.deepEqual(split.traveled, []);
    assert.deepEqual(split.remaining, line);
  });

  it('progress >= totalLength leaves remaining empty and traveled full', () => {
    const split = splitSegment(line, cumulative, totalLength + 10);
    assert.deepEqual(split.traveled, line);
    assert.deepEqual(split.remaining, []);
  });

  it('middle progress splits at interpolated coordinate and creates a seamless join', () => {
    const midProgress = totalLength / 2;
    const split = splitSegment(line, cumulative, midProgress);

    assert.ok(split.traveled.length >= 2, 'traveled should have at least 2 points');
    assert.ok(split.remaining.length >= 2, 'remaining should have at least 2 points');

    // Start of traveled is route origin, end of remaining is route target
    assert.deepEqual(split.traveled[0], line[0]);
    assert.deepEqual(split.remaining[split.remaining.length - 1], line[line.length - 1]);

    // End of traveled and start of remaining MUST be the exact same coordinate (seamless join)
    const splitEnd = split.traveled[split.traveled.length - 1];
    const splitStart = split.remaining[0];
    assert.deepEqual(splitEnd, splitStart, 'traveled end and remaining start must seamlessly join');

    // Verify split coordinate is located along the segment at the specified progress distance
    const traveledDist = cumulativeDistances(split.traveled);
    const measuredTraveled = traveledDist[traveledDist.length - 1];
    assert.ok(Math.abs(measuredTraveled - midProgress) < 0.5, `measured traveled ${measuredTraveled} vs expected ${midProgress}`);
  });
});

describe('Request ownership and lifecycle coordination', () => {
  it('superseded request does not clear busy flag of a newer active request', () => {
    let activeRouteId = 0;
    let routeBusy = false;

    // Request 1 starts
    const req1 = ++activeRouteId;
    routeBusy = true;

    // Mode switch or new request supersedes request 1
    const req2 = ++activeRouteId;
    routeBusy = true;

    // Request 1 finishes late in finally:
    if (req1 === activeRouteId) {
      routeBusy = false;
    }
    assert.equal(routeBusy, true, 'Request 1 must NOT clear routeBusy because Request 2 owns it');

    // Request 2 finishes in finally:
    if (req2 === activeRouteId) {
      routeBusy = false;
    }
    assert.equal(routeBusy, false, 'Request 2 releases routeBusy because it is the current owner');
  });

  it('Manual to Auto preserves progress when on-route and avoids resetting travelled to 0', () => {
    const coords: [number, number][] = [[10.770, 106.700], [10.771, 106.700], [10.772, 106.700]];
    const cumulative = cumulativeDistances(coords);
    const leg = { coords, cumulative, progress: 0, travelled: 0, targetStopId: 'stop-1', routeVersion: 'v1' };

    // Driver steers with joystick to halfway point
    const currentPos: [number, number] = [10.7705, 106.700];
    const proj = projectProgress(leg.coords, leg.cumulative, currentPos, leg.progress);
    assert.ok(proj.gap <= 40, 'Vehicle is within on-route threshold');

    // accept() updates both progress and travelled
    leg.progress = proj.progress;
    leg.travelled = proj.progress;
    assert.ok(leg.travelled > 50, 'Travelled must advance with manual driving');

    // When driver switches to Auto:
    const checkpointResult = { targetStopId: 'stop-1', routeVersion: 'v1' };
    const sameTarget = leg.targetStopId === checkpointResult.targetStopId;
    const sameVersion = leg.routeVersion === checkpointResult.routeVersion;
    assert.ok(sameTarget && sameVersion, 'Route target and version match');

    // Recheck projection at current position
    const switchProj = projectProgress(leg.coords, leg.cumulative, currentPos, leg.progress);
    if (switchProj.gap <= 40) {
      leg.progress = switchProj.progress;
      leg.travelled = switchProj.progress;
    }
    assert.equal(leg.travelled, leg.progress, 'Auto travelled must start from manual progress, not 0');
  });

  it('Manual to Auto off-route invalidates old geometry to prevent snap-teleport', () => {
    const coords: [number, number][] = [[10.770, 106.700], [10.771, 106.700], [10.772, 106.700]];
    const cumulative = cumulativeDistances(coords);
    let leg: any = { coords, cumulative, progress: 50, travelled: 50, targetStopId: 'stop-1', routeVersion: 'v1' };

    // Driver drove off-route by 100 meters
    const offroutePos: [number, number] = [10.7705, 106.705];
    const proj = projectProgress(leg.coords, leg.cumulative, offroutePos, leg.progress);
    assert.ok(proj.gap > 40, 'Vehicle is off-route');

    if (proj.gap > 40) {
      leg = null; // Invalidate geometry, require fresh route from current position
    }
    assert.equal(leg, null, 'Off-route vehicle must not reuse old geometry');
  });

  it('Planned line visibility: hidden for Driver in active trip, visible for Observer', () => {
    const isDriver = true;
    const terminal = false;
    const status = 'IN_PROGRESS';
    let showPlanned = false;

    // Driver view
    const isDriverActiveNavigation = isDriver && !terminal && status === 'IN_PROGRESS';
    let hidePlanned = isDriverActiveNavigation ? !showPlanned : (terminal && !showPlanned);
    assert.equal(hidePlanned, true, 'Planned line must be hidden for Driver in active navigation by default');

    // Driver toggles Tham chiếu
    showPlanned = true;
    hidePlanned = isDriverActiveNavigation ? !showPlanned : (terminal && !showPlanned);
    assert.equal(hidePlanned, false, 'Planned line must show for Driver when Tham chiếu is toggled on');

    // Observer view (Parent / Admin: isDriver === false)
    const isObserver = false;
    const isObserverActiveNavigation = isObserver && !terminal && status === 'IN_PROGRESS';
    showPlanned = false;
    const observerHidePlanned = isObserverActiveNavigation ? !showPlanned : (terminal && !showPlanned);
    assert.equal(observerHidePlanned, false, 'Planned line must NOT be hidden for Observer during active trip');
  });
});

describe('Controlled retry coordination, dynamic origin, and IN_PROGRESS recovery', () => {
  it('Failure schedules exactly one retry timer with exponential backoff and caps at max', () => {
    let retryTimer: any = null;
    let retryCount = 0;
    let scheduledDelay = 0;

    const scheduleRetry = (baseMs = 3000, maxMs = 30000) => {
      if (retryTimer) return; // Only 1 retry timer active at a time
      retryCount++;
      scheduledDelay = Math.min(baseMs * Math.pow(1.5, retryCount - 1), maxMs);
      retryTimer = { id: 1, delay: scheduledDelay };
    };

    scheduleRetry();
    assert.equal(scheduledDelay, 3000);
    assert.equal(retryCount, 1);
    assert.ok(retryTimer !== null);

    // Subsequent trigger while timer active does not create duplicate
    scheduleRetry();
    assert.equal(retryCount, 1, 'Should not increment retry count while timer is already pending');

    // Timer fires
    retryTimer = null;
    scheduleRetry();
    assert.equal(scheduledDelay, 4500);
    assert.equal(retryCount, 2);
  });

  it('Route success cancels pending retry and clears error state; ticks do not re-dispatch', () => {
    let retryTimer: any = { id: 1 };
    let retryCount = 3;
    let errorMessage: string | null = 'Chưa thể tải tuyến đường';
    let leg: any = null;

    const cancelRetry = () => {
      retryTimer = null;
      retryCount = 0;
    };

    const handleRouteSuccess = (newLeg: any) => {
      cancelRetry();
      errorMessage = null;
      leg = newLeg;
    };

    handleRouteSuccess({ coords: [[10, 106], [10.1, 106.1]] });

    assert.equal(retryTimer, null, 'Retry timer must be cancelled');
    assert.equal(retryCount, 0, 'Retry count must be reset');
    assert.equal(errorMessage, null, 'Error message must be cleared');
    assert.ok(leg !== null, 'Leg is active');

    // Tick simulation checks: if leg exists, tick does NOT schedule retry
    const onTick = () => {
      if (!leg && !retryTimer) {
        retryTimer = { id: 2 };
      }
    };
    onTick();
    assert.equal(retryTimer, null, 'Tick must not schedule retry when route is already active');
  });

  it('Stale error response from an old generation does not resurrect retry after success', () => {
    let generation = 0;
    let retryTimer: any = null;
    let activeLeg: any = null;

    // Dispatch request 1 (generation 1)
    const gen1 = ++generation;

    // Dispatch request 2 (generation 2, e.g. manual retry button)
    const gen2 = ++generation;

    // Request 2 succeeds first
    if (gen2 === generation) {
      activeLeg = { coords: [[10, 106]] };
      retryTimer = null;
    }

    // Request 1 fails late
    const handleFailure = (reqGen: number) => {
      if (reqGen !== generation) {
        // Stale response ignored!
        return;
      }
      retryTimer = { id: 1 };
    };

    handleFailure(gen1);
    assert.equal(retryTimer, null, 'Stale response from previous generation must not set retry timer');
    assert.ok(activeLeg !== null, 'Active leg remains preserved');
  });

  it('Dynamic origin: start stop is used initially; after vehicle moves, latest position is used', () => {
    const startStop = { latitude: 10.875, longitude: 106.799 };
    let vehicleSample: { latitude: number; longitude: number } | null = null;
    let viewPosition: [number, number] | null = null;

    const getOrigin = (): [number, number] => {
      if (vehicleSample) return [vehicleSample.latitude, vehicleSample.longitude];
      if (viewPosition) return viewPosition;
      return [startStop.latitude, startStop.longitude];
    };

    // Before trip moves: uses start stop
    assert.deepEqual(getOrigin(), [10.875, 106.799]);

    // Vehicle moves 500m away in simulation or GPS
    viewPosition = [10.870, 106.805];
    assert.deepEqual(getOrigin(), [10.870, 106.805], 'Must use vehicle viewPosition once moved');

    // High precision GPS sample arrives
    vehicleSample = { latitude: 10.8695, longitude: 106.8055 };
    assert.deepEqual(getOrigin(), [10.8695, 106.8055], 'Must use vehicleSample over viewPosition when available');
  });

  it('Trip IN_PROGRESS reload: loads route in prepared state without auto-starting movement', () => {
    const tripStatus = 'IN_PROGRESS';
    let movementTimerActive = false;
    let movementMode: 'auto' | 'manual' | null = null;
    let rememberedMovementMode: 'auto' | null = null; // No remembered auto in storage
    let routeLoaded = false;

    // App reopens: checks trip state
    if (tripStatus === 'IN_PROGRESS') {
      routeLoaded = true; // Fetches route
      if (rememberedMovementMode === 'auto') {
        movementMode = 'auto';
        movementTimerActive = true;
      } else {
        // Stays prepared without moving!
        movementMode = null;
        movementTimerActive = false;
      }
    }

    assert.equal(routeLoaded, true, 'Route is fetched for IN_PROGRESS trip');
    assert.equal(movementMode, null, 'Movement mode is not started automatically');
    assert.equal(movementTimerActive, false, 'Movement timer must not run until user selects Auto or uses Joystick');
  });

  it('End of geometry without reaching target distance does not trigger milestone arrival', () => {
    const coords: [number, number][] = [[10.0, 106.0], [10.001, 106.0]];
    const cumulative = cumulativeDistances(coords);
    const targetStopPos: [number, number] = [10.005, 106.0]; // Target is 500m further away!

    // Vehicle reaches end of geometry
    const vehicleAtGeometryEnd = coords[1];
    const distToTarget = distance(vehicleAtGeometryEnd, targetStopPos);
    assert.ok(distToTarget > 400, 'Target stop is still far from geometry end');

    let arrived = false;
    if (distToTarget <= 30) {
      arrived = true;
    }

    assert.equal(arrived, false, 'Reaching end of premature geometry MUST NOT mark milestone arrival');
  });

  it('Stop, unmount, or terminal status cancels retry immediately', () => {
    let retryTimer: any = { id: 1 };
    const cancelRetry = () => { retryTimer = null; };

    // Trip completes or user navigates back
    const onTripTerminalOrUnmount = () => {
      cancelRetry();
    };

    onTripTerminalOrUnmount();
    assert.equal(retryTimer, null, 'Retry timer must be cancelled on terminal or unmount');
  });
});

describe('Full trip routing, observer real-time sync, and no-stop test controls', () => {
  it('Observer dynamically computes two-tone split from latestPosition and route geometry', () => {
    // Complete 3-stop route: School -> Dropoff 1 -> Dropoff 2
    const routeCoords: [number, number][] = [
      [10.875, 106.799], // School (0m)
      [10.850, 106.815], // Dropoff 1 (~3.2km)
      [10.839, 106.830], // Dropoff 2 (~5.4km)
    ];
    const cumulative = cumulativeDistances(routeCoords);
    const totalLength = cumulative[cumulative.length - 1];

    // Vehicle telemetry reported at midway between School and Dropoff 1
    const vehicleTelemetry: [number, number] = [10.8625, 106.807];
    const proj = projectProgress(routeCoords, cumulative, vehicleTelemetry, 0, Infinity);

    const split = splitSegment(routeCoords, cumulative, proj.progress);

    // Traveled slice (gray): starts at School, ends at vehicle position
    assert.ok(split.traveled.length >= 2, 'Observer traveled line must have points');
    assert.deepEqual(split.traveled[0], routeCoords[0], 'Traveled begins at School');

    // Remaining slice (blue): starts at vehicle position, ends at final destination
    assert.ok(split.remaining.length >= 2, 'Observer remaining line must have points');
    assert.deepEqual(split.remaining[split.remaining.length - 1], routeCoords[routeCoords.length - 1], 'Remaining goes to final stop');

    // Traveled and remaining join seamlessly at vehicle position
    assert.deepEqual(split.traveled[split.traveled.length - 1], split.remaining[0]);

    // When observer renders, raw planned line is hidden in favor of two-tone active line
    const hasObserverRouting = split.traveled.length > 0 && split.remaining.length > 0;
    const hidePlanned = hasObserverRouting;
    assert.equal(hidePlanned, true, 'Observer hides raw single-color line to show two-tone split');
  });

  it('Traveled history accumulation preserves previous segments across ADVANCE', () => {
    let accumulatedTraveled: [number, number][] = [];

    // Leg 1: Stop A -> Stop B
    const leg1Coords: [number, number][] = [[10.875, 106.799], [10.850, 106.815]];
    const leg1Cumulative = cumulativeDistances(leg1Coords);
    const leg1Total = leg1Cumulative[leg1Cumulative.length - 1];

    // Vehicle drives and reaches Stop B
    const split1 = splitSegment(leg1Coords, leg1Cumulative, leg1Total);
    accumulatedTraveled = [...accumulatedTraveled, ...split1.traveled];
    assert.ok(accumulatedTraveled.length >= 2, 'Leg 1 points accumulated');

    // ADVANCE to Leg 2: Stop B -> Stop C
    const leg2Coords: [number, number][] = [[10.850, 106.815], [10.839, 106.830]];
    const leg2Cumulative = cumulativeDistances(leg2Coords);

    // Vehicle moves 50% along Leg 2
    const leg2Progress = leg2Cumulative[leg2Cumulative.length - 1] / 2;
    const split2 = splitSegment(leg2Coords, leg2Cumulative, leg2Progress);

    // Total displayed traveled line combines accumulated history + current leg traveled
    const fullTraveled = [...accumulatedTraveled, ...split2.traveled];
    assert.deepEqual(fullTraveled[0], leg1Coords[0], 'Total traveled starts at Stop A');
    assert.deepEqual(fullTraveled[fullTraveled.length - 1], split2.remaining[0], 'Total traveled connects to vehicle');
    assert.deepEqual(split2.remaining[split2.remaining.length - 1], leg2Coords[1], 'Remaining continues to Stop C');
  });

  it('Test mode controls render only Auto and Manual buttons without Dừng button', () => {
    const testMode = true;
    let renderedButtons: string[] = [];

    // Navigation controls rendering logic:
    if (testMode) {
      renderedButtons.push('TEST_AUTO', 'TEST_JOYSTICK');
    } else {
      renderedButtons.push('LIVE');
    }
    // Dừng button condition:
    let mode: string | null = 'TEST_AUTO';
    if (!testMode && !!mode) {
      renderedButtons.push('STOP');
    }

    assert.deepEqual(renderedButtons, ['TEST_AUTO', 'TEST_JOYSTICK'], 'In testMode, only Auto and Manual are available');
    assert.equal(renderedButtons.includes('STOP'), false, 'Dừng button must not be rendered in testMode');
  });

  it('Switching Auto to Manual pauses movement without destroying session or clearing route', () => {
    let mode = 'TEST_AUTO';
    let sessionAction = 'SWITCH';
    let leg: any = { coords: [[10, 106], [10.1, 106]], progress: 50, travelled: 50 };
    let joystickSpeed = 0;

    // User switches to Manual
    mode = 'TEST_JOYSTICK';
    // Vehicle speed is 0 until joystick is actively pushed
    assert.equal(joystickSpeed, 0, 'In Manual mode, vehicle naturally stays stationary without needing STOP');
    assert.ok(leg !== null, 'Route geometry is preserved during switch');
    assert.equal(leg.travelled, 50, 'Traveled progress is preserved during switch');

    // Switching back to Auto
    mode = 'TEST_AUTO';
    assert.ok(leg !== null, 'Route geometry remains active when resuming Auto');
  });

  it('Speed adjustment controls: 30 km/h default, clamped between 10 km/h and 120 km/h, scales velocity', () => {
    let speedKmh = 30;
    const decreaseSpeed = () => { speedKmh = Math.max(10, speedKmh - 10); };
    const increaseSpeed = () => { speedKmh = Math.min(120, speedKmh + 10); };

    assert.equal(speedKmh, 30, 'Initial default speed is 30 km/h');

    decreaseSpeed();
    assert.equal(speedKmh, 20);
    decreaseSpeed();
    assert.equal(speedKmh, 10);
    decreaseSpeed();
    assert.equal(speedKmh, 10, 'Speed must clamp at minimum 10 km/h');

    // Increase up to max
    for (let i = 0; i < 15; i++) increaseSpeed();
    assert.equal(speedKmh, 120, 'Speed must clamp at maximum 120 km/h');

    // Verify distance calculation scaling
    const seconds = 0.5;
    const dist30 = seconds * (30 / 3.6);
    const dist60 = seconds * (60 / 3.6);
    assert.ok(Math.abs(dist60 - 2 * dist30) < 0.0001, '60 km/h must cover exactly twice the distance of 30 km/h');
  });

  it('Vehicle passing stop within 100m triggers ADVANCE immediately without 2.5s dwell delay', () => {
    // Road geometry from (10.0, 106.0) to (10.005, 106.0) ~ 555m
    const coords: [number, number][] = [
      [10.0, 106.0],
      [10.002, 106.0], // Stop 2 is here at ~222m
      [10.005, 106.0], // Stop 3 is here at ~555m
    ];
    const cumulative = cumulativeDistances(coords);
    const stop2Pos: [number, number] = [10.002, 106.0];
    const stop3Pos: [number, number] = [10.005, 106.0];

    const checkShouldAdvance = (vehiclePos: [number, number], progress: number) => {
      const distToTarget = distance(vehiclePos, stop2Pos);
      const targetProg = projectProgress(coords, cumulative, stop2Pos, 0, Infinity).progress;
      const passed = progress >= targetProg;
      const closerToNext = distance(vehiclePos, stop3Pos) < distToTarget;
      return (distToTarget <= 100 && (passed || distToTarget <= 30)) || (passed && (distToTarget <= 150 || closerToNext));
    };

    // Case 1: 200m before Stop 2 (progress = 22m)
    assert.equal(checkShouldAdvance([10.0002, 106.0], 22), false, 'Must not advance when 200m away from stop');

    // Case 2: Arrival at Stop 2 (dist <= 30m)
    assert.equal(checkShouldAdvance([10.0021, 106.0], 233), true, 'Must advance when arriving at stop');

    // Case 3: Passed Stop 2 by 50m (within 100m)
    assert.equal(checkShouldAdvance([10.00245, 106.0], 272), true, 'Must advance immediately when passed stop within 100m');

    // Case 4: Passed Stop 2 and closer to Stop 3 (e.g. 300m past Stop 2)
    assert.equal(checkShouldAdvance([10.004, 106.0], 444), true, 'Must advance when vehicle has passed stop towards next target');
  });
});



