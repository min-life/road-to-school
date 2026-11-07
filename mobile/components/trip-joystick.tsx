import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, PanResponder, StyleSheet, View } from 'react-native';
import { JOYSTICK_SIZE, joystickInput } from '../utils/trip-joystick';

export function TripJoystick({ onMove }: { onMove: (bearing: number, speed: number) => void }) {
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const callback = useRef(onMove);
  callback.current = onMove;
  const start = useRef({ x: 0, y: 0 });
  const pulse = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => {
    if (pulse.current) clearTimeout(pulse.current);
    pulse.current = null;
    setThumb({ x: 0, y: 0 });
    callback.current(0, 0);
  };
  const move = (x: number, y: number) => {
    const input = joystickInput(x, y);
    setThumb({ x: input.x, y: input.y });
    callback.current(input.bearing, input.speed);
  };
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: event => {
      if (pulse.current) clearTimeout(pulse.current);
      start.current = {
        x: event.nativeEvent.locationX - JOYSTICK_SIZE / 2,
        y: event.nativeEvent.locationY - JOYSTICK_SIZE / 2,
      };
      move(start.current.x, start.current.y);
    },
    onPanResponderMove: (_, gesture) => {
      if (gesture.numberActiveTouches !== 1) stop();
      else move(start.current.x + gesture.dx, start.current.y + gesture.dy);
    },
    onPanResponderRelease: stop,
    onPanResponderTerminate: stop,
    onPanResponderTerminationRequest: () => true,
    onShouldBlockNativeResponder: () => true,
  }), []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') stop();
    });
    return () => {
      subscription.remove();
      if (pulse.current) clearTimeout(pulse.current);
      callback.current(0, 0);
    };
  }, []);

  return (
    <View
      {...responder.panHandlers}
      style={styles.base}
      accessible
      accessibilityRole="button"
      accessibilityLabel="Joystick lái thủ công"
      accessibilityHint="Kéo để di chuyển xe, thả tay để dừng"
      accessibilityActions={[
        { name: 'north', label: 'Lái hướng Bắc' }, { name: 'east', label: 'Lái hướng Đông' },
        { name: 'south', label: 'Lái hướng Nam' }, { name: 'west', label: 'Lái hướng Tây' },
      ]}
      onAccessibilityAction={event => {
        stop();
        const directions: Record<string, [number, number]> = {
          north: [0, -38], east: [38, 0], south: [0, 38], west: [-38, 0],
        };
        const direction = directions[event.nativeEvent.actionName];
        if (direction) {
          move(...direction);
          pulse.current = setTimeout(stop, 200);
        }
      }}
    >
      <View pointerEvents="none" style={styles.face}>
        <View style={[styles.thumb, { transform: [{ translateX: thumb.x }, { translateY: thumb.y }] }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: JOYSTICK_SIZE, height: JOYSTICK_SIZE, borderRadius: JOYSTICK_SIZE / 2,
    backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(30, 41, 59, 0.3)',
  },
  face: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  thumb: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(30, 41, 59, 0.16)',
    borderWidth: 1, borderColor: 'rgba(30, 41, 59, 0.45)',
  },
});
