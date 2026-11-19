import type { Instruction, LocationPoint, Position } from '../services/trip-navigation';

export type Coordinate = [number, number];
const R = 6371000, RAD = Math.PI / 180;
export const coordinate = (p: Position): Coordinate => [p.latitude, p.longitude];
export function distance(a: Coordinate, b: Coordinate) {
  return R * Math.hypot((b[0] - a[0]) * RAD, (b[1] - a[1]) * RAD * Math.cos((a[0] + b[0]) * RAD / 2));
}
export function cumulativeDistances(coords: Coordinate[]) {
  const result = [0];
  for (let i = 1; i < coords.length; i++) result.push(result[i - 1] + distance(coords[i - 1], coords[i]));
  return result;
}

/** Restrict projection to continuous progress; a nearby crossing must not skip a loop. */
export function projectProgress(coords: Coordinate[], cumulative: number[], position: Coordinate, previous = 0, maxForward = 150) {
  let bestDistance = Infinity, progress = previous;
  const cos = Math.cos(position[0] * RAD);
  for (let i = 1; i < coords.length; i++) {
    if (cumulative[i] < previous - 25 || cumulative[i - 1] > previous + maxForward) continue;
    const a = coords[i - 1], b = coords[i];
    const dx = (b[1] - a[1]) * cos, dy = b[0] - a[0];
    const px = (position[1] - a[1]) * cos, py = position[0] - a[0];
    const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy || 1)));
    const gap = Math.hypot(px - dx * t, py - dy * t) * RAD * R;
    const along = cumulative[i - 1] + t * (cumulative[i] - cumulative[i - 1]);
    if (gap < bestDistance && along >= previous - 25 && along <= previous + maxForward) { bestDistance = gap; progress = along; }
  }
  return { gap: bestDistance, progress: Math.max(previous, progress) };
}

/** Auto movement has no dependency on joystick movement. */
export function autoPosition(coords: Coordinate[], cumulative: number[], travelled: number): Coordinate {
  if (!coords.length) throw new Error('No valid navigation geometry');
  const end = cumulative.at(-1) ?? 0;
  const m = Math.max(0, Math.min(end, travelled));
  const i = cumulative.findIndex((v, index) => index > 0 && v >= m);
  if (i < 0) return coords[coords.length - 1];
  const t = (m - cumulative[i - 1]) / (cumulative[i] - cumulative[i - 1] || 1);
  return [coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * t,
    coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * t];
}

/** Manual virtual location; metres/second and bearing degrees. */
export function joystickPosition(position: Coordinate, bearing: number, speed: number, seconds: number): Coordinate {
  const metres = Math.max(0, speed) * Math.max(0, Math.min(seconds, 2));
  return [position[0] + Math.cos(bearing * RAD) * metres / R / RAD,
    position[1] + Math.sin(bearing * RAD) * metres / R / RAD / Math.max(0.01, Math.cos(position[0] * RAD))];
}

const signs: Record<number, string> = { '-8': 'Quay đầu', '-7': 'Đi chếch trái', '-3': 'Rẽ ngoặt trái', '-2': 'Rẽ trái', '-1': 'Rẽ nhẹ trái',
  0: 'Đi thẳng', 1: 'Rẽ nhẹ phải', 2: 'Rẽ phải', 3: 'Rẽ ngoặt phải', 4: 'Đến điểm dừng', 5: 'Đến điểm dừng', 6: 'Vào vòng xuyến', 7: 'Đi chếch phải', 8: 'Quay đầu' };
export function nextGuidance(instructions: Instruction[], cumulative: number[], progress: number) {
  // A sign belongs at the START of its interval, not at the current interval's end.
  const upcoming = instructions.find((i, index) => index > 0 && cumulative[i.interval[0]] >= progress - 3);
  const next = upcoming ?? instructions.at(-1);
  if (!next) return null;
  const providerText = next.text.trim();
  const text = (!providerText || providerText === next.streetName.trim()) ? signs[next.sign] : providerText;
  if (!text) return null; // Unknown provider sign must not become an invented turn.
  const continues = !upcoming && ![4, 5].includes(next.sign);
  return { text: continues && progress > cumulative[next.interval[0]] + 3 ? 'Tiếp tục đến điểm dừng' : text,
    streetName: next.streetName,
    metres: Math.max(0, Math.round((continues ? cumulative.at(-1) ?? 0 : cumulative[next.interval[0]]) - progress)) };
}

export function nextStopProgress(instructions: Instruction[], cumulative: number[], targetAtRouteEnd = false) {
  if (targetAtRouteEnd) return cumulative.length > 1 ? cumulative.at(-1) : undefined;
  const stop = instructions.find(i => i.sign === 5 || i.sign === 4);
  return stop ? cumulative[stop.interval[0]] : undefined;
}

export function orderedStopProgress(
  coords: Coordinate[],
  cumulative: number[],
  instructions: Instruction[],
  stops: (Position & { id: string })[],
) {
  const via = instructions.filter(instruction => instruction.sign === 5);
  const annotated = via.length === stops.length - 1;
  const marks = new Map<string, number>();
  let progress = 0;
  for (const [index, stop] of stops.entries()) {
    const metres = index === stops.length - 1
      ? cumulative.at(-1)
      : annotated ? cumulative[via[index].interval[0]] : undefined;
    progress = Math.max(progress, metres ?? projectProgress(coords, cumulative, coordinate(stop), progress, Infinity).progress);
    marks.set(stop.id, progress);
  }
  return marks;
}

export function nextStopEstimate(instructions: Instruction[], cumulative: number[], progress: number, secondsPerMetre: number, targetAtRouteEnd = false, targetProgress?: number) {
  const end = targetProgress ?? nextStopProgress(instructions, cumulative, targetAtRouteEnd);
  if (end === undefined || !Number.isFinite(end) || !Number.isFinite(progress)
      || !Number.isFinite(secondsPerMetre) || secondsPerMetre <= 0) return null;
  const metres = Math.max(0, end - Math.max(0, progress));
  return { metres, seconds: Math.round(metres * secondsPerMetre) };
}

export function recordedParts(points: LocationPoint[]) {
  const parts: Coordinate[][] = [];
  points.forEach((p, i) => {
    const prev = points[i - 1];
    const seconds = prev ? (Date.parse(p.recordedAt) - Date.parse(prev.recordedAt)) / 1000 : NaN;
    // A new run can be a mode switch. Preserve consecutive, plausible movement.
    const continuous = prev && p.sequence === prev.sequence + 1 && seconds >= 0 && seconds <= 15
      && distance(coordinate(prev), coordinate(p)) <= 15 + seconds * (120 / 3.6);
    if (!continuous) parts.push([]);
    parts[parts.length - 1].push(coordinate(p));
  });
  return parts;
}

export function appendTravelledPart(parts: Coordinate[][], traveled: Coordinate[]) {
  if (traveled.length < 2) return parts;
  const last = parts.at(-1);
  if (last && distance(last[last.length - 1], traveled[0]) <= 5)
    return [...parts.slice(0, -1), [...last, ...traveled]];
  return [...parts, traveled];
}

/**
 * Splits segment geometry at exact projected progress into traveled (gray) and remaining (blue).
 * The traveled slice ends and remaining slice begins at the identical interpolated coordinate.
 */
export function splitSegment(
  coords: Coordinate[],
  cumulative: number[],
  progress: number
): { traveled: Coordinate[]; remaining: Coordinate[] } {
  if (!coords || coords.length === 0) return { traveled: [], remaining: [] };
  if (coords.length === 1 || !cumulative || cumulative.length < 2) return { traveled: [], remaining: coords };
  const total = cumulative.at(-1) ?? 0;
  const p = Math.max(0, Math.min(total, progress));
  if (p <= 0) return { traveled: [], remaining: coords };
  if (p >= total) return { traveled: coords, remaining: [] };

  const i = cumulative.findIndex((d, idx) => idx > 0 && d >= p);
  if (i <= 0) return { traveled: [], remaining: coords };

  const dPrev = cumulative[i - 1];
  const dNext = cumulative[i];
  const segLen = dNext - dPrev;
  const t = segLen > 0 ? (p - dPrev) / segLen : 0;
  const cPrev = coords[i - 1];
  const cNext = coords[i];
  const split: Coordinate = [
    cPrev[0] + (cNext[0] - cPrev[0]) * t,
    cPrev[1] + (cNext[1] - cPrev[1]) * t,
  ];

  return {
    traveled: [...coords.slice(0, i), split],
    remaining: [split, ...coords.slice(i)],
  };
}

