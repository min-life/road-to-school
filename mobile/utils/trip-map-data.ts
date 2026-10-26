type MapTrip = {
  polylineGeometry?: string | null;
  stops: readonly {
    stopOrder: number; latitude: number; longitude: number; stopType: string;
    studentName?: string | null; addressText?: string | null;
    plannedArrivalTime?: string | null; isMyChild?: boolean;
  }[];
};

/** Dynamic attendance, status and assignment must never change the map source. */
export function getTripMapSnapshot(trip: MapTrip | null): string {
  return JSON.stringify(trip ? {
    polylineGeometry: trip.polylineGeometry,
    stops: trip.stops.map(stop => ({
      order: stop.stopOrder, lat: stop.latitude, lng: stop.longitude, type: stop.stopType,
      name: stop.studentName || stop.addressText, address: stop.addressText,
      eta: stop.plannedArrivalTime || '', isMyChild: stop.isMyChild ?? false,
    })),
  } : null);
}
