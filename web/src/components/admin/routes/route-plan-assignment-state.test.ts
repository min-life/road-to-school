import assert from 'node:assert/strict';
import test from 'node:test';
import type { RouteItem } from '@/lib/types';
import { getAssignmentProgress, resolveSavedRoutePlanTab } from './route-plan-assignment-state.ts';

const route = (overrides: Partial<RouteItem> = {}): RouteItem => ({
  id: 'route-1', routePlanId: 'plan-1', schoolId: 'school-1', name: 'Tuyến đi 01',
  direction: 'TO_SCHOOL', status: 'DRAFT', proposedVehicleId: 'vehicle-1',
  defaultDriverId: 'driver-1', defaultBusAttendantId: 'attendant-1', totalDistanceMeters: 1,
  estimatedDurationSeconds: 1, polylineGeometry: '', studentCount: 1, ...overrides,
});

test('counts one vehicle group once when both directions are missing the same driver', () => {
  const progress = getAssignmentProgress([
    route({ id: 'outbound', defaultDriverId: null }),
    route({ id: 'return', direction: 'TO_PARKING', defaultDriverId: null }),
  ], 'DRAFT');
  assert.equal(progress.actionableSystemPendingGroupCount, 1);
  assert.equal(progress.schoolPendingGroupCount, 0);
});

test('separates school-owned attendant work from system-admin work', () => {
  const progress = getAssignmentProgress([route({ defaultBusAttendantId: null })], 'DRAFT');
  assert.equal(progress.actionableSystemPendingGroupCount, 0);
  assert.equal(progress.schoolPendingGroupCount, 1);
});

test('closed plans never auto-open an action tab', () => {
  const progress = getAssignmentProgress([route({ defaultDriverId: null })], 'CANCELLED');
  assert.equal(progress.systemPendingGroupCount, 1);
  assert.equal(progress.actionableSystemPendingGroupCount, 0);
  assert.equal(resolveSavedRoutePlanTab(null, progress.actionableSystemPendingGroupCount), 'routes');
});

test('an explicit user tab always wins over the automatic default', () => {
  assert.equal(resolveSavedRoutePlanTab('routes', 2), 'routes');
  assert.equal(resolveSavedRoutePlanTab('assignments', 0), 'assignments');
  assert.equal(resolveSavedRoutePlanTab(null, 1), 'assignments');
});
