import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { decodePolyline, encodePolyline } from './utils/polyline.util.js';

export interface VRPJobInput {
  id: string | number;
  location: [number, number]; // [longitude, latitude]
  serviceSeconds?: number;
  pickupAmount?: number;
  deliveryAmount?: number;
  timeWindowSeconds?: [number, number];
}

export interface VRPVehicleInput {
  id: string | number;
  start: [number, number]; // [longitude, latitude]
  end: [number, number]; // [longitude, latitude]
  capacity: number;
  timeWindowSeconds?: [number, number];
}

export interface VRPStepResult {
  type: 'start' | 'job' | 'end';
  id?: string | number;
  location: [number, number]; // [longitude, latitude]
  arrivalSeconds: number; // Cumulative arrival seconds from route start
  durationSeconds: number; // Leg driving duration from previous step
  distanceMeters: number;
  serviceSeconds?: number;
}

export interface VRPRouteResult {
  vehicleId: string | number;
  distanceMeters: number;
  durationSeconds: number;
  geometry: string; // encoded polyline
  steps: VRPStepResult[];
}

export interface VRPSolutionResult {
  routes: VRPRouteResult[];
  unassignedJobIds: (string | number)[];
}

@Injectable()
export class VietMapVRPService {
  private readonly logger = new Logger(VietMapVRPService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.vietmap.vn/api';

  constructor(private readonly configService: ConfigService) {
    this.apiKey =
      this.configService.get<string>('VIETMAP_SERVICES_KEY') ||
      process.env.VIETMAP_SERVICES_KEY ||
      '';
    if (!this.apiKey) {
      this.logger.warn('VIETMAP_SERVICES_KEY is not configured. Real VietMap routing calls may be skipped.');
    }
  }

  /**
   * Solve Multi-Vehicle Routing Problem (VRP) using VietMap VRP v1.1
   * Uses bi-directional integer ID mapping (UUID <-> Integer 1..N) to comply with VietMap requirements.
   */
  async solveVRP(
    jobs: VRPJobInput[],
    vehicles: VRPVehicleInput[],
    timeoutMs = 30000,
  ): Promise<VRPSolutionResult> {
    if (!this.apiKey) {
      return this.fallbackInternalVRP(jobs, vehicles);
    }

    // 1. Bi-directional Integer ID Mapping (UUID <-> 1..N)
    const vehicleIdToNumber = new Map<string, number>();
    const numberToVehicleId = new Map<number, string>();
    vehicles.forEach((v, idx) => {
      const numId = idx + 1;
      vehicleIdToNumber.set(String(v.id), numId);
      numberToVehicleId.set(numId, String(v.id));
    });

    const jobIdToNumber = new Map<string, number>();
    const numberToJobId = new Map<number, string>();
    jobs.forEach((j, idx) => {
      const numId = idx + 1;
      jobIdToNumber.set(String(j.id), numId);
      numberToJobId.set(numId, String(j.id));
    });

    // 2. Build payload with integer IDs
    const payload = {
      jobs: jobs.map((j) => ({
        id: jobIdToNumber.get(String(j.id))!,
        location: [j.location[0], j.location[1]], // [lng, lat]
        service: j.serviceSeconds ?? 60,
        ...(j.pickupAmount !== undefined ? { pickup: [j.pickupAmount] } : {}),
        ...(j.deliveryAmount !== undefined ? { delivery: [j.deliveryAmount] } : {}),
        ...(j.timeWindowSeconds ? { time_windows: [j.timeWindowSeconds] } : {}),
      })),
      vehicles: vehicles.map((v) => ({
        id: vehicleIdToNumber.get(String(v.id))!,
        start: [v.start[0], v.start[1]], // [lng, lat]
        end: [v.end[0], v.end[1]], // [lng, lat]
        capacity: [v.capacity],
        ...(v.timeWindowSeconds ? { time_window: v.timeWindowSeconds } : {}),
      })),
    };

    const url = `${this.baseUrl}/vrp?api-version=1.1&apikey=${this.apiKey}`;
    this.logger.log(`Calling VietMap VRP v1.1: ${jobs.length} jobs, ${vehicles.length} vehicles`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`VietMap VRP API error (HTTP ${response.status}): ${errorText}`);
        throw new BadRequestException(`VietMap VRP lỗi kết nối (HTTP ${response.status}): ${errorText}`);
      }

      const data = await response.json();
      if (data.code && data.code !== 0) {
        this.logger.error(`VietMap VRP API error code ${data.code}: ${data.error || JSON.stringify(data)}`);
        throw new BadRequestException(
          `VietMap VRP không thể giải bài toán (Mã ${data.code}): ${data.error || 'Dữ liệu không khả thi'}`,
        );
      }

      return await this.normalizeVRPResponse(data, jobs, vehicles, numberToJobId, numberToVehicleId);
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`VietMap VRP network/timeout error: ${err?.message || err}`);
      throw new BadRequestException(`Không thể kết nối dịch vụ VietMap VRP: ${err?.message || 'Lỗi mạng hoặc hết thời gian chờ'}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Recalculate a single route after removing students using VietMap Route v4
   */
  async solveTSP(
    points: { latitude: number; longitude: number }[],
    timeoutMs = 15000,
  ): Promise<{ geometry: string; distanceMeters: number; durationSeconds: number } | null> {
    if (points.length < 2) return null;

    if (!this.apiKey) {
      return this.fallbackInternalTSP(points);
    }

    // Use Route v4 directly to get accurate road geometry and distance/duration
    const routeV4 = await this.solveRouteV4(points, timeoutMs);
    if (routeV4) {
      return routeV4;
    }

    return this.fallbackInternalTSP(points);
  }

  /**
   * Tính toán đường đi thực tế cho danh sách các điểm dừng bằng VietMap Route v4.
   * Trả về chi tiết các chặng (legs) kèm khoảng cách và thời gian di chuyển.
   * Phân biệt rõ kết quả FEASIBLE và UNAVAILABLE (lỗi mạng/timeout/provider error/thiếu API key).
   */
  async calculateRoute(
    points: { latitude: number; longitude: number }[],
    timeoutMs = 12000,
  ): Promise<{
    status: 'FEASIBLE' | 'UNAVAILABLE';
    reason?: string;
    geometry: string;
    distanceMeters: number;
    durationSeconds: number;
    legs: { distanceMeters: number; durationSeconds: number }[];
  }> {
    if (points.length < 2) {
      return {
        status: 'UNAVAILABLE',
        reason: 'Danh sách điểm dừng không hợp lệ (ít hơn 2 điểm)',
        geometry: '',
        distanceMeters: 0,
        durationSeconds: 0,
        legs: [],
      };
    }

    if (!this.apiKey) {
      return {
        status: 'UNAVAILABLE',
        reason: 'Chưa cấu hình API Key dịch vụ bản đồ (VIETMAP_API_KEY)',
        geometry: '',
        distanceMeters: 0,
        durationSeconds: 0,
        legs: [],
      };
    }

    const pointParams = points.map((p) => `point=${p.latitude},${p.longitude}`).join('&');
    const url = `${this.baseUrl}/route/v4?apikey=${this.apiKey}&${pointParams}&vehicle=car&points_encoded=true&instructions=true`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (res.ok) {
        const data = await res.json();
        const path = data.paths?.[0];
        if (path && path.points) {
          const totalDistanceMeters = Math.round(path.distance || 0);
          const totalDurationSeconds = Math.round((path.time || 0) / 1000);

          // Trích xuất timing và khoảng cách cho từng chặng
          const legs: { distanceMeters: number; durationSeconds: number }[] = [];
          if (Array.isArray(path.instructions) && path.instructions.length > 0) {
            let currentLegDist = 0;
            let currentLegTimeMs = 0;
            for (const inst of path.instructions) {
              currentLegDist += inst.distance || 0;
              currentLegTimeMs += inst.time || 0;
              // GraphHopper via point instruction sign is 5; finish destination is 4
              if (inst.sign === 5 || inst.sign === 4) {
                legs.push({
                  distanceMeters: Math.round(currentLegDist),
                  durationSeconds: Math.round(currentLegTimeMs / 1000),
                });
                currentLegDist = 0;
                currentLegTimeMs = 0;
              }
            }
          }

          // Nếu instructions không khớp đủ số chặng (N - 1), phân bổ tỉ lệ theo khoảng cách giữa các điểm
          if (legs.length !== points.length - 1) {
            legs.length = 0;
            const segmentDists: number[] = [];
            let totalSegDist = 0;
            for (let i = 0; i < points.length - 1; i++) {
              const d = this.haversineDistance(
                [points[i].longitude, points[i].latitude],
                [points[i + 1].longitude, points[i + 1].latitude],
              );
              segmentDists.push(d);
              totalSegDist += d;
            }
            let accDur = 0;
            for (let i = 0; i < points.length - 1; i++) {
              const isLast = i === points.length - 2;
              const legDur = isLast
                ? Math.max(0, totalDurationSeconds - accDur)
                : (totalSegDist > 0 ? Math.round((segmentDists[i] / totalSegDist) * totalDurationSeconds) : 0);
              accDur += legDur;
              legs.push({
                distanceMeters: Math.round(segmentDists[i]),
                durationSeconds: legDur,
              });
            }
          }

          return {
            status: 'FEASIBLE',
            geometry: path.points,
            distanceMeters: totalDistanceMeters,
            durationSeconds: totalDurationSeconds,
            legs,
          };
        }
        return {
          status: 'UNAVAILABLE',
          reason: 'Dịch vụ VietMap không trả về dữ liệu hành trình hợp lệ',
          geometry: '',
          distanceMeters: 0,
          durationSeconds: 0,
          legs: [],
        };
      } else {
        const errText = await res.text().catch(() => '');
        this.logger.warn(`VietMap Route v4 HTTP error ${res.status}: ${errText}`);
        return {
          status: 'UNAVAILABLE',
          reason: `Dịch vụ bản đồ VietMap tạm thời không khả dụng (Mã HTTP ${res.status})`,
          geometry: '',
          distanceMeters: 0,
          durationSeconds: 0,
          legs: [],
        };
      }
    } catch (err: any) {
      this.logger.warn(`VietMap Route v4 network/timeout error: ${err?.message || err}`);
      return {
        status: 'UNAVAILABLE',
        reason: 'Không thể kết nối tới dịch vụ VietMap hoặc quá thời gian chờ (Timeout)',
        geometry: '',
        distanceMeters: 0,
        durationSeconds: 0,
        legs: [],
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Route v4 for real road polyline geometry and distance/duration
   */
  async solveRouteV4(
    points: { latitude: number; longitude: number }[],
    timeoutMs = 10000,
  ): Promise<{ geometry: string; distanceMeters: number; durationSeconds: number } | null> {
    if (points.length < 2 || !this.apiKey) return null;

    const pointParams = points.map((p) => `point=${p.latitude},${p.longitude}`).join('&');
    const url = `${this.baseUrl}/route/v4?apikey=${this.apiKey}&${pointParams}&vehicle=car&points_encoded=true`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (res.ok) {
        const data = await res.json();
        const path = data.paths?.[0];
        if (path) {
          return {
            geometry: path.points || '',
            distanceMeters: Math.round(path.distance || 0),
            durationSeconds: Math.round((path.time || 0) / 1000),
          };
        }
      }
    } catch (err: any) {
      this.logger.warn(`VietMap Route v4 call failed: ${err?.message || err}`);
    } finally {
      clearTimeout(timeout);
    }

    return null;
  }

  /**
   * Normalizes official VietMap VRP response into standard domain format
   * Maps integer IDs back to original UUIDs and ensures real road geometry.
   */
  private async normalizeVRPResponse(
    data: any,
    originalJobs: VRPJobInput[],
    originalVehicles: VRPVehicleInput[],
    numberToJobId: Map<number, string>,
    numberToVehicleId: Map<number, string>,
  ): Promise<VRPSolutionResult> {
    const routes: VRPRouteResult[] = [];
    const unassignedJobIds: (string | number)[] = [];

    if (Array.isArray(data.unassigned)) {
      for (const u of data.unassigned) {
        if (u.id !== undefined) {
          const originalId = numberToJobId.get(Number(u.id)) || u.id;
          unassignedJobIds.push(originalId);
        }
      }
    }

    if (Array.isArray(data.routes)) {
      for (const r of data.routes) {
        const steps: VRPStepResult[] = [];
        if (Array.isArray(r.steps)) {
          for (const s of r.steps) {
            const mappedJobId =
              s.id !== undefined
                ? numberToJobId.get(Number(s.id)) || s.id
                : s.job !== undefined
                  ? numberToJobId.get(Number(s.job)) || s.job
                  : undefined;

            steps.push({
              type: s.type || (mappedJobId !== undefined ? 'job' : 'start'),
              id: mappedJobId,
              location: s.location || [0, 0],
              arrivalSeconds: s.arrival !== undefined ? Number(s.arrival) : 0,
              durationSeconds: s.duration !== undefined ? Number(s.duration) : 0,
              distanceMeters: s.distance !== undefined ? Number(s.distance) : 0,
              serviceSeconds: s.service !== undefined ? Number(s.service) : 0,
            });
          }
        }

        let geometry = r.geometry || '';
        // If VietMap VRP didn't supply road polyline geometry, query Route v4 for real road polyline
        if (!geometry && steps.length >= 2) {
          const routePoints = steps.map((s) => ({ latitude: s.location[1], longitude: s.location[0] }));
          const routeV4 = await this.solveRouteV4(routePoints);
          if (routeV4?.geometry) {
            geometry = routeV4.geometry;
          }
        }

        const mappedVehicleId = numberToVehicleId.get(Number(r.vehicle)) || r.vehicle;
        routes.push({
          vehicleId: mappedVehicleId,
          distanceMeters: Math.round(r.distance || 0),
          durationSeconds: Math.round(r.duration || 0),
          geometry,
          steps,
        });
      }
    }

    // Check if any jobs were completely omitted from routes and unassigned
    const assignedIds = new Set<string | number>();
    for (const r of routes) {
      for (const s of r.steps) {
        if (s.id !== undefined) assignedIds.add(s.id);
      }
    }
    for (const j of originalJobs) {
      if (!assignedIds.has(j.id) && !unassignedJobIds.includes(j.id)) {
        unassignedJobIds.push(j.id);
      }
    }

    return { routes, unassignedJobIds };
  }

  /**
   * Deterministic greedy cluster-first route-second solver for offline/test environments
   */
  private fallbackInternalVRP(
    jobs: VRPJobInput[],
    vehicles: VRPVehicleInput[],
  ): VRPSolutionResult {
    const routes: VRPRouteResult[] = [];
    const unassignedJobIds: (string | number)[] = [];

    // Sort vehicles by capacity descending
    const sortedVehicles = [...vehicles].sort((a, b) => b.capacity - a.capacity);
    const remainingJobs = [...jobs];

    for (const vehicle of sortedVehicles) {
      if (remainingJobs.length === 0) break;

      const vehicleJobs: VRPJobInput[] = [];
      let capacityUsed = 0;
      const maxSeconds = vehicle.timeWindowSeconds ? vehicle.timeWindowSeconds[1] : Infinity;

      let estElapsed = 0;
      let estPrevLoc = vehicle.start;

      while (remainingJobs.length > 0 && capacityUsed < vehicle.capacity) {
        const nextJob = remainingJobs[0];
        const dist = this.haversineDistance(estPrevLoc, nextJob.location);
        const driveSec = Math.round((dist / 30000) * 3600);
        const serviceSec = nextJob.serviceSeconds || 60;
        const endDist = this.haversineDistance(nextJob.location, vehicle.end);
        const endDriveSec = Math.round((endDist / 30000) * 3600);

        if (estElapsed + driveSec + serviceSec + endDriveSec > maxSeconds && vehicleJobs.length > 0) {
          break;
        }

        const job = remainingJobs.shift()!;
        vehicleJobs.push(job);
        capacityUsed += (job.pickupAmount || job.deliveryAmount || 1);
        estElapsed += driveSec + serviceSec;
        estPrevLoc = job.location;
      }

      if (vehicleJobs.length === 0) continue;

      // Build sequential steps: Start -> Jobs -> End
      const steps: VRPStepResult[] = [];
      let currentElapsed = 0; // Elapsed seconds from start of route
      let totalDist = 0;

      // Start step
      steps.push({
        type: 'start',
        location: vehicle.start,
        arrivalSeconds: 0,
        durationSeconds: 0,
        distanceMeters: 0,
        serviceSeconds: 0,
      });

      let prevLoc = vehicle.start;
      for (const j of vehicleJobs) {
        const dist = this.haversineDistance(prevLoc, j.location);
        const driveSec = Math.round((dist / 30000) * 3600); // 30 km/h average
        currentElapsed += driveSec;
        totalDist += dist;

        steps.push({
          type: 'job',
          id: j.id,
          location: j.location,
          arrivalSeconds: currentElapsed,
          durationSeconds: driveSec,
          distanceMeters: Math.round(dist),
          serviceSeconds: j.serviceSeconds || 60,
        });

        currentElapsed += (j.serviceSeconds || 60);
        prevLoc = j.location;
      }

      // End step
      const endDist = this.haversineDistance(prevLoc, vehicle.end);
      const endDriveSec = Math.round((endDist / 30000) * 3600);
      currentElapsed += endDriveSec;
      totalDist += endDist;

      steps.push({
        type: 'end',
        location: vehicle.end,
        arrivalSeconds: currentElapsed,
        durationSeconds: endDriveSec,
        distanceMeters: Math.round(endDist),
        serviceSeconds: 0,
      });

      const routePoints: [number, number][] = steps.map((s) => [s.location[1], s.location[0]]);
      const geometry = encodePolyline(routePoints);

      routes.push({
        vehicleId: vehicle.id,
        distanceMeters: Math.round(totalDist),
        durationSeconds: currentElapsed,
        geometry,
        steps,
      });
    }

    for (const j of remainingJobs) {
      unassignedJobIds.push(j.id);
    }

    return { routes, unassignedJobIds };
  }

  private fallbackInternalTSP(
    points: { latitude: number; longitude: number }[],
  ): { geometry: string; distanceMeters: number; durationSeconds: number } {
    let totalDist = 0;
    for (let i = 0; i < points.length - 1; i++) {
      totalDist += this.haversineDistance(
        [points[i].longitude, points[i].latitude],
        [points[i + 1].longitude, points[i + 1].latitude],
      );
    }
    const durationSeconds = Math.round((totalDist / 30000) * 3600);
    const geometry = encodePolyline(points.map((p) => [p.latitude, p.longitude]));
    return {
      geometry,
      distanceMeters: Math.round(totalDist),
      durationSeconds,
    };
  }

  private haversineDistance(c1: [number, number], c2: [number, number]): number {
    const R = 6371000; // meters
    const dLat = (c2[1] - c1[1]) * (Math.PI / 180);
    const dLon = (c2[0] - c1[0]) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(c1[1] * (Math.PI / 180)) *
        Math.cos(c2[1] * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
