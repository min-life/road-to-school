import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getTabBarMetrics, isNavigationOccluded } from '../utils/navigation-layout.ts';

describe('navigation in changing device viewports (no API/DB)', () => {
  it('reserves a home-indicator inset in addition to the tab content', () => {
    const phone = getTabBarMetrics(34, 1), noInset = getTabBarMetrics(0, 1);
    assert.equal(phone.height - phone.paddingBottom, noInset.height - noInset.paddingBottom);
    assert.ok(phone.paddingBottom >= 34);
    assert.ok(noInset.paddingBottom > 0);
  });
  it('grows the label area for accessibility font sizes without losing the inset', () => {
    const normal = getTabBarMetrics(34, 1), large = getTabBarMetrics(34, 2);
    assert.ok(large.height > normal.height);
    assert.equal(large.paddingBottom, normal.paddingBottom);
  });
  it('does not shrink touch/navigation space for smaller fonts', () => {
    assert.deepEqual(getTabBarMetrics(0, 0.8), getTabBarMetrics(0, 1));
  });
  it('does not hide navigation just because a visible field was focused', () => {
    assert.equal(isNavigationOccluded(true, 844, 844), false);
  });
  it('hides for both visual viewport and layout viewport keyboard resizing', () => {
    assert.equal(isNavigationOccluded(true, 844, 510), true);
    assert.equal(isNavigationOccluded(true, 844, 420), true);
  });
  it('accounts for viewport panning rather than counting its height alone', () => {
    assert.equal(isNavigationOccluded(true, 844, 300 + 544), false);
  });
  it('restores navigation when editing ends or the keyboard is dismissed', () => {
    assert.equal(isNavigationOccluded(false, 844, 510), false);
    assert.equal(isNavigationOccluded(true, 844, 844), false);
  });
});
