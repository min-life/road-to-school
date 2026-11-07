import { locationForCoordinates } from '../schools/location-province.js';
import { Cron } from '@nestjs/schedule';
import { lockOperations } from '../trips/utils/operations-lock.js';
import { adminRecipients, writeNotification } from '../notifications/notification-writer.js';
import { tripBlockReason } from '../schools/school-policy.js';
import { notifyIncident } from '../notifications/notification-events.js';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  TripIncidentType,
  TripIncidentStatus,
  TripStatus,
  RouteStopType,
  AttendanceStatus,
  Prisma,
} from '@prisma/client';
import { decodePolyline } from '../routes/utils/polyline.util.js';
import {
  parseTripRouteSnapshot,
  SnapshotStop,
  TripRouteSnapshot,
} from '../trips/utils/trip-snapshot-resolver.js';
import {
  combineDateAndTimeUtc,
  formatDateToVnYmd,
} from '../trips/utils/trip-time.util.js';

export interface TelemetryPoint {
  sequence: number;
  latitude: number;
  longitude: number;
  runId: string;
  recordedAt: Date;
}

@Injectable()
export class IncidentsDetectorService {
  private readonly logger = new Logger(IncidentsDetectorService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('*/30 * * * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async detectSilentAndLateTrips(): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await lockOperations(tx);
        const now = new Date();
        const running = await tx.trip.findMany({ where: { status: TripStatus.IN_PROGRESS },
          include: { locationPoints: { orderBy: { sequence: 'desc' }, take: 1 } } });
        for (const trip of running) {
          if (await tripBlockReason(tx, trip.id)) continue;
          const point = trip.locationPoints[0];
          const lastAt = point?.recordedAt ?? trip.actualStartTime ?? trip.createdAt;
          if (now.getTime() - lastAt.getTime() <= 180000) continue;
          const dedupeKey = 'gps-silent:' + trip.id;
          const existing = await tx.tripIncident.findFirst({ where: { tripId: trip.id, type: TripIncidentType.GPS_SIGNAL_LOST } });
          if (existing) continue;
          const incident = await tx.tripIncident.create({ data: {
            tripId: trip.id, type: TripIncidentType.GPS_SIGNAL_LOST, status: TripIncidentStatus.WAITING_ASSIGNMENT,
            dedupeKey, context: { latitude: point?.latitude ?? null, longitude: point?.longitude ?? null,
              addressText: null, locationSource: point ? 'LAST_KNOWN' : 'UNKNOWN',
              capturedAt: point?.recordedAt.toISOString() ?? null, detectedAt: now.toISOString() },
          } });
          await notifyIncident(tx, incident.id);
        }
        const upcoming = await tx.trip.findMany({ where: {
          status: TripStatus.SCHEDULED, scheduledStartAt: { lte: new Date(now.getTime() + 15 * 60000) },
          scheduledEndAt: { gte: now },
        } });
        for (const trip of upcoming) {
          const blockers = running.filter(other => other.id !== trip.id &&
            (other.assignedVehicleId === trip.assignedVehicleId || other.assignedDriverId === trip.assignedDriverId));
          if (!blockers.length || await tripBlockReason(tx, trip.id)) continue;
          await writeNotification(tx, { eventKey: 'late-running-risk:' + trip.id, type: 'LATE_RUNNING_TRIP_RISK',
            title: 'Chuyến sắp chạy có nguy cơ trễ', body: 'Xe hoặc tài xế còn thực hiện chuyến trước. Cần kiểm tra phân công.',
            targetType: 'TRIP', targetId: trip.id,
            userIds: [...await adminRecipients(tx, 'SYSTEM_ADMIN'), ...await adminRecipients(tx, 'SCHOOL_ADMIN', trip.schoolId)],
            context: { tripId: trip.id, schoolId: trip.schoolId, bufferMinutes: 15, blockingTripIds: blockers.map(b => b.id) },
          });
        }
      }, { timeout: 30000 });
    } catch { this.logger.warn('Đối soát cảnh báo GPS/chuyến kế tiếp chưa hoàn tất; sẽ thử lại'); }
  }

  /**
   * Perpendicular distance from point P to line segment AB in meters.
   */
  pointToSegmentDistance(
    px: number,
    py: number,
    ax: number,
    ay: number,
    bx: number,
    by: number,
  ): number {
    const midLat = ((ay + by) / 2) * (Math.PI / 180);
    const mPerDegLat = 111132.954;
    const mPerDegLng = 111412.84 * Math.cos(midLat);

    const aX = ax * mPerDegLng;
    const aY = ay * mPerDegLat;
    const bX = bx * mPerDegLng;
    const bY = by * mPerDegLat;
    const pX = px * mPerDegLng;
    const pY = py * mPerDegLat;

    const dx = bX - aX;
    const dy = bY - aY;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
      return Math.hypot(pX - aX, pY - aY);
    }
    const t = Math.max(0, Math.min(1, ((pX - aX) * dx + (pY - aY) * dy) / lenSq));
    const projX = aX + t * dx;
    const projY = aY + t * dy;
    return Math.hypot(pX - projX, pY - projY);
  }

  /**
   * Minimum distance in meters from point (lat, lng) to the polyline.
   */
  pointToPolylineDistance(
    lat: number,
    lng: number,
    polyline: [number, number][],
  ): { distanceMeters: number; closestSegmentIndex: number } {
    if (polyline.length === 0) {
      return { distanceMeters: Infinity, closestSegmentIndex: -1 };
    }
    if (polyline.length === 1) {
      const dist = this.pointToSegmentDistance(
        lng,
        lat,
        polyline[0][1],
        polyline[0][0],
        polyline[0][1],
        polyline[0][0],
      );
      return { distanceMeters: dist, closestSegmentIndex: 0 };
    }

    let minDistance = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < polyline.length - 1; i++) {
      const a = polyline[i];
      const b = polyline[i + 1];
      const dist = this.pointToSegmentDistance(lng, lat, a[1], a[0], b[1], b[0]);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }

    return { distanceMeters: minDistance, closestSegmentIndex: closestIndex };
  }

  /**
   * Polyline distance in meters along the polyline from segmentIndex to targetStop coords.
   */
  remainingDistanceAlongPolyline(
    polyline: [number, number][],
    fromSegmentIndex: number,
    targetLat: number,
    targetLng: number,
  ): number {
    const { closestSegmentIndex: toSegmentIndex } = this.pointToPolylineDistance(
      targetLat,
      targetLng,
      polyline,
    );
    if (toSegmentIndex <= fromSegmentIndex) {
      // Vehicle is at or ahead of target stop along polyline
      return this.pointToSegmentDistance(
        targetLng,
        targetLat,
        polyline[fromSegmentIndex][1],
        polyline[fromSegmentIndex][0],
        polyline[Math.min(fromSegmentIndex + 1, polyline.length - 1)][1],
        polyline[Math.min(fromSegmentIndex + 1, polyline.length - 1)][0],
      );
    }

    let totalMeters = 0;
    for (let i = fromSegmentIndex; i < toSegmentIndex && i < polyline.length - 1; i++) {
      const a = polyline[i];
      const b = polyline[i + 1];
      const midLat = ((a[0] + b[0]) / 2) * (Math.PI / 180);
      const dx = (b[1] - a[1]) * 111412.84 * Math.cos(midLat);
      const dy = (b[0] - a[0]) * 111132.954;
      totalMeters += Math.hypot(dx, dy);
    }
    return totalMeters;
  }

  /**
   * Evaluates telemetry outside the location ingestion transaction.
   * Never throws so telemetry ingestion is not affected.
   */
  async evaluateTelemetry(tripId: string, point: TelemetryPoint): Promise<void> {
    try {
      // 1. Quick check if both auto incident types already exist
      const existing = await this.prisma.tripIncident.findMany({
        where: {
          tripId,
          type: { in: [TripIncidentType.OFF_ROUTE, TripIncidentType.LATE_STOP] },
        },
        select: { type: true },
      });
      const hasOffRoute = existing.some((i) => i.type === TripIncidentType.OFF_ROUTE);
      const hasLateStop = existing.some((i) => i.type === TripIncidentType.LATE_STOP);
      if (hasOffRoute && hasLateStop) {
        return;
      }

      // 2. Read Trip with snapshot and attendances
      const trip = await this.prisma.trip.findUnique({
        where: { id: tripId },
        select: {
          id: true,
          status: true,
          serviceDate: true,
          routeSnapshot: true,
          attendances: {
            where: { excludedAt: null },
            select: { studentId: true, status: true, alightedAt: true },
          },
        },
      });

      if (!trip || trip.status !== TripStatus.IN_PROGRESS) {
        return;
      }

      const snapshot = parseTripRouteSnapshot(trip.routeSnapshot);
      if (!snapshot || !snapshot.polylineGeometry || !snapshot.stops?.length) {
        return;
      }

      // 3. Load recent samples for this trip & runId
      const recentPoints = await this.prisma.tripLocationPoint.findMany({
        where: { tripId, runId: point.runId },
        orderBy: { sequence: 'desc' },
        take: 12,
      });

      if (recentPoints.length < 2) {
        return;
      }

      recentPoints.sort((a, b) => a.sequence - b.sequence);

      const decoded = decodePolyline(snapshot.polylineGeometry);
      if (decoded.length < 2) {
        return;
      }

      // 4. OFF_ROUTE evaluation
      if (!hasOffRoute) {
        await this.evaluateOffRoute(trip, snapshot, decoded, recentPoints);
      }

      // 5. LATE_STOP evaluation
      if (!hasLateStop) {
        await this.evaluateLateStop(trip, snapshot, decoded, recentPoints);
      }
    } catch (err: any) {
      this.logger.error(`Error in evaluateTelemetry for trip ${tripId}: ${err?.message || String(err)}`);
    }
  }

  /**
   * OFF_ROUTE: deviation > 50m for >= 15 seconds with continuous samples (gap <= 15s).
   */
  async evaluateOffRoute(
    trip: { id: string },
    snapshot: TripRouteSnapshot,
    polyline: [number, number][],
    recentPoints: Array<{ sequence: number; latitude: number; longitude: number; recordedAt: Date }>,
  ): Promise<void> {
    // Calculate distance for each sample
    const sampleDistances = recentPoints.map((p) => {
      const { distanceMeters } = this.pointToPolylineDistance(p.latitude, p.longitude, polyline);
      return { ...p, distanceMeters };
    });

    // Check longest contiguous suffix ending at the last point where distance >= 50m and gap <= 15s
    let streakStartIndex = sampleDistances.length - 1;
    if (sampleDistances[streakStartIndex].distanceMeters <= 50) {
      return;
    }

    for (let i = sampleDistances.length - 1; i > 0; i--) {
      const curr = sampleDistances[i];
      const prev = sampleDistances[i - 1];
      const gapMs = curr.recordedAt.getTime() - prev.recordedAt.getTime();
      if (prev.distanceMeters > 50 && gapMs <= 15000 && gapMs >= 0) {
        streakStartIndex = i - 1;
      } else {
        break;
      }
    }

    const streakSamples = sampleDistances.slice(streakStartIndex);
    const firstSample = streakSamples[0];
    const lastSample = streakSamples[streakSamples.length - 1];
    const durationMs = lastSample.recordedAt.getTime() - firstSample.recordedAt.getTime();

    if (streakSamples.length >= 2 && durationMs >= 15000) {
      const dedupeKey = `${trip.id}:${TripIncidentType.OFF_ROUTE}`;
      try {
        const location = await locationForCoordinates(lastSample.latitude, lastSample.longitude);
        await this.prisma.$transaction(async tx => { await lockOperations(tx);
      const current = await tx.trip.findUnique({ where: { id: trip.id } });
      if (current?.status !== TripStatus.IN_PROGRESS || await tripBlockReason(tx, trip.id)) return;
      const created = await tx.tripIncident.create({
          data: {
            tripId: trip.id,
            type: TripIncidentType.OFF_ROUTE,
            status: TripIncidentStatus.WAITING_CONFIRMATION,
            dedupeKey,
            reportedById: null,
            context: {
              distanceMeters: Math.round(lastSample.distanceMeters),
              thresholdMeters: 50,
              durationSeconds: Math.round(durationMs / 1000),
              sampleCount: streakSamples.length,
              detectedAt: lastSample.recordedAt.toISOString(),
              latitude: lastSample.latitude,
              longitude: lastSample.longitude,
              addressText: location.addressText, locationSource: 'RECORDED', capturedAt: lastSample.recordedAt.toISOString(),
            },
          },
        }); await notifyIncident(tx, created.id); return created; });
        this.logger.warn(`TripIncident OFF_ROUTE created for trip ${trip.id}`);
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          // Already created concurrently
          return;
        }
        throw e;
      }
    }
  }

  /**
   * LATE_STOP: next unserved PICKUP/DROPOFF stop delay > 5m (300s) for >= 30 seconds.
   */
  async evaluateLateStop(
    trip: {
      id: string;
      serviceDate: Date;
      attendances: Array<{ studentId: string; status: AttendanceStatus; alightedAt: Date | null }>;
    },
    snapshot: TripRouteSnapshot,
    polyline: [number, number][],
    recentPoints: Array<{ sequence: number; latitude: number; longitude: number; recordedAt: Date }>,
  ): Promise<void> {
    // Find next unserved PICKUP or DROPOFF stop
    const attendanceMap = new Map(trip.attendances.map((a) => [a.studentId, a]));
    const candidateStops = snapshot.stops.filter(
      (s) => s.stopType === RouteStopType.PICKUP || s.stopType === RouteStopType.DROPOFF,
    );

    let targetStop: SnapshotStop | null = null;
    for (const stop of candidateStops) {
      if (stop.stopType === RouteStopType.PICKUP) {
        const att = stop.studentId ? attendanceMap.get(stop.studentId) : null;
        if (!att || att.status === AttendanceStatus.UNMARKED) {
          targetStop = stop;
          break;
        }
      } else if (stop.stopType === RouteStopType.DROPOFF) {
        const att = stop.studentId ? attendanceMap.get(stop.studentId) : null;
        if (att && att.status === AttendanceStatus.PRESENT && !att.alightedAt) {
          targetStop = stop;
          break;
        }
      }
    }

    if (!targetStop || !targetStop.plannedArrivalTime) {
      return;
    }

    const serviceDateYmd = formatDateToVnYmd(new Date(trip.serviceDate));
    const scheduledStopArrivalAt = combineDateAndTimeUtc(
      serviceDateYmd,
      targetStop.plannedArrivalTime,
    );

    // Calculate planned speed (meters per second)
    const speed =
      snapshot.estimatedDurationSeconds > 0 && snapshot.totalDistanceMeters > 0
        ? snapshot.totalDistanceMeters / snapshot.estimatedDurationSeconds
        : 5.55; // default ~20 km/h

    // Calculate delay for each sample
    const sampleDelays = recentPoints.map((p) => {
      const { closestSegmentIndex } = this.pointToPolylineDistance(p.latitude, p.longitude, polyline);
      const remainingMeters = this.remainingDistanceAlongPolyline(
        polyline,
        closestSegmentIndex,
        targetStop!.latitude,
        targetStop!.longitude,
      );
      const travelSeconds = remainingMeters / Math.max(speed, 2.0);
      const estArrival = new Date(p.recordedAt.getTime() + travelSeconds * 1000);
      const delaySeconds = (estArrival.getTime() - scheduledStopArrivalAt.getTime()) / 1000;
      return { ...p, estArrival, delaySeconds };
    });

    // Check longest contiguous suffix where delay > 180s (3m) and gap <= 15s
    let streakStartIndex = sampleDelays.length - 1;
    if (sampleDelays[streakStartIndex].delaySeconds <= 180) {
      return;
    }

    for (let i = sampleDelays.length - 1; i > 0; i--) {
      const curr = sampleDelays[i];
      const prev = sampleDelays[i - 1];
      const gapMs = curr.recordedAt.getTime() - prev.recordedAt.getTime();
      if (prev.delaySeconds > 180 && gapMs <= 15000 && gapMs >= 0) {
        streakStartIndex = i - 1;
      } else {
        break;
      }
    }

    const streakSamples = sampleDelays.slice(streakStartIndex);
    const firstSample = streakSamples[0];
    const lastSample = streakSamples[streakSamples.length - 1];
    const durationMs = lastSample.recordedAt.getTime() - firstSample.recordedAt.getTime();

    if (streakSamples.length >= 2 && durationMs >= 15000) {
      const dedupeKey = `${trip.id}:${TripIncidentType.LATE_STOP}`;
      try {
        await this.prisma.$transaction(async tx => { await lockOperations(tx);
      const current = await tx.trip.findUnique({ where: { id: trip.id } });
      if (current?.status !== TripStatus.IN_PROGRESS || await tripBlockReason(tx, trip.id)) return;
      const created = await tx.tripIncident.create({
          data: {
            tripId: trip.id,
            type: TripIncidentType.LATE_STOP,
            status: TripIncidentStatus.WAITING_CONFIRMATION,
            dedupeKey,
            reportedById: null,
            context: {
              stopId: targetStop.id,
              stopOrder: targetStop.stopOrder,
              stopAddress: targetStop.addressText,
              plannedArrivalAt: scheduledStopArrivalAt.toISOString(),
              estimatedArrivalAt: lastSample.estArrival.toISOString(),
              delaySeconds: Math.round(lastSample.delaySeconds),
              thresholdSeconds: 180,
              durationSeconds: Math.round(durationMs / 1000),
              sampleCount: streakSamples.length,
              detectedAt: lastSample.recordedAt.toISOString(),
              latitude: lastSample.latitude,
              longitude: lastSample.longitude,
            },
          },
        }); await notifyIncident(tx, created.id); return created; });
        this.logger.warn(`TripIncident LATE_STOP created for trip ${trip.id}`);
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          // Already created concurrently
          return;
        }
        throw e;
      }
    }
  }
}
