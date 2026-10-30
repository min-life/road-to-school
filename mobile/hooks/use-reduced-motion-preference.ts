import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotionPreference() {
  // Remain still until the preference is known, including on first render.
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      if (active) setReduced(value);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active) setReduced(value);
    }).catch(() => {});
    return () => { active = false; subscription?.remove(); };
  }, []);
  return reduced;
}
