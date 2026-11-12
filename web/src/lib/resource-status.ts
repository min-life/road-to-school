export type ResourceTarget = { id: string; name: string; isActive: boolean } & (
  { kind: 'vehicle' } | { kind: 'driver' } | { kind: 'employee'; schoolId: string; role: 'SCHOOL_ADMIN' | 'BUS_ATTENDANT' }
);

export interface ResourceImpact {
  isActive: boolean;
  proposedRoutesCount?: number;
  defaultRoutesCount?: number;
  scheduledTripsCount: number;
  inProgressTripsCount: number;
  canDeactivateDirectly: boolean;
  hasBlockingInProgress: boolean;
  affectedRoutes: { id: string; name: string; schoolName: string }[];
  affectedTrips: { id: string; routeName: string; date: string; schoolName: string }[];
}

export function resourcePath(target: ResourceTarget) {
  return target.kind === 'employee' ? `/schools/${target.schoolId}/employees/${target.id}`
    : `/${target.kind === 'vehicle' ? 'vehicles' : 'drivers'}/${target.id}`;
}
