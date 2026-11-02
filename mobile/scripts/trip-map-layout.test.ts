import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasTripBottomAction } from '../utils/trip-map-layout';

// Role/status primitives only; no Trip/User records or API responses.
describe('Trip map footer visibility', () => {
  it('never reserves an operation footer for Parent', () => {
    for (const status of [undefined, 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']) {
      assert.equal(hasTripBottomAction('PARENT', status), false);
    }
  });
  it('shows the driver footer only where an existing action is rendered', () => {
    assert.equal(hasTripBottomAction('DRIVER', 'SCHEDULED'), true);
    assert.equal(hasTripBottomAction('DRIVER', 'IN_PROGRESS'), true);
    for (const status of [undefined, 'COMPLETED', 'CANCELLED', 'UNKNOWN']) {
      assert.equal(hasTripBottomAction('DRIVER', status), false);
    }
  });
  it('does not leave an empty attendant footer during a running trip', () => {
    assert.equal(hasTripBottomAction('BUS_ATTENDANT', 'SCHEDULED'), true);
    for (const status of [undefined, 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']) {
      assert.equal(hasTripBottomAction('BUS_ATTENDANT', status), false);
    }
  });
  it('does not grant footer controls to an unknown or admin role', () => {
    for (const role of [undefined, 'SYSTEM_ADMIN', 'SCHOOL_ADMIN'] as const) {
      assert.equal(hasTripBottomAction(role, 'SCHEDULED'), false);
    }
  });
});
