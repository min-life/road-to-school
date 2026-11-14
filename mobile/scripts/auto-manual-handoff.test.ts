import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldHandOffToManual } from '../utils/trip-navigation.ts';

describe('Automatic driving hands off near student stops', () => {
  it('hands off at 10 m or closer for pickup and dropoff', () => {
    for (const stopType of ['PICKUP', 'DROPOFF']) {
      for (const metres of [10, 9.9, 0]) {
        assert.equal(shouldHandOffToManual('TEST_AUTO', stopType, metres), true);
      }
      for (const metres of [10.1, 30, 100]) {
        assert.equal(shouldHandOffToManual('TEST_AUTO', stopType, metres), false);
      }
    }
  });
  it('does not affect GPS, manual driving, or an inactive session', () => {
    for (const source of ['LIVE', 'TEST_JOYSTICK', null] as const) {
      assert.equal(shouldHandOffToManual(source, 'PICKUP', 5), false);
    }
  });
  it('keeps school, parking and missing target stops automatic', () => {
    for (const type of ['SCHOOL_ARRIVAL', 'SCHOOL_DEPARTURE', 'PARKING_START', 'PARKING_END', undefined]) {
      assert.equal(shouldHandOffToManual('TEST_AUTO', type, 5), false);
    }
  });
  it('ignores missing or invalid distance measurements', () => {
    for (const metres of [NaN, Infinity, -1]) {
      assert.equal(shouldHandOffToManual('TEST_AUTO', 'PICKUP', metres), false);
    }
  });
});
