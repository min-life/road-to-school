import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import { it } from 'node:test';
import ts from 'typescript';
import * as geometry from '../utils/trip-navigation.ts';
import * as polyline from '../utils/polyline.ts';

const source = readFileSync(new URL('../hooks/use-trip-navigation.ts', import.meta.url), 'utf8');
const script = new Script(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText);

for (const scenario of ['auto', 'live', 'multi'] as const) {
  const testMode = scenario !== 'live';
  const multipleStops = scenario === 'multi';
  it(multipleStops ? 'advances through student stops without switching to manual or fetching new geometry'
    : `departure activates ${testMode ? 'TEST_AUTO' : 'LIVE'} and starts routing and telemetry`, async () => {
    const sessions: unknown[][] = [];
    const segments: unknown[][] = [];
    const positions: unknown[][] = [];
    const state = { status: 'IN_PROGRESS', testMode, canPublish: true, nextSequence: 1,
      routeVersion: 'route', checkpoint: null, controlRunId: null, latestPosition: null, serverNow: new Date().toISOString() };
    const encoded = multipleStops ? '_p~iF~ps|UE?S?' : '_p~iF~ps|U_ulLnnqC';
    const [origin, target, end] = polyline.decodePolyline(encoded);
    let refreshes = 0;
    const api = {
      session: async (...args: unknown[]) => {
        sessions.push(args);
        return { ...state, checkpoint: { runId: `run-${sessions.length}`, enabled: true, activeSource: args[3], targetStopId: 'stop', routeVersion: 'route' } };
      },
      segment: async (...args: unknown[]) => {
        segments.push(args);
        if (multipleStops && args[4] === true) {
          return { targetStopId: 'end', cursorOnly: true, finished: false };
        }
        return { geometry: encoded, instructions: [], distanceMeters: 150, durationSeconds: 20, finished: false,
          targetStopId: 'stop', routeVersion: 'route', targetAtRouteEnd: !multipleStops };
      },
      publish: async (...args: unknown[]) => { positions.push(args); return { nextSequence: 2 }; },
    };
    const dependencies: Record<string, unknown> = {
      react: { useRef: (value: unknown) => ({ current: value }), useState: (value: unknown) => [value, () => {}],
        useCallback: (callback: unknown) => callback, useEffect: (effect: () => void) => effect() },
      'react-native': { AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) } },
      'expo-router': { useFocusEffect: (effect: () => void) => effect() },
      'expo-location': { Accuracy: { High: 1 }, requestForegroundPermissionsAsync: async () => ({ granted: true }),
        watchPositionAsync: async (_: unknown, emit: (fix: unknown) => void) => {
          emit({ coords: { latitude: 10.71, longitude: 106.71, accuracy: 10 }, timestamp: Date.now() });
          return { remove() {} };
        } },
      '../services/trip-navigation': { navigationApi: api },
      '../utils/trip-navigation': geometry,
      '../utils/polyline': polyline,
      '../services/navigation-resume-storage': { navigationResumeStorage: { remember: async () => {}, clear: async () => {} } },
    };
    const exports = {} as { useTripNavigation: (...args: unknown[]) => {
      startOnDeparture(): void; observe(value: unknown): Promise<void>;
      change(source: string): Promise<void>; joystick(bearing: number, speed: number): void;
    } };
    let tick = () => {};
    let tickTime = 0;
    script.runInNewContext({ exports, require: (name: string) => dependencies[name], performance: { now: () => tickTime },
      setInterval: (callback: () => void) => { tick = callback; return 1; },
      clearInterval() {}, setTimeout: () => 1, clearTimeout() {} });
    const engine = exports.useTripNavigation('scope', 'trip', 'driver', [
      { id: 'start', stopType: 'PARKING_START', latitude: origin[0], longitude: origin[1] },
      { id: 'stop', stopType: multipleStops ? 'DROPOFF' : 'SCHOOL_ARRIVAL', latitude: target[0], longitude: target[1] },
      ...(multipleStops ? [{ id: 'end', stopType: 'PARKING_END', latitude: end[0], longitude: end[1] }] : []),
    ], () => { refreshes++; });
    engine.startOnDeparture();
    assert.equal(refreshes, 1);
    await engine.observe(state);
    assert.deepEqual(sessions[0], ['trip', 'START', null, testMode ? 'TEST_AUTO' : 'LIVE']);
    assert.equal(segments.length, 1);
    assert.equal(positions.length, 1);
    if (multipleStops) {
      tickTime = 500;
      tick();
      await new Promise<void>(resolve => setImmediate(resolve));
      assert.equal(segments.length, 2);
      assert.equal(segments[1][3], 'ADVANCE');
      assert.equal(segments[1][4], true);
      assert.equal(sessions.length, 1);
    } else if (testMode) {
      await engine.change('TEST_JOYSTICK');
      engine.joystick(0, 1);
      tickTime = 500;
      tick();
      const before = segments.length;

      await engine.change('TEST_AUTO');

      assert.equal(segments.length, before + 1);
      const request = segments.at(-1)!;
      assert.equal(request[3], 'CURRENT');
      const position = request[2] as { latitude: number; longitude: number };
      const expected = geometry.joystickPosition(origin, 0, 30 / 3.6, 0.5);
      assert.equal(position.latitude, expected[0]);
      assert.equal(position.longitude, expected[1]);
      assert.equal((positions.at(-1)![3] as { latitude: number }).latitude, expected[0]);
    }
  });
}
