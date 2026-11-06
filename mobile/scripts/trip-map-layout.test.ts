import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasTripAction } from '../utils/trip-map-layout';

// Role/status primitives only; no Trip/User records or API responses.
describe('Trip information action availability', () => {
  it('never offers operation actions to Parent', () => {
    for (const status of [undefined, 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']) {
      assert.equal(hasTripAction('PARENT', status), false);
    }
  });
  it('offers driver actions only in scheduled or running trips', () => {
    assert.equal(hasTripAction('DRIVER', 'SCHEDULED'), true);
    assert.equal(hasTripAction('DRIVER', 'IN_PROGRESS'), true);
    for (const status of [undefined, 'COMPLETED', 'CANCELLED', 'UNKNOWN']) {
      assert.equal(hasTripAction('DRIVER', status), false);
    }
  });
  it('offers attendant readiness only before departure', () => {
    assert.equal(hasTripAction('BUS_ATTENDANT', 'SCHEDULED'), true);
    for (const status of [undefined, 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']) {
      assert.equal(hasTripAction('BUS_ATTENDANT', status), false);
    }
  });
  it('does not grant operation controls to an unknown or admin role', () => {
    for (const role of [undefined, 'SYSTEM_ADMIN', 'SCHOOL_ADMIN'] as const) {
      assert.equal(hasTripAction(role, 'SCHEDULED'), false);
    }
  });
});
