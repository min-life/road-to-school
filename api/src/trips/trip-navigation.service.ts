import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, NotFoundException, Optional, UnauthorizedException } from '@nestjs/common';
import { Prisma, Role, type User } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { TripsService } from './trips.service.js';
import { VietMapNavigationService } from './vietmap-navigation.service.js';
import { IncidentsDetectorService } from '../incidents/incidents-detector.service.js';
import { metresBetween, parseCheckpoint, routeFingerprint, type NavigationCheckpoint } from './utils/navigation-state.js';
import { resolveTripRoute } from './utils/trip-snapshot-resolver.js';
import type { LocationHistoryQueryDto, NavigationSampleDto, NavigationSegmentDto, NavigationSessionDto, PublishPositionDto } from './dto/trip-navigation.dto.js';

const include = {
  route: {
    select: {
      polylineGeometry: true,
      stops: {
        orderBy: [{ stopOrder: 'asc' as const }, { id: 'asc' as const }],
        select: { id: true, stopOrder: true, stopType: true, latitude: true, longitude: true, addressText: true },
      },
    },
  },
  attendances: { select: { studentId: true, excludedAt: true } },
} satisfies Prisma.TripInclude;
type NavigationTrip = Prisma.TripGetPayload<{ include: typeof include }>;
const pointSelect = { sequence: true, latitude: true, longitude: true, recordedAt: true, runId: true } as const;
const INTERVAL = 5000;

@Injectable()
export class TripNavigationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
    private readonly directions: VietMapNavigationService,
    @Optional() private readonly incidentsDetector?: IncidentsDetectorService,
  ) {}

  private async read(id: string, db: Prisma.TransactionClient = this.prisma) {
    const trip = await db.trip.findUnique({ where: { id }, include });
    if (!trip) throw new NotFoundException('Không tìm thấy chuyến xe');
    return trip;
  }

  private latest(id: string, db: Prisma.TransactionClient = this.prisma) {
    return db.tripLocationPoint.findFirst({ where: { tripId: id }, orderBy: { sequence: 'desc' }, select: pointSelect });
  }

  private async locked<T>(id: string, share: boolean, work: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(async tx => {
      await tx.$executeRaw`SET LOCAL lock_timeout = '1500ms'`;
      if (share) await tx.$queryRaw`SELECT id FROM trips WHERE id = ${id} FOR SHARE`;
      else await tx.$queryRaw`SELECT id FROM trips WHERE id = ${id} FOR UPDATE`;
      return work(tx);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 3500, maxWait: 2000 });
  }

  private async publisher(trip: NavigationTrip, user: User, sid: string, db: Prisma.TransactionClient) {
    if (user.role !== Role.DRIVER || trip.assignedDriverId !== user.id) throw new ForbiddenException('Chỉ tài xế được phân công có thể phát vị trí');
    if (trip.status !== 'IN_PROGRESS') throw new ConflictException('Chuyến xe không đang chạy');
    const session = sid && await db.session.findUnique({ where: { id: sid } });
    if (!session || session.userId !== user.id || session.revokedAt || session.expiresAt <= new Date()) throw new UnauthorizedException('Phiên không hợp lệ');
  }

  private owner(trip: NavigationTrip, sid: string, runId: string) {
    const state = parseCheckpoint(trip.navigationState);
    if (!state?.enabled || state.ownerSessionId !== sid || state.runId !== runId || state.routeVersion !== routeFingerprint(trip)) {
      throw new ConflictException('Phiên điều hướng đã thay đổi');
    }
    if ((state.activeSource === 'LIVE') === this.trips.isTestMode()) throw new ForbiddenException('Nguồn vị trí không phù hợp TEST/LIVE');
    return state;
  }

  private sample(sample: NavigationSampleDto, state: NavigationCheckpoint) {
    const age = Date.now() - Date.parse(sample.capturedAt);
    if (!Number.isFinite(age) || age < -5000 || age > 15000 || !Number.isFinite(sample.latitude) ||
        !Number.isFinite(sample.longitude) || Math.abs(sample.latitude) > 90 || Math.abs(sample.longitude) > 180) throw new BadRequestException('Vị trí không hợp lệ hoặc đã cũ');
    if (state.activeSource === 'LIVE' && (sample.accuracyMeters == null || sample.accuracyMeters > 50 || sample.accuracyMeters < 0)) throw new BadRequestException('GPS chưa đủ chính xác');
  }

  private async save(tx: Prisma.TransactionClient, id: string, state: NavigationCheckpoint) {
    await tx.trip.update({ where: { id }, data: { navigationState: state as unknown as Prisma.InputJsonValue } });
  }

  async navigation(id: string, user: User, sid: string) {
    const trip = await this.read(id);
    await this.trips.assertTripAccess(trip, user);
    const point = await this.latest(id);
    const state = parseCheckpoint(trip.navigationState);
    const driver = user.role === Role.DRIVER && trip.assignedDriverId === user.id;
    const version = routeFingerprint(trip);
    const current = driver && state?.ownerSessionId === sid && state.routeVersion === version;
    const checkpoint = current ? { runId: state.runId, enabled: state.enabled, activeSource: state.activeSource,
      targetStopId: state.targetStopId, routeVersion: state.routeVersion } : null;
    return { status: trip.status, routeVersion: version, latestPosition: point,
      freshness: !point ? 'NONE' : Date.now() - point.recordedAt.getTime() <= 15000 ? 'FRESH' : 'STALE',
      serverNow: new Date(), canPublish: driver && trip.status === 'IN_PROGRESS', testMode: this.trips.isTestMode(),
      checkpoint, controlRunId: driver ? state?.runId ?? null : null,
      nextSequence: driver ? (point?.sequence ?? 0) + 1 : 0, publishIntervalMs: INTERVAL };
  }

  async session(id: string, dto: NavigationSessionDto, user: User, sid: string) {
    await this.locked(id, false, async tx => {
      const trip = await this.read(id, tx);
      await this.publisher(trip, user, sid, tx);
      const previous = parseCheckpoint(trip.navigationState);
      if ((dto.expectedRunId ?? null) !== (previous?.runId ?? null)) throw new ConflictException('Tải lại phiên điều hướng');
      const version = routeFingerprint(trip);
      if (dto.action !== 'START' && (!previous || previous.ownerSessionId !== sid || previous.routeVersion !== version)) throw new ConflictException('Không thể khôi phục phiên điều hướng');
      if (previous?.enabled && previous.ownerSessionId !== sid) {
        const last = await this.latest(id, tx);
        const activeAt = last?.runId === previous.runId ? last.recordedAt.getTime() : previous.activatedAt;
        if (Date.now() - activeAt < 60000) throw new ConflictException('Một phiên khác đang điều hướng');
      }
      if (dto.action === 'RESUME' && !previous?.enabled) throw new ConflictException('Điều hướng đã dừng');
      const source = dto.source ?? previous?.activeSource;
      if (!source || ((dto.action === 'START' || dto.action === 'SWITCH') && !dto.source)) throw new BadRequestException('Chọn nguồn vị trí');
      if (dto.action !== 'STOP' && (source === 'LIVE') === this.trips.isTestMode()) throw new ForbiddenException('Nguồn vị trí không phù hợp TEST/LIVE');
      if ((dto.action === 'RESUME' || dto.action === 'STOP') && dto.source && source !== previous?.activeSource) throw new BadRequestException('Không đổi nguồn khi khôi phục');
      const resolvedStops = resolveTripRoute(trip).stops;
      const first = resolvedStops[0];
      const initial = first && ['PARKING_START', 'SCHOOL_DEPARTURE'].includes(first.stopType)
        ? resolvedStops.find((stop, index) => index > 0 && metresBetween(first, stop) > 1) ?? first : first;
      const hasValidPrevious = previous !== null && previous.routeVersion === version;
      let targetStopId: string | null;
      if (dto.action === 'RESUME' || dto.action === 'SWITCH' || dto.action === 'STOP') {
        targetStopId = hasValidPrevious ? previous.targetStopId : (initial?.id ?? null);
      } else if (dto.action === 'START') {
        targetStopId = (hasValidPrevious && previous.targetStopId !== undefined) ? previous.targetStopId : (initial?.id ?? null);
      } else {
        targetStopId = initial?.id ?? null;
      }
      if (targetStopId && !resolvedStops.some(s => s.id === targetStopId)) throw new ConflictException('Điểm tiếp theo không hợp lệ');
      if (!resolvedStops.length && dto.action !== 'STOP') throw new ConflictException('Không có điểm điều hướng');
      const lastRouteRequestedAt = dto.action === 'START' && !hasValidPrevious ? 0 : previous?.lastRouteRequestedAt ?? 0;
      await this.save(tx, id, { version: 1, ownerSessionId: sid, runId: randomUUID(), enabled: dto.action !== 'STOP',
        activeSource: source, targetStopId, routeVersion: version, activatedAt: Date.now(),
        lastRouteRequestedAt });
    });
    return this.navigation(id, user, sid);
  }

  async publish(id: string, dto: PublishPositionDto, user: User, sid: string) {
    let result: { sequence: number; nextSequence: number; recordedAt: Date };
    try {
      result = await this.locked(id, true, async tx => {
        const trip = await this.read(id, tx);
        await this.publisher(trip, user, sid, tx);
        const state = this.owner(trip, sid, dto.runId);
        const existing = await tx.tripLocationPoint.findUnique({ where: { tripId_sequence: { tripId: id, sequence: dto.sequence } }, select: pointSelect });
        if (existing) return this.retryAck(existing, dto);
        this.sample(dto, state);
        const last = await this.latest(id, tx);
        if (dto.sequence !== (last?.sequence ?? 0) + 1) throw new ConflictException('Sequence đã thay đổi');
        const delay = last ? INTERVAL - (Date.now() - last.recordedAt.getTime()) : 0;
        if (delay > 0) throw new HttpException({ statusCode: 429, code: 'NAVIGATION_RATE_LIMIT', message: 'Chờ lượt cập nhật tiếp theo', retryAfterMs: delay }, 429);
        const point = await tx.tripLocationPoint.create({ data: { tripId: id, sequence: dto.sequence,
          latitude: dto.latitude, longitude: dto.longitude, runId: dto.runId }, select: pointSelect });
        return { sequence: point.sequence, nextSequence: point.sequence + 1, recordedAt: point.recordedAt };
      });
    } catch (error) {
      // A competing same-sequence insert rolled this transaction back. Revalidate before ack.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      const trip = await this.read(id);
      await this.publisher(trip, user, sid, this.prisma);
      this.owner(trip, sid, dto.runId);
      const point = await this.prisma.tripLocationPoint.findUnique({ where: { tripId_sequence: { tripId: id, sequence: dto.sequence } }, select: pointSelect });
      if (!point) throw new ConflictException('Sequence đã thay đổi');
      return this.retryAck(point, dto);
    }

    if (this.incidentsDetector) {
      setImmediate(() => {
        this.incidentsDetector?.evaluateTelemetry(id, {
          sequence: dto.sequence,
          latitude: dto.latitude,
          longitude: dto.longitude,
          runId: dto.runId,
          recordedAt: result.recordedAt,
        }).catch(() => {});
      });
    }

    return result;
  }

  private retryAck(point: { runId: string; latitude: number; longitude: number; sequence: number; recordedAt: Date }, dto: PublishPositionDto) {
    if (point.runId !== dto.runId || point.latitude !== dto.latitude || point.longitude !== dto.longitude) throw new ConflictException('Sequence đã được dùng cho vị trí khác');
    return { sequence: point.sequence, nextSequence: point.sequence + 1, recordedAt: point.recordedAt };
  }

  async segment(id: string, dto: NavigationSegmentDto, user: User, sid: string) {
    const request = await this.locked(id, false, async tx => {
      const trip = await this.read(id, tx);
      await this.publisher(trip, user, sid, tx);
      const state = this.owner(trip, sid, dto.runId);
      this.sample(dto.position, state);
      if (dto.routeVersion !== state.routeVersion || dto.expectedTargetStopId !== state.targetStopId) throw new ConflictException('Điểm điều hướng đã đổi');
      const resolvedStops = resolveTripRoute(trip).stops;
      const index = resolvedStops.findIndex(s => s.id === state.targetStopId);
      if (index < 0) throw new ConflictException('Điểm tiếp theo không hợp lệ');
      if (dto.action === 'ADVANCE') {
        const reached = resolvedStops[index];
        const nextTarget = resolvedStops.find((stop, i) => i > index && metresBetween(reached, stop) > 1);
        const distToCurrent = metresBetween(dto.position, reached);
        const closerToNext = nextTarget ? metresBetween(dto.position, nextTarget) < distToCurrent : false;
        if (distToCurrent > 100 && !closerToNext) throw new ConflictException('Chưa đến điểm tiếp theo');
        // Only a navigation cursor changes; never touch attendance or operation milestones.
        state.targetStopId = nextTarget?.id ?? null;
      } else {
        const cooldown = this.trips.isTestMode() ? 3000 : 10000;
        if (Date.now() - state.lastRouteRequestedAt < cooldown) {
          throw new HttpException({ statusCode: 429, code: 'NAVIGATION_RATE_LIMIT', message: 'Chờ cập nhật chỉ dẫn',
            retryAfterMs: cooldown - (Date.now() - state.lastRouteRequestedAt) }, 429);
        }
      }
      state.lastRouteRequestedAt = Date.now();
      await this.save(tx, id, state);
      const targetIndex = resolvedStops.findIndex(s => s.id === state.targetStopId);
      const target = targetIndex >= 0 ? resolvedStops[targetIndex] : undefined;
      const subsequentStops = targetIndex >= 0
        ? resolvedStops.slice(targetIndex + 1).map(s => ({ latitude: s.latitude, longitude: s.longitude }))
        : [];
      return { state, target, subsequentStops };
    });
    const base = { segmentVersion: randomUUID(), targetStopId: request.state.targetStopId, routeVersion: request.state.routeVersion };
    if (!request.target) return { ...base, geometry: '', instructions: [], distanceMeters: 0, durationSeconds: 0, finished: true };
    const route = await this.directions.route(dto.position, request.target, request.subsequentStops);
    const current = await this.read(id);
    await this.publisher(current, user, sid, this.prisma);
    const state = this.owner(current, sid, dto.runId);
    if (state.targetStopId !== base.targetStopId || state.lastRouteRequestedAt !== request.state.lastRouteRequestedAt) throw new ConflictException('Chỉ dẫn đã thay đổi');
    return { ...base, ...route, finished: false };
  }

  async history(id: string, query: LocationHistoryQueryDto, user: User) {
    const trip = await this.read(id);
    await this.trips.assertTripAccess(trip, user);
    const max = query.snapshotMaxSequence ?? (await this.latest(id))?.sequence ?? 0;
    const cursor = query.afterSequence ?? 0;
    if (cursor > max) throw new BadRequestException('Cursor không hợp lệ');
    const limit = query.limit ?? 500;
    const points = await this.prisma.tripLocationPoint.findMany({ where: { tripId: id, sequence: { gt: cursor, lte: max } },
      orderBy: { sequence: 'asc' }, take: limit + 1, select: pointSelect });
    const hasMore = points.length > limit;
    if (hasMore) points.pop();
    return { points, nextCursor: points.at(-1)?.sequence ?? cursor, hasMore, snapshotMaxSequence: max };
  }
}
