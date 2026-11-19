import assert from 'node:assert/strict';
import test from 'node:test';
import { addressApprovalOutcome, isServiceAreaRejection, validateRoutingInputs } from './address-request-review.ts';
import type { SystemRequestRoutingPreviewResponse } from './types';

const preview: SystemRequestRoutingPreviewResponse = {
  overallFeasibility: 'FEASIBLE', routes: [], affectedScheduledTripsCount: 0, preservedTripsCount: 0,
};
const route = { routeId: 'route', routeName: 'Tuyến đi 01', direction: 'TO_SCHOOL', feasibility: 'FEASIBLE' } as const;

test('an address request for a student without a route can be approved directly', () => {
  assert.equal(addressApprovalOutcome(preview), 'DIRECT_UPDATE');
  assert.equal(addressApprovalOutcome({ ...preview, overallFeasibility: 'UNAVAILABLE' }), null);
  assert.equal(addressApprovalOutcome(null), null);
});

test('checks routing outcome and requires a current token and fingerprint before updating a route', () => {
  const withRoute = { ...preview, routes: [route] };
  assert.equal(addressApprovalOutcome(withRoute), null);
  assert.equal(addressApprovalOutcome({ ...withRoute, expectedFingerprint: 'version', previewToken: 'token' }), 'REOPTIMIZED');
  assert.equal(addressApprovalOutcome({ ...withRoute, overallFeasibility: 'UNAVAILABLE' }), null);
  assert.equal(addressApprovalOutcome({ ...withRoute, overallFeasibility: 'INFEASIBLE' }), 'REMOVED_FROM_ROUTES');
});

test('retains empty input while editing and enforces the existing routing constraints', () => {
  assert.ok(validateRoutingInputs('', '60').minutesError);
  assert.ok(validateRoutingInputs('90', '').secondsError);
  assert.ok(validateRoutingInputs('9', '300.5').minutesError);
  assert.ok(validateRoutingInputs('9', '300.5').secondsError);
  assert.deepEqual(validateRoutingInputs('10', '300'), {
    maxRouteDurationMinutes: 10, defaultStopServiceSeconds: 300, minutesError: null, secondsError: null,
  });
});

test('separates unsupported pickup locations from retryable routing failures', () => {
  assert.equal(isServiceAreaRejection('Điểm đón vượt bán kính phục vụ 50km'), true);
  assert.equal(isServiceAreaRejection('Điểm đón khác tỉnh/thành với trường'), true);
  assert.equal(isServiceAreaRejection('Không thể kiểm tra tuyến'), false);
});
