import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validCoordinates, normalizeGuardianPhone, validGuardianPhone, canDirectlyUpdateAddress } from './school-admin.ts';
test('coordinates accept zero but reject absent, infinite and out-of-range values', () => {
  assert.equal(validCoordinates(0, 0), true); assert.equal(validCoordinates(null, 0), false);
  assert.equal(validCoordinates(91, 0), false); assert.equal(validCoordinates(0, 181), false);
  assert.equal(validCoordinates(NaN, 10), false); assert.equal(validCoordinates(10, Infinity), false);
});
test('guardian phone mirrors the backend 0/+84 contract after formatting removal', () => {
  assert.equal(normalizeGuardianPhone(' +84 (912) 345-678 '), '+84912345678');
  assert.equal(validGuardianPhone('0912 345 678'), true); assert.equal(validGuardianPhone('+84 912345678'), true);
  assert.equal(validGuardianPhone('1912345678'), false); assert.equal(validGuardianPhone('84912345678'), false);
});
test('direct address updates require both verified membership counts to be zero', () => {
  assert.equal(canDirectlyUpdateAddress({ activeRoutePlansCount: 0, draftRoutePlansCount: 0 }), true);
  assert.equal(canDirectlyUpdateAddress({ activeRoutePlansCount: 1, draftRoutePlansCount: 0 }), false);
  assert.equal(canDirectlyUpdateAddress({ activeRoutePlansCount: 0, draftRoutePlansCount: 1 }), false);
});
