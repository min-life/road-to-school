import type { StudentDisableImpactResponse } from './types';

export function validCoordinates(lat: number | null, lng: number | null) {
  return lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}
export function normalizeGuardianPhone(value: string) { return value.trim().replace(/[\s().-]/g, ''); }
export function validGuardianPhone(value: string) { return /^(0|\+84)[0-9]{9,10}$/.test(normalizeGuardianPhone(value)); }
export function canDirectlyUpdateAddress(impact: Pick<StudentDisableImpactResponse, 'activeRoutePlansCount' | 'draftRoutePlansCount'>) {
  return impact.activeRoutePlansCount === 0 && impact.draftRoutePlansCount === 0;
}
