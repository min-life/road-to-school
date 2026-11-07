interface OnboardingRouteState {
  ready: boolean;
  completed: boolean;
  authenticated: boolean;
  inAuthGroup: boolean;
  authScreen?: string;
}

/** Only intercept the unauthenticated entry point, never an OTP/deep-link flow. */
export function getOnboardingDestination(state: OnboardingRouteState): 'onboarding' | 'login' | null {
  if (!state.ready || state.authenticated) return null;
  if (state.authScreen === 'onboarding' && state.inAuthGroup) {
    return state.completed ? 'login' : null;
  }
  if (!state.completed && (!state.inAuthGroup || state.authScreen === 'login')) {
    return 'onboarding';
  }
  return null;
}
