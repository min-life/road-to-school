import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getFocusScrollDelta } from '../utils/keyboard-visibility.ts';

describe('focused field visibility in measured viewports', () => {
  it('keeps a visible field still when the keyboard opens', () => {
    assert.equal(getFocusScrollDelta(120, 52, 80, 450), 0);
  });
  it('scrolls a bottom field by exactly the obstruction plus clearance', () => {
    assert.equal(getFocusScrollDelta(420, 52, 80, 450), 34);
  });
  it('reveals a previous field above the viewport when focus moves backwards', () => {
    assert.equal(getFocusScrollDelta(50, 52, 80, 450), -42);
  });
  it('uses modal bounds rather than assuming the whole screen is available', () => {
    assert.equal(getFocusScrollDelta(410, 80, 300, 470), 32);
  });
  it('handles a panned Safari visual viewport in the same coordinate space', () => {
    assert.equal(getFocusScrollDelta(550, 52, 180, 580), 34);
  });
  it('stops compensating when the visible viewport expands after keyboard dismissal', () => {
    assert.equal(getFocusScrollDelta(550, 52, 0, 400), 214);
    assert.equal(getFocusScrollDelta(550, 52, 0, 800), 0);
  });
  it('fits the clearance to small viewports and allows a tall editor to scroll internally', () => {
    assert.equal(getFocusScrollDelta(120, 100, 100, 140), 10);
    assert.equal(getFocusScrollDelta(112, 100, 100, 300), 0);
  });
  it('ignores collapsed fields and unavailable viewports', () => {
    assert.equal(getFocusScrollDelta(500, 0, 0, 400), 0);
    assert.equal(getFocusScrollDelta(500, 52, 400, 400), 0);
  });
});
