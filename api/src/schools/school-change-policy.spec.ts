import { describe, expect, it } from 'vitest';
import { schoolCoordinatesChanged, schoolScheduleNeedsReoptimization } from './school-policy.js';

describe('school changes and route reoptimization', () => {
  it('ignores coordinate noise within the precision of the saved school pin', () => {
    const location = { latitude: 10, longitude: 106 };
    expect(schoolCoordinatesChanged(location, 10.0000005, 106)).toBe(false);
    expect(schoolCoordinatesChanged(location, 10.0001, 106)).toBe(true);
  });

  it('keeps a route when changing the school hours leaves the whole ride within the day', () => {
    const schedule = { monday: { start: '07:30', end: '16:15' } };
    const routes = [
      { direction: 'TO_SCHOOL', estimatedDurationSeconds: 3600 },
      { direction: 'TO_PARKING', estimatedDurationSeconds: 3600 },
    ] as const;
    expect(schoolScheduleNeedsReoptimization(schedule, routes)).toBe(false);
  });

  it('requires reoptimization when either direction would cross the service-day boundary', () => {
    const outbound = [{ direction: 'TO_SCHOOL', estimatedDurationSeconds: 3600 }] as const;
    const inbound = [{ direction: 'TO_PARKING', estimatedDurationSeconds: 3600 }] as const;
    expect(schoolScheduleNeedsReoptimization({ monday: { start: '00:45', end: '16:15' } }, outbound)).toBe(true);
    expect(schoolScheduleNeedsReoptimization({ monday: { start: '07:30', end: '23:15' } }, inbound)).toBe(true);
  });
});
