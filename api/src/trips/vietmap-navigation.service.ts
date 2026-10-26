import { BadGatewayException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { decodePolyline, encodePolyline } from '../routes/utils/polyline.util.js';
import type { NavigationInstructionDto } from './dto/trip-navigation.dto.js';
import { metresBetween } from './utils/navigation-state.js';

/** Dedicated directions path: never calls VRP/TSP or returns a straight-line fallback. */
@Injectable()
export class VietMapNavigationService {
  private readonly logger = new Logger(VietMapNavigationService.name);
  constructor(private readonly config: ConfigService) {}

  async route(
    origin: { latitude: number; longitude: number },
    target: { latitude: number; longitude: number },
    waypoints: { latitude: number; longitude: number }[] = [],
  ) {
    const key = this.config.get<string>('VIETMAP_SERVICES_KEY');
    if (!key) throw new ServiceUnavailableException('Chưa cấu hình dịch vụ chỉ dẫn');
    const url = new URL('https://maps.vietmap.vn/api/route/v4');
    url.searchParams.set('apikey', key);
    url.searchParams.append('point', `${origin.latitude},${origin.longitude}`);
    url.searchParams.append('point', `${target.latitude},${target.longitude}`);
    for (const wp of waypoints) {
      url.searchParams.append('point', `${wp.latitude},${wp.longitude}`);
    }
    url.searchParams.set('vehicle', 'car');
    url.searchParams.set('points_encoded', 'true');
    url.searchParams.set('instructions', 'true');
    const start = Date.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const durationMs = Date.now() - start;
      if (res.status === 429 || res.status >= 500) {
        this.logger.warn(`[route] Upstream status=${res.status} durationMs=${durationMs}`);
        throw new ServiceUnavailableException('Chưa thể cập nhật chỉ dẫn');
      }
      if (!res.ok) {
        this.logger.warn(`[route] Upstream error status=${res.status} durationMs=${durationMs}`);
        throw new BadGatewayException('ROUTING_UNAVAILABLE');
      }
      const data = await res.json();
      const route = validateDirections(data);
      const coords = decodePolyline(route.geometry);
      const first = { latitude: coords[0][0], longitude: coords[0][1] };
      const last = { latitude: coords[coords.length - 1][0], longitude: coords[coords.length - 1][1] };
      const finalDest = waypoints.length > 0 ? waypoints[waypoints.length - 1] : target;
      const dFirst = metresBetween(first, origin);
      const dLast = metresBetween(last, finalDest);
      if (dFirst > 100 || dLast > 100) {
        this.logger.warn(`[route] Snap threshold exceeded dFirst=${dFirst.toFixed(1)}m dLast=${dLast.toFixed(1)}m`);
      }
      this.logger.debug(`[route] Success coords=${coords.length} instructions=${route.instructions.length} distance=${route.distanceMeters}m durationMs=${durationMs}`);
      return route;
    } catch (error) {
      if (error instanceof BadGatewayException || error instanceof ServiceUnavailableException) throw error;
      this.logger.warn(`[route] Failed exception=${(error as Error)?.message || error}`);
      // Never include the request URL (API key) in logs/errors.
      throw new ServiceUnavailableException('Chưa thể cập nhật chỉ dẫn');
    }
  }
}

export function validateDirections(data: any) {
  const path = data?.paths?.[0];
  if ((data?.code !== undefined && !['OK', 0].includes(data.code)) || !path || typeof path.points !== 'string' || !path.points || path.points.length > 1000000 ||
      !Number.isFinite(path.distance) || path.distance < 0 || !Number.isFinite(path.time) || path.time < 0) {
    throw new BadGatewayException('ROUTING_UNAVAILABLE');
  }
  const coords = decodePolyline(path.points);
  if (encodePolyline(coords) !== path.points || coords.length < 2 || coords.some(([lat, lng]) => !Number.isFinite(lat) || !Number.isFinite(lng) ||
      Math.abs(lat) > 90 || Math.abs(lng) > 180)) {
    throw new BadGatewayException('ROUTING_UNAVAILABLE');
  }

  const rawInstructions = Array.isArray(path.instructions) ? path.instructions : [];
  let previousEnd = 0;
  const instructions: NavigationInstructionDto[] = [];
  for (const i of rawInstructions) {
    if (!Array.isArray(i.interval) || i.interval.length !== 2 ||
        !i.interval.every(Number.isInteger) || i.interval[0] < 0 ||
        i.interval[1] < i.interval[0] || i.interval[1] >= coords.length ||
        !Number.isFinite(i.distance) || i.distance < 0 || !Number.isInteger(i.sign)) {
      throw new BadGatewayException('ROUTING_UNAVAILABLE');
    }
    if (i.interval[0] < previousEnd) {
      throw new BadGatewayException('ROUTING_UNAVAILABLE');
    }
    previousEnd = i.interval[1];
    instructions.push({
      interval: i.interval,
      text: typeof i.text === 'string' ? i.text : '',
      streetName: typeof i.street_name === 'string' ? i.street_name : '',
      sign: i.sign,
      distance: i.distance,
    });
  }

  return {
    geometry: path.points as string,
    instructions,
    distanceMeters: path.distance as number,
    durationSeconds: path.time / 1000,
  };
}
