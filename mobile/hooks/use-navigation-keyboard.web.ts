import { useEffect, useRef, useState } from 'react';
import { isNavigationOccluded } from '@/utils/navigation-layout';

export function useNavigationKeyboard() {
  const [hidden, setHidden] = useState(false);
  const availableHeight = useRef(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    const touch = window.matchMedia('(pointer: coarse)');
    availableHeight.current = window.innerHeight;
    let frame: number | undefined;
    const measure = () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const editing = document.activeElement?.matches('input:not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled]), [contenteditable="true"]') ?? false;
        if (!editing) availableHeight.current = window.innerHeight;
        setHidden(touch.matches && isNavigationOccluded(editing, Math.max(availableHeight.current, window.innerHeight),
          viewport ? viewport.offsetTop + viewport.height : window.innerHeight));
      });
    };
    // Capture also sees fields whose scroll region stops bubbling focus events.
    document.addEventListener('focusin', measure, true);
    document.addEventListener('focusout', measure, true);
    viewport?.addEventListener('resize', measure);
    viewport?.addEventListener('scroll', measure);
    window.addEventListener('resize', measure);
    measure();
    return () => {
      document.removeEventListener('focusin', measure, true);
      document.removeEventListener('focusout', measure, true);
      viewport?.removeEventListener('resize', measure);
      viewport?.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, []);
  return hidden;
}
