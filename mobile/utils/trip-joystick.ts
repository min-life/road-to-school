export const JOYSTICK_SIZE = 120;
const RADIUS = 38;
const DEAD_ZONE = 8;

export function joystickInput(dx: number, dy: number) {
  const distance = Math.hypot(dx, dy);
  if (distance <= DEAD_ZONE) return { x: 0, y: 0, bearing: 0, speed: 0 };
  const scale = Math.min(1, RADIUS / distance);
  return {
    x: dx * scale,
    y: dy * scale,
    bearing: (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360,
    // The navigation engine applies the selected km/h; this value enables movement.
    speed: 8,
  };
}
