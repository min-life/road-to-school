import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadGatewayException, ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { TripsService } from './trips.service.js';
import { TripNavigationService } from './trip-navigation.service.js';
import { parseCheckpoint, routeFingerprint } from './utils/navigation-state.js';
import { validateDirections, VietMapNavigationService } from './vietmap-navigation.service.js';
import { encodePolyline } from '../routes/utils/polyline.util.js';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { LocationHistoryQueryDto, NavigationSegmentDto } from './dto/trip-navigation.dto.js';

// Isolated service tests: no PrismaClient, Nest app, HTTP fetch, cron, or database writes.
describe('Navigation control and persisted-position contract (in memory only)', () => {
  let db: any, trip: any, service: TripNavigationService, routes: any, testMode: boolean;
  const driver = { id: 'driver', role: Role.DRIVER } as any;
  const actor = (role: Role, id: string, schoolId = 'school') => ({ id, role, schoolId } as any);
  const position = () => ({ latitude: 10, longitude: 106, capturedAt: new Date().toISOString(), accuracyMeters: 5 });
  const checkpoint = () => ({ version: 1, ownerSessionId: 'sid', runId: 'run', enabled: true, activeSource: 'TEST_AUTO',
    targetStopId: 'B', routeVersion: routeFingerprint(trip), activatedAt: Date.now(), lastRouteRequestedAt: 0 });
  beforeEach(() => {
    testMode = true;
    trip = { id: 'trip', routeId: 'route', schoolId: 'school', status: 'IN_PROGRESS', assignedDriverId: 'driver',
      assignedBusAttendantId: 'attendant', assignedVehicleId: 'vehicle', attendances: [{ studentId: 'child' }],
      navigationState: null, route: { polylineGeometry: null, stops: [
        { id: 'A', stopType: 'PARKING_START', stopOrder: 1, latitude: 10, longitude: 106 },
        { id: 'B', stopType: 'PICKUP', stopOrder: 2, latitude: 10.001, longitude: 106 },
        { id: 'C', stopType: 'SCHOOL_ARRIVAL', stopOrder: 3, latitude: 10.002, longitude: 106 },
      ] } };
    db = {
      $executeRaw: vi.fn(), $queryRaw: vi.fn(), $transaction: vi.fn(async (fn: any) => fn(db)),
      trip: { findUnique: vi.fn(async () => trip), update: vi.fn(async ({ data }: any) => { trip.navigationState = data.navigationState; return trip; }) },
      session: { findUnique: vi.fn(async () => ({ userId: 'driver', revokedAt: null, expiresAt: new Date(Date.now() + 60000) })) },
      parentStudentLink: { findMany: vi.fn(async () => [{ studentId: 'child' }]) },
      tripLocationPoint: { findFirst: vi.fn(async () => null), findUnique: vi.fn(async () => null),
        create: vi.fn(async ({ data }: any) => ({ ...data, recordedAt: new Date() })), findMany: vi.fn(async () => []) },
    };
    const trips = new TripsService(db, { get: () => testMode ? 'TEST' : 'LIVE' } as any);
    routes = { route: vi.fn(async () => { throw new BadGatewayException('ROUTING_UNAVAILABLE'); }) };
    service = new TripNavigationService(db, trips, routes);
  });

  it.each([[Role.SYSTEM_ADMIN, 'system'], [Role.SCHOOL_ADMIN, 'school-admin'], [Role.DRIVER, 'driver'],
    [Role.BUS_ATTENDANT, 'attendant'], [Role.PARENT, 'parent']])('allows scoped %s to read history/latest without leaking owner', async (role, id) => {
    trip.navigationState = checkpoint();
    const state = await service.navigation('trip', actor(role as Role, id as string), 'observer-session');
    expect(state.latestPosition).toBeNull(); expect(state.checkpoint).toBeNull();
    expect(JSON.stringify(state)).not.toContain('ownerSessionId');
    if (role !== Role.DRIVER) expect(state.controlRunId).toBeNull();
    expect((await service.history('trip', {}, actor(role as Role, id as string))).points).toEqual([]);
  });
  it.each([[Role.SCHOOL_ADMIN, 'other-school'], [Role.DRIVER, 'school'], [Role.BUS_ATTENDANT, 'school']])('denies wrong scope %s', async (role, schoolId) => {
    await expect(service.navigation('trip', actor(role as Role, 'wrong', schoolId as string), 'sid')).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('denies Parent without linked roster membership', async () => {
    db.parentStudentLink.findMany.mockResolvedValue([]);
    await expect(service.history('trip', {}, actor(Role.PARENT, 'parent'))).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('START preserves origin and stop order, only stores the cursor after the origin', async () => {
    const stops = JSON.stringify(trip.route.stops);
    const result = await service.session('trip', { action: 'START', source: 'TEST_AUTO' }, driver, 'sid');
    expect(result.checkpoint?.targetStopId).toBe('B'); expect(JSON.stringify(trip.route.stops)).toBe(stops);
    expect(db.trip.update.mock.calls[0][0].data).toEqual({ navigationState: expect.any(Object) });
    expect(db.tripLocationPoint.create).not.toHaveBeenCalled();
  });
  it('STOP remains disabled and RESUME cannot restart it', async () => {
    trip.navigationState = checkpoint();
    const result = await service.session('trip', { action: 'STOP', expectedRunId: 'run' }, driver, 'sid');
    expect(result.checkpoint?.enabled).toBe(false);
    await expect(service.session('trip', { action: 'RESUME', expectedRunId: result.checkpoint!.runId }, driver, 'sid')).rejects.toBeInstanceOf(ConflictException);
  });
  it('keeps a real target when every stored stop is co-located', async () => {
    trip.route.stops.forEach((s: any) => { s.latitude = 10; s.longitude = 106; });
    const state = await service.session('trip', { action: 'START', source: 'TEST_AUTO' }, driver, 'sid');
    expect(state.checkpoint?.targetStopId).toBe('A');
    const result = await service.segment('trip', { action: 'ADVANCE', position: position(), runId: state.checkpoint!.runId,
      routeVersion: state.routeVersion, expectedTargetStopId: 'A' }, driver, 'sid');
    expect(result.finished).toBe(true); expect(trip.status).toBe('IN_PROGRESS');
    expect(routes.route).not.toHaveBeenCalled();
  });
  it('RESUME changes run and preserves target without fabricating a point', async () => {
    trip.navigationState = checkpoint();
    const result = await service.session('trip', { action: 'RESUME', expectedRunId: 'run' }, driver, 'sid');
    expect(result.checkpoint?.runId).not.toBe('run'); expect(result.checkpoint?.targetStopId).toBe('B');
    expect(db.tripLocationPoint.create).not.toHaveBeenCalled();
  });
  it('RESUME preserves finished null targetStopId and does not reset to initial', async () => {
    trip.navigationState = { ...checkpoint(), targetStopId: null };
    const result = await service.session('trip', { action: 'RESUME', expectedRunId: 'run' }, driver, 'sid');
    expect(result.checkpoint?.targetStopId).toBeNull();
  });
  it('STOP preserves targetStopId while setting enabled to false', async () => {
    trip.navigationState = { ...checkpoint(), targetStopId: 'C' };
    const result = await service.session('trip', { action: 'STOP', expectedRunId: 'run' }, driver, 'sid');
    expect(result.checkpoint?.enabled).toBe(false);
    expect(result.checkpoint?.targetStopId).toBe('C');
  });
  it('re-START on existing valid checkpoint preserves current targetStopId', async () => {
    trip.navigationState = { ...checkpoint(), targetStopId: 'C' };
    const result = await service.session('trip', { action: 'START', source: 'TEST_AUTO', expectedRunId: 'run' }, driver, 'sid');
    expect(result.checkpoint?.targetStopId).toBe('C');
  });
  it('SWITCH invalidates old run; rejects stale CAS and wrong session', async () => {
    trip.navigationState = checkpoint();
    await service.session('trip', { action: 'SWITCH', source: 'TEST_JOYSTICK', expectedRunId: 'run' }, driver, 'sid');
    await expect(service.publish('trip', { ...position(), sequence: 1, runId: 'run' }, driver, 'sid')).rejects.toBeInstanceOf(ConflictException);
    await expect(service.session('trip', { action: 'RESUME', expectedRunId: trip.navigationState.runId }, driver, 'other')).rejects.toBeInstanceOf(ConflictException);
  });
  it('does not reset provider rate budget when resuming or switching source', async () => {
    trip.navigationState = { ...checkpoint(), lastRouteRequestedAt: Date.now() };
    const result = await service.session('trip', { action: 'RESUME', expectedRunId: 'run' }, driver, 'sid');
    await expect(service.segment('trip', { action: 'CURRENT', position: position(), runId: result.checkpoint!.runId,
      routeVersion: result.routeVersion, expectedTargetStopId: 'B' }, driver, 'sid')).rejects.toMatchObject({ status: 429 });
    expect(routes.route).not.toHaveBeenCalled();
  });
  it('rejects TEST sources in LIVE and does not start GPS in TEST', async () => {
    testMode = false;
    await expect(service.session('trip', { action: 'START', source: 'TEST_AUTO' }, driver, 'sid')).rejects.toBeInstanceOf(ForbiddenException);
    testMode = true;
    await expect(service.session('trip', { action: 'START', source: 'LIVE' }, driver, 'sid')).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('rejects revoked Session and reassignment before publish', async () => {
    trip.navigationState = checkpoint();
    db.session.findUnique.mockResolvedValue({ userId: 'driver', revokedAt: new Date(), expiresAt: new Date(Date.now() + 60000) });
    await expect(service.publish('trip', { ...position(), sequence: 1, runId: 'run' }, driver, 'sid')).rejects.toBeInstanceOf(UnauthorizedException);
    trip.assignedDriverId = 'replacement';
    await expect(service.publish('trip', { ...position(), sequence: 1, runId: 'run' }, driver, 'sid')).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('uses short ReadCommitted SHARE transaction and appends without updating Trip', async () => {
    trip.navigationState = checkpoint();
    await service.publish('trip', { ...position(), sequence: 1, runId: 'run' }, driver, 'sid');
    expect(db.$queryRaw.mock.calls[0][0].join('')).toContain('FOR SHARE');
    expect(db.$transaction.mock.calls[0][1]).toMatchObject({ isolationLevel: 'ReadCommitted', timeout: 3500 });
    expect(db.trip.update).not.toHaveBeenCalled();
    expect(Object.keys(db.tripLocationPoint.create.mock.calls[0][0].data).sort()).toEqual(['latitude', 'longitude', 'runId', 'sequence', 'tripId']);
  });
  it('checks terminal state after acquiring lock; no point after Complete wins', async () => {
    trip.navigationState = checkpoint();
    db.$queryRaw.mockImplementation(async () => { trip.status = 'COMPLETED'; });
    await expect(service.publish('trip', { ...position(), sequence: 1, runId: 'run' }, driver, 'sid')).rejects.toBeInstanceOf(ConflictException);
    expect(db.tripLocationPoint.create).not.toHaveBeenCalled();
  });
  it('acknowledges same retry, conflicts different payload for the same sequence', async () => {
    trip.navigationState = checkpoint();
    const point = { latitude: 10, longitude: 106, runId: 'run', sequence: 1, recordedAt: new Date() };
    db.tripLocationPoint.findUnique.mockResolvedValue(point);
    expect((await service.publish('trip', { ...position(), sequence: 1, runId: 'run' }, driver, 'sid')).nextSequence).toBe(2);
    await expect(service.publish('trip', { ...position(), latitude: 11, sequence: 1, runId: 'run' }, driver, 'sid')).rejects.toBeInstanceOf(ConflictException);
    expect(db.tripLocationPoint.create).not.toHaveBeenCalled();
  });
  it('handles competing same-sequence insert without swallowing different data', async () => {
    trip.navigationState = checkpoint();
    db.tripLocationPoint.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '6' }));
    db.tripLocationPoint.findUnique.mockResolvedValueOnce(null).mockResolvedValue({ latitude: 10, longitude: 106, runId: 'run', sequence: 1, recordedAt: new Date() });
    expect((await service.publish('trip', { ...position(), sequence: 1, runId: 'run' }, driver, 'sid')).nextSequence).toBe(2);
  });
  it('rejects cadence and sequence errors; rejects stale samples without INSERT', async () => {
    trip.navigationState = checkpoint();
    db.tripLocationPoint.findFirst.mockResolvedValue({ sequence: 1, recordedAt: new Date() });
    await expect(service.publish('trip', { ...position(), sequence: 2, runId: 'run' }, driver, 'sid')).rejects.toMatchObject({ status: 429 });
    await expect(service.publish('trip', { ...position(), sequence: 5, runId: 'run' }, driver, 'sid')).rejects.toBeInstanceOf(ConflictException);
    await expect(service.publish('trip', { ...position(), capturedAt: '2000-01-01T00:00:00Z', sequence: 2, runId: 'run' }, driver, 'sid')).rejects.toMatchObject({ status: 400 });
    expect(db.tripLocationPoint.create).not.toHaveBeenCalled();
  });
  it('requires accurate fresh GPS in LIVE, without substituting a simulated point', async () => {
    testMode = false;
    trip.navigationState = { ...checkpoint(), activeSource: 'LIVE' };
    await expect(service.publish('trip', { ...position(), accuracyMeters: null, sequence: 1, runId: 'run' }, driver, 'sid')).rejects.toMatchObject({ status: 400 });
    await expect(service.publish('trip', { ...position(), accuracyMeters: 100, sequence: 1, runId: 'run' }, driver, 'sid')).rejects.toMatchObject({ status: 400 });
    expect(db.tripLocationPoint.create).not.toHaveBeenCalled();
  });
  it('routes P→B and subsequent stops outside the transaction; provider failure never creates fallback', async () => {
    trip.navigationState = checkpoint();
    const dto = { action: 'CURRENT' as const, position: position(), runId: 'run', routeVersion: routeFingerprint(trip), expectedTargetStopId: 'B' };
    await expect(service.segment('trip', dto, driver, 'sid')).rejects.toBeInstanceOf(BadGatewayException);
    expect(routes.route).toHaveBeenCalledWith(dto.position, expect.objectContaining({ id: 'B', latitude: 10.001, longitude: 106 }), [{ latitude: 10.002, longitude: 106 }]);
    expect(routes.route.mock.invocationCallOrder[0]).toBeGreaterThan(db.trip.update.mock.invocationCallOrder[0]);
    expect(db.tripLocationPoint.create).not.toHaveBeenCalled();
  });
  it('ADVANCE changes only the next cursor; retry cannot skip another stop', async () => {
    trip.navigationState = checkpoint();
    const dto = { action: 'ADVANCE' as const, position: { ...position(), latitude: 10.001 }, runId: 'run', routeVersion: routeFingerprint(trip), expectedTargetStopId: 'B' };
    await expect(service.segment('trip', dto, driver, 'sid')).rejects.toBeInstanceOf(BadGatewayException);
    expect(trip.navigationState.targetStopId).toBe('C'); expect(trip.status).toBe('IN_PROGRESS');
    await expect(service.segment('trip', dto, driver, 'sid')).rejects.toBeInstanceOf(ConflictException);
    expect(db.trip.update.mock.calls.every(([arg]: any) => Object.keys(arg.data).join() === 'navigationState')).toBe(true);
  });
  it('ADVANCE accepts position within 100m or when closer to next target', async () => {
    trip.navigationState = checkpoint();
    // Stop B is at (10.001, 106). Position at 10.0017 is ~77m away (within 100m)
    const dto1 = { action: 'ADVANCE' as const, position: { ...position(), latitude: 10.0017 }, runId: 'run', routeVersion: routeFingerprint(trip), expectedTargetStopId: 'B' };
    await expect(service.segment('trip', dto1, driver, 'sid')).rejects.toBeInstanceOf(BadGatewayException);
    expect(trip.navigationState.targetStopId).toBe('C');
  });
  it('pages history by compound key and stable upper boundary', async () => {
    db.tripLocationPoint.findMany.mockResolvedValue([{ sequence: 3 }, { sequence: 4 }, { sequence: 5 }]);
    const page = await service.history('trip', { afterSequence: 2, snapshotMaxSequence: 8, limit: 2 }, driver);
    expect(page).toMatchObject({ nextCursor: 4, hasMore: true, snapshotMaxSequence: 8 });
    expect(db.tripLocationPoint.findMany.mock.calls[0][0]).toMatchObject({ where: { tripId: 'trip', sequence: { gt: 2, lte: 8 } }, take: 3 });
  });
});

describe('Directions validation and checkpoint parsing (pure, not provider acceptance)', () => {
  it('rejects missing nested position and out-of-range database cursors at the DTO boundary', () => {
    const dto = plainToInstance(NavigationSegmentDto, { action: 'CURRENT', runId: 'run', routeVersion: 'v', expectedTargetStopId: 'B' });
    expect(validateSync(dto).some(error => error.property === 'position')).toBe(true);
    expect(validateSync(plainToInstance(LocationHistoryQueryDto, { afterSequence: 2147483648 }))).not.toHaveLength(0);
  });
  it('rejects empty/malformed directions instead of inventing instructions', () => {
    expect(() => validateDirections({})).toThrow(BadGatewayException);
    expect(() => validateDirections({ paths: [{ points: '???', distance: 10, time: 100, instructions: [] }] })).toThrow(BadGatewayException);
  });
  it('binds interval indices to the geometry in the same input', () => {
    const points = encodePolyline([[10, 106], [10.001, 106]]);
    const path = { points, distance: 100, time: 10000, instructions: [{ interval: [0, 1], sign: 0, text: '', distance: 100 }] };
    expect(validateDirections({ paths: [path] })).toMatchObject({ geometry: points, durationSeconds: 10 });
    path.instructions[0].interval = [0, 3];
    expect(() => validateDirections({ paths: [path] })).toThrow(BadGatewayException);
  });
  it('accepts route when instructions end before geometry endpoint (e.g. 149 points with last instruction at 135)', () => {
    // Generate 149 points
    const pts: [number, number][] = Array.from({ length: 149 }, (_, i) => [10.875 + i * 0.0001, 106.799 + i * 0.0001]);
    const points = encodePolyline(pts);
    const path = {
      points,
      distance: 7200,
      time: 760000,
      instructions: [
        { interval: [0, 0], sign: 0, text: 'Xuất phát', distance: 10 },
        { interval: [0, 50], sign: 1, text: 'Rẽ phải', distance: 2000 },
        { interval: [50, 135], sign: 4, text: 'Kết thúc!', distance: 5190 },
      ],
    };
    const result = validateDirections({ code: 'OK', paths: [path] });
    expect(result.geometry).toBe(points);
    expect(result.instructions).toHaveLength(3);
    expect(result.instructions[2].interval).toEqual([50, 135]);
  });
  it('accepts route with empty instructions array without failing geometry', () => {
    const points = encodePolyline([[10, 106], [10.001, 106]]);
    const path = { points, distance: 100, time: 10000, instructions: [] };
    const result = validateDirections({ paths: [path] });
    expect(result.geometry).toBe(points);
    expect(result.instructions).toHaveLength(0);
  });
  it('does not reject route when snap distance exceeds 100m', async () => {
    const points = encodePolyline([[10.875, 106.799], [10.839, 106.830]]);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        code: 'OK',
        paths: [{ points, distance: 7000, time: 700000, instructions: [{ interval: [0, 1], sign: 0, text: '', distance: 7000 }] }],
      }),
    } as any);
    try {
      const adapter = new VietMapNavigationService({ get: () => 'valid_key' } as any);
      // Origin and target are ~200m away from polyline endpoints
      const origin = { latitude: 10.877, longitude: 106.799 }; // > 200m from first point
      const target = { latitude: 10.837, longitude: 106.830 }; // > 200m from last point
      const route = await adapter.route(origin, target);
      expect(route.geometry).toBe(points);
    } finally {
      fetchSpy.mockRestore();
    }
  });
  it('rejects absent routing key before any external request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      const adapter = new VietMapNavigationService({ get: () => undefined } as any);
      await expect(adapter.route({ latitude: 10, longitude: 106 }, { latitude: 11, longitude: 106 })).rejects.toMatchObject({ status: 503 });
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally { fetchSpy.mockRestore(); }
  });
  it('rejects corrupt checkpoint and changes fingerprint on assignment/stops', () => {
    expect(parseCheckpoint({ version: 1, enabled: true })).toBeNull();
    const trip = { routeId: 'r', assignedDriverId: 'd', assignedVehicleId: 'v', assignedBusAttendantId: 'a', route: { polylineGeometry: null, stops: [] } };
    const before = routeFingerprint(trip); trip.assignedDriverId = 'replacement';
    expect(routeFingerprint(trip)).not.toBe(before);
  });
});
