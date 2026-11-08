import assert from 'node:assert/strict';
import test from 'node:test';
import { createRoutePlanDraftStore } from './route-plan-draft-store.ts';

test('new drafts keep the previous form defaults and independent mutable collections', () => {
  const first = createRoutePlanDraftStore().getState();
  const second = createRoutePlanDraftStore().getState();
  assert.equal(first.maxRouteDurationMinutes, 60);
  assert.equal(first.defaultStopServiceSeconds, 60);
  assert.equal(first.studentPickerTab, 'ELIGIBLE');
  assert.equal(first.vehiclePickerTab, 'AVAILABLE');
  assert.equal(first.activePreviewTab, 'OUTBOUND');
  assert.equal(first.activeRouteIndex, 0);
  assert.equal(first.focusPoint, null);
  assert.equal(first.showOverridesAccordion, false);
  assert.equal(first.studentSearch, '');
  assert.equal(first.vehicleSearch, '');
  assert.equal(first.selectedStudentIds.size, 0);
  assert.equal(first.selectedVehicleIds.size, 0);
  assert.notEqual(first.selectedStudentIds, second.selectedStudentIds);
  assert.notEqual(first.selectedVehicleIds, second.selectedVehicleIds);
  assert.notEqual(first.stopServiceOverrides, second.stopServiceOverrides);
});

test('functional Set updates compose against the latest state without mutating prior snapshots', () => {
  const store = createRoutePlanDraftStore();
  const initial = store.getState().selectedStudentIds;
  const update = store.getState().setSelectedStudentIds;
  update(previous => new Set(previous).add('selection-a'));
  const first = store.getState().selectedStudentIds;
  update(previous => new Set(previous).add('selection-b'));
  assert.deepEqual([...store.getState().selectedStudentIds], ['selection-a', 'selection-b']);
  assert.equal(initial.size, 0);
  assert.deepEqual([...first], ['selection-a']);
  assert.equal(store.getState().selectedVehicleIds.size, 0);
});

test('direct, functional and optional updates preserve setter semantics', () => {
  const store = createRoutePlanDraftStore();
  const actions = store.getState();
  actions.setShowOverridesAccordion(previous => !previous);
  actions.setShowOverridesAccordion(previous => !previous);
  actions.setMaxRouteDurationMinutes(undefined);
  actions.setDefaultStopServiceSeconds(90);
  actions.setActivePreviewTab('RETURN');
  actions.setActiveRouteIndex(previous => previous + 1);
  assert.equal(store.getState().showOverridesAccordion, false);
  assert.equal(store.getState().maxRouteDurationMinutes, undefined);
  assert.equal(store.getState().defaultStopServiceSeconds, 90);
  assert.equal(store.getState().activePreviewTab, 'RETURN');
  assert.equal(store.getState().activeRouteIndex, 1);
  assert.equal(store.getState().setActiveRouteIndex, actions.setActiveRouteIndex);
});

test('unrelated fields retain identity and no-op updates do not notify subscribers', () => {
  const store = createRoutePlanDraftStore();
  const before = store.getState();
  let notifications = 0;
  const unsubscribe = store.subscribe(() => notifications++);
  before.setStudentSearch('');
  assert.equal(notifications, 0);
  before.setStudentSearch('query');
  assert.equal(notifications, 1);
  assert.equal(store.getState().selectedStudentIds, before.selectedStudentIds);
  assert.equal(store.getState().focusPoint, before.focusPoint);
  before.setStudentSearch(previous => previous);
  assert.equal(notifications, 1);
  unsubscribe();
});

test('a new scope starts clean and stale actions cannot affect a different draft', () => {
  const previous = createRoutePlanDraftStore();
  const next = createRoutePlanDraftStore();
  previous.getState().setStudentSearch('previous scope');
  previous.getState().setSelectedVehicleIds(new Set(['selection-a']));
  previous.getState().setStudentSearch('late callback');
  assert.equal(next.getState().studentSearch, '');
  assert.equal(next.getState().selectedVehicleIds.size, 0);
  assert.equal(next.getState().activePreviewTab, 'OUTBOUND');
});
