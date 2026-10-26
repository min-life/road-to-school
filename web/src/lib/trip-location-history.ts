export interface VehiclePosition { latitude: number; longitude: number }
export interface RecordedPoint extends VehiclePosition { sequence: number; recordedAt: string; runId: string }

/** Keep each recorded run/gap separate; single points remain points rather than invented lines. */
export function splitRecordedHistory(points: RecordedPoint[]) {
  const parts: VehiclePosition[][] = [];
  points.forEach((point, index) => {
    const previous = points[index - 1];
    if (!previous || point.runId !== previous.runId || point.sequence !== previous.sequence + 1 ||
      Date.parse(point.recordedAt) - Date.parse(previous.recordedAt) > 15000) parts.push([]);
    parts[parts.length - 1].push({ latitude: point.latitude, longitude: point.longitude });
  });
  return parts;
}
