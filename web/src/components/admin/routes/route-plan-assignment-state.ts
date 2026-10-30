import type { RouteItem, RoutePlanStatus } from '@/lib/types';

export type SavedRoutePlanTab = 'routes' | 'assignments';

export function getAssignmentProgress(routes: RouteItem[], status?: RoutePlanStatus) {
  const groups = new Map<string, { missingVehicle: boolean; missingDriver: boolean; missingAttendant: boolean }>();

  routes.forEach(item => {
    const key = item.proposedVehicleId || '__unassigned__';
    const group = groups.get(key) ?? { missingVehicle: false, missingDriver: false, missingAttendant: false };
    group.missingVehicle ||= !item.proposedVehicleId;
    group.missingDriver ||= !item.defaultDriverId;
    group.missingAttendant ||= !item.defaultBusAttendantId;
    groups.set(key, group);
  });

  const systemPendingGroupCount = [...groups.values()].filter(group => group.missingVehicle || group.missingDriver).length;
  const schoolPendingGroupCount = [...groups.values()].filter(group => group.missingAttendant).length;
  const editable = status === 'DRAFT' || status === 'ACTIVE';

  return {
    editable,
    systemPendingGroupCount,
    actionableSystemPendingGroupCount: editable ? systemPendingGroupCount : 0,
    schoolPendingGroupCount,
  };
}

export function resolveSavedRoutePlanTab(requestedTab: string | null, actionableSystemPendingGroupCount: number): SavedRoutePlanTab {
  if (requestedTab === 'routes' || requestedTab === 'assignments') return requestedTab;
  return actionableSystemPendingGroupCount > 0 ? 'assignments' : 'routes';
}
