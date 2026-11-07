import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { joystickInput } from '../utils/trip-joystick.ts';

describe('Manual joystick input', () => {
  it('stays stopped inside the centre dead zone', () => {
    for (const [x, y] of [[0, 0], [3, 4], [0, 8]]) {
      assert.deepEqual(joystickInput(x, y), { x: 0, y: 0, bearing: 0, speed: 0 });
    }
  });
  it('converts screen directions to geographic bearings', () => {
    for (const [x, y, bearing] of [[0, -30, 0], [30, 0, 90], [0, 30, 180], [-30, 0, 270], [30, -30, 45], [-30, 30, 225]]) {
      const input = joystickInput(x, y);
      assert.equal(input.bearing, bearing);
      assert.equal(input.speed, 8);
    }
  });
  it('clamps the thumb to the circle without changing its direction', () => {
    const input = joystickInput(300, -400);
    assert.ok(Math.abs(Math.hypot(input.x, input.y) - 38) < 0.001);
    assert.ok(Math.abs(input.x / input.y + 0.75) < 0.001);
    const inside = joystickInput(10, -10);
    assert.equal(inside.x, 10);
    assert.equal(inside.y, -10);
  });
});
