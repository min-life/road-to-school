import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// This device preference is separate from authentication and survives logout.
const ONBOARDING_KEY = 'r2s_onboarding_v1_completed';

export const onboardingStorage = {
  async isCompleted(): Promise<boolean> {
    try {
      const value = Platform.OS === 'web'
        ? (typeof window !== 'undefined' ? window.localStorage.getItem(ONBOARDING_KEY) : null)
        : await SecureStore.getItemAsync(ONBOARDING_KEY);
      return value === 'true';
    } catch {
      // An unavailable preference must never be mistaken for an auth failure.
      return false;
    }
  },

  async complete(): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') throw new Error('Storage unavailable');
      window.localStorage.setItem(ONBOARDING_KEY, 'true');
    } else {
      await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
    }
  },
};
