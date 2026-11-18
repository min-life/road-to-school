import { randomUUID } from 'node:crypto';

/** Only the named records owned by this local demo dataset. */
export const DEMO_KEYS = {
  schools: ['school'],
  users: ['system', 'school', 'driver1', 'driver2', 'attendant1', 'attendant2', 'parent1', 'parent2', 'parent3', 'parent4', 'parent5'].map(key => `user-${key}`),
  students: Array.from({ length: 10 }, (_, n) => `student-${n + 1}`),
  parent_student_links: Array.from({ length: 10 }, (_, n) => `parent-link-${n}`),
  vehicles: ['vehicle-1', 'vehicle-2'],
  route_plans: ['plan'],
  routes: ['route-to-school', 'route-to-parking'],
  route_stops: [0, 1].flatMap(n => Array.from({ length: 12 }, (_, order) => `stop-${n}-${order}`)),
  trips: ['trip-to-school', 'trip-to-parking'],
};

export const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createDemoIds(): Record<string, string> {
  return Object.fromEntries(Object.values(DEMO_KEYS).flat().map(key => [key, randomUUID()]));
}

export function validateDemoIds(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') throw new Error('Demo IDs missing. Run repair-demo-ids.ts for the legacy dataset.');
  const ids = value as Record<string, string>;
  const keys = Object.values(DEMO_KEYS).flat();
  if (keys.some(key => typeof ids[key] !== 'string' || !UUID_V4.test(ids[key]!)) || new Set(keys.map(key => ids[key])).size !== keys.length) {
    throw new Error('Demo IDs incomplete, duplicated or not UUID v4. Do not reseed.');
  }
  return ids;
}
