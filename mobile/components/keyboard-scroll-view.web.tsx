import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ScrollView, StyleSheet, type ScrollViewProps } from 'react-native';
import { getFocusScrollDelta } from '@/utils/keyboard-visibility';

/** Safari/Chrome may resize the visual viewport without resizing the layout viewport. */
export const KeyboardScrollView = forwardRef<React.ComponentRef<typeof ScrollView>, ScrollViewProps>(function KeyboardScrollView(
  { contentContainerStyle, onFocus, onBlur, onLayout, onContentSizeChange, ...props }, forwardedRef,
) {
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const frame = useRef<number | null>(null);
  const [overlap, setOverlap] = useState(0);
  useImperativeHandle(forwardedRef, () => scroll.current!, []);

  const reveal = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const node: unknown = scroll.current?.getScrollableNode();
      if (!(node instanceof HTMLElement)) return;
      const input = document.activeElement;
      if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) || !node.contains(input)) {
        setOverlap(0);
        return;
      }
      const visual = window.visualViewport;
      const viewportTop = visual?.offsetTop ?? 0;
      const viewportBottom = viewportTop + (visual?.height ?? window.innerHeight);
      const rect = node.getBoundingClientRect();
      const nextOverlap = Math.max(0, rect.bottom - viewportBottom);
      setOverlap(previous => Math.abs(previous - nextOverlap) > 1 ? nextOverlap : previous);
      const field = input.getBoundingClientRect();
      const delta = getFocusScrollDelta(field.top, field.height, Math.max(rect.top, viewportTop), Math.min(rect.bottom, viewportBottom));
      if (Math.abs(delta) > 1) node.scrollTop += delta;
    });
  }, []);

  useEffect(() => {
    const visual = window.visualViewport;
    visual?.addEventListener('resize', reveal);
    visual?.addEventListener('scroll', reveal);
    window.addEventListener('resize', reveal);
    return () => {
      visual?.removeEventListener('resize', reveal);
      visual?.removeEventListener('scroll', reveal);
      window.removeEventListener('resize', reveal);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [reveal]);
  // Padding must be committed before a last field can scroll into view.
  useEffect(reveal, [overlap, reveal]);

  const content = StyleSheet.flatten(contentContainerStyle);
  const bottom = content?.paddingBottom ?? content?.paddingVertical ?? content?.padding ?? 0;
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled" {...props} ref={scroll}
      contentContainerStyle={[
        contentContainerStyle,
        overlap > 0 && { paddingBottom: (typeof bottom === 'number' ? bottom : 0) + overlap + 12 },
      ]}
      onFocus={event => { event.stopPropagation(); onFocus?.(event); reveal(); }}
      onBlur={event => { event.stopPropagation(); onBlur?.(event); reveal(); }}
      onLayout={event => { onLayout?.(event); reveal(); }}
      onContentSizeChange={(width, height) => { onContentSizeChange?.(width, height); reveal(); }}
    />
  );
});
