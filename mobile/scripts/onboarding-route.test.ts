import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getOnboardingDestination } from '../utils/onboarding-route.ts';

const firstLaunch = { ready: true, completed: false, authenticated: false, inAuthGroup: false };

describe('onboarding entry routing without auth/API changes', () => {
  it('waits for local preference loading', () => {
    assert.equal(getOnboardingDestination({ ...firstLaunch, ready: false }), null);
  });
  it('introduces a first-time signed-out user before login', () => {
    assert.equal(getOnboardingDestination(firstLaunch), 'onboarding');
    assert.equal(getOnboardingDestination({ ...firstLaunch, inAuthGroup: true, authScreen: 'login' }), 'onboarding');
  });
  it('does not redirect repeatedly while viewing onboarding', () => {
    assert.equal(getOnboardingDestination({ ...firstLaunch, inAuthGroup: true, authScreen: 'onboarding' }), null);
  });
  it('returns completed/skipped onboarding to the existing login', () => {
    assert.equal(getOnboardingDestination({ ...firstLaunch, completed: true, inAuthGroup: true, authScreen: 'onboarding' }), 'login');
    assert.equal(getOnboardingDestination({ ...firstLaunch, completed: true, inAuthGroup: true, authScreen: 'login' }), null);
  });
  it('never interrupts an authenticated session', () => {
    for (const authScreen of [undefined, 'login', 'onboarding']) {
      assert.equal(getOnboardingDestination({ ...firstLaunch, authenticated: true, inAuthGroup: !!authScreen, authScreen }), null);
    }
  });
  it('preserves direct registration, OTP and password-reset routes', () => {
    for (const authScreen of ['register', 'verify-otp', 'forgot-password', 'reset-password']) {
      assert.equal(getOnboardingDestination({ ...firstLaunch, inAuthGroup: true, authScreen }), null);
    }
  });
  it('leaves existing signed-out protected-route guarding in place after completion', () => {
    assert.equal(getOnboardingDestination({ ...firstLaunch, completed: true }), null);
  });
});
