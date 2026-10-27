import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Dimensions, Keyboard, ScrollView, StyleSheet, TextInput, type KeyboardEvent, type ScrollViewProps } from 'react-native';
import { getFocusScrollDelta } from '@/utils/keyboard-visibility';

/** Owns keyboard insets; do not nest inside a KeyboardAvoidingView. */
export const KeyboardScrollView = forwardRef<React.ComponentRef<typeof ScrollView>, ScrollViewProps>(function KeyboardScrollView(
  { contentContainerStyle, onFocus, onBlur, onLayout, onScroll, onContentSizeChange, ...props }, forwardedRef,
) {
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const offset = useRef(0);
  const focused = useRef(false);
  const frame = useRef<number | null>(null);
  const generation = useRef(0);
  const keyboardTop = useRef<number | undefined>(Keyboard.metrics()?.screenY);
  const [keyboardVisible, setKeyboardVisible] = useState(Keyboard.isVisible());
  useImperativeHandle(forwardedRef, () => scroll.current!, []);

  const reveal = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    const version = ++generation.current;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const input = TextInput.State.currentlyFocusedInput();
      const viewport = scroll.current;
      if (!focused.current || !input || !viewport) return;
      viewport.measureInWindow((_x, top, _width, height) => {
        input.measureInWindow((_inputX, fieldTop, _inputWidth, fieldHeight) => {
          if (version !== generation.current || !focused.current || TextInput.State.currentlyFocusedInput() !== input) return;
          const bottom = Math.min(top + height, keyboardTop.current ?? top + height);
          const delta = getFocusScrollDelta(fieldTop, fieldHeight, top, bottom);
          if (Math.abs(delta) > 1) viewport.scrollTo({ y: Math.max(0, offset.current + delta), animated: false });
        });
      });
    });
  }, []);

  useEffect(() => {
    const show = (event: KeyboardEvent) => {
      const visible = event.endCoordinates.height > 0 && event.endCoordinates.screenY < Dimensions.get('window').height;
      keyboardTop.current = visible ? event.endCoordinates.screenY : undefined;
      setKeyboardVisible(visible);
      if (visible) reveal();
    };
    const hide = () => { ++generation.current; keyboardTop.current = undefined; setKeyboardVisible(false); };
    const subscriptions = [
      Keyboard.addListener('keyboardDidShow', show),
      Keyboard.addListener('keyboardWillChangeFrame', show),
      Keyboard.addListener('keyboardDidChangeFrame', show),
      Keyboard.addListener('keyboardDidHide', hide),
    ];
    return () => {
      ++generation.current;
      subscriptions.forEach(subscription => subscription.remove());
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [reveal]);

  const content = StyleSheet.flatten(contentContainerStyle);
  const bottom = content?.paddingBottom ?? content?.paddingVertical ?? content?.padding ?? 0;
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
      scrollEventThrottle={16} {...props} ref={scroll}
      contentContainerStyle={[
        contentContainerStyle,
        keyboardVisible && { paddingBottom: (typeof bottom === 'number' ? bottom : 0) + 12 },
      ]}
      onFocus={event => { event.stopPropagation(); focused.current = true; onFocus?.(event); reveal(); }}
      onBlur={event => { event.stopPropagation(); focused.current = false; ++generation.current; onBlur?.(event); }}
      onLayout={event => { onLayout?.(event); reveal(); }}
      onScroll={event => { offset.current = event.nativeEvent.contentOffset.y; onScroll?.(event); }}
      onContentSizeChange={(width, height) => { onContentSizeChange?.(width, height); reveal(); }}
    />
  );
});
