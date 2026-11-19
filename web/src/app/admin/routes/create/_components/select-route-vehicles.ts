type VehicleSeats = { id: string; seatCount: number };

export function selectRouteVehicles(vehicles: readonly VehicleSeats[], demand: number) {
  if (demand <= 0) return new Set<string>();
  const available = vehicles.filter(vehicle => vehicle.seatCount > 0);
  if (available.reduce((sum, vehicle) => sum + vehicle.seatCount, 0) < demand) {
    return new Set(available.map(vehicle => vehicle.id));
  }

  // At each capacity below demand, keep the fewest vehicles that reach it.
  const partial = new Map<number, string[]>([[0, []]]);
  let best: { seats: number; ids: string[] } | undefined;
  for (const vehicle of available) {
    // Descending capacity makes each vehicle usable only once.
    const capacities = [...partial.keys()].sort((a, b) => b - a);
    for (const capacity of capacities) {
      const ids = partial.get(capacity)!;
      const seats = capacity + vehicle.seatCount;
      const count = ids.length + 1;
      if (seats >= demand) {
        if (!best || count < best.ids.length || (count === best.ids.length && seats < best.seats)) {
          best = { seats, ids: [...ids, vehicle.id] };
        }
      } else if ((!best || count < best.ids.length) && count < (partial.get(seats)?.length ?? Infinity)) {
        partial.set(seats, [...ids, vehicle.id]);
      }
    }
  }
  return new Set(best?.ids);
}
