'use client';

import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Building2, BusFront, LocateFixed, Maximize2, UserRound, Warehouse } from 'lucide-react';
import { Map, MapControls, MapMarker, MapRoute, MarkerContent, MarkerPopup, MarkerTooltip, useMap } from '@/components/ui/map';
import { decodePolyline } from '@/lib/polyline';
import type { VehiclePosition } from '@/lib/trip-location';
import type { ErrorEvent as MapErrorEvent } from 'maplibre-gl';
import './route-map.css';

export interface MapPoint {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  subtitle?: string;
  type: 'DEPOT' | 'SCHOOL' | 'STUDENT';
  order?: number;
  eta?: string;
  isSelected?: boolean;
}

interface RouteMapProps {
  schoolLocation?: { latitude: number; longitude: number; name?: string };
  parkingLocation?: { latitude: number; longitude: number; addressText?: string };
  points?: MapPoint[];
  polylineGeometry?: string | null;
  height?: string;
  focusPoint?: { latitude: number; longitude: number; zoom?: number } | null;
  onPointClick?: (point: MapPoint) => void;
  className?: string;
  vehiclePosition?: VehiclePosition | null;
  recordedTrack?: VehiclePosition[][];
}

const EMPTY_POINTS: MapPoint[] = [];
const hasCoordinates = (point: { latitude: number; longitude: number } | null | undefined) =>
  !!point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude);

function MapMessage({ children }: { children: ReactNode }) {
  return <div className="rts-map-message" role="status">{children}</div>;
}

class MapErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <MapMessage>Không thể mở bản đồ. Vui lòng tải lại trang hoặc kiểm tra WebGL.</MapMessage> : this.props.children;
  }
}

export function RouteMap({ schoolLocation, parkingLocation, points = EMPTY_POINTS, polylineGeometry, height = '480px', focusPoint, onPointClick, className = '', vehiclePosition, recordedTrack }: RouteMapProps) {
  const tilemapKey = process.env.NEXT_PUBLIC_VIETMAP_TILEMAP_KEY || '';
  const styles = useMemo(() => {
    const url = `https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=${tilemapKey}`;
    return { light: url, dark: url };
  }, [tilemapKey]);

  return (
    <div className={`rts-map ${className}`} style={{ height }}>
      {!tilemapKey ? <MapMessage>Chưa cấu hình NEXT_PUBLIC_VIETMAP_TILEMAP_KEY</MapMessage> : (
        <MapErrorBoundary key={tilemapKey}>
          <Map theme="light" styles={styles} center={schoolLocation ? [schoolLocation.longitude, schoolLocation.latitude] : [106.700806, 10.776889]} zoom={12}
            transformRequest={(url) => {
              if (url.includes('vietmap.vn') && !url.includes('apikey=')) {
                return { url: `${url}${url.includes('?') ? '&' : '?'}apikey=${tilemapKey}` };
              }
              return { url };
            }}>
            <RouteScene schoolLocation={schoolLocation} parkingLocation={parkingLocation} points={points} polylineGeometry={polylineGeometry}
              focusPoint={focusPoint} onPointClick={onPointClick} vehiclePosition={vehiclePosition} recordedTrack={recordedTrack} />
          </Map>
        </MapErrorBoundary>
      )}
    </div>
  );
}

function RouteScene({ schoolLocation, parkingLocation, points = EMPTY_POINTS, polylineGeometry, focusPoint, onPointClick, vehiclePosition, recordedTrack }: RouteMapProps) {
  const { map, isLoaded } = useMap();
  const fitted = useRef(false);
  const lastPolyline = useRef<string | null | undefined>(undefined);
  const [mapError, setMapError] = useState<string | null>(null);
  // Route membership (isSelected) is distinct from the point being inspected.
  const [inspectedPoint, setInspectedPoint] = useState<{ id: string; focusPoint: RouteMapProps['focusPoint'] } | null>(null);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const focusedPointId = focusPoint ? points.find(point => point.latitude === focusPoint.latitude && point.longitude === focusPoint.longitude)?.id : undefined;
  const activePointId = hoveredPointId ?? (inspectedPoint?.focusPoint === focusPoint ? inspectedPoint?.id : focusedPointId);
  const coordinates = useMemo(() => polylineGeometry ? decodePolyline(polylineGeometry) : [], [polylineGeometry]);

  const fitAll = useCallback(() => {
    if (!map) return;
    const all: [number, number][] = [];
    for (const point of [parkingLocation, schoolLocation, ...points, ...(recordedTrack?.flat() ?? []), vehiclePosition]) {
      if (hasCoordinates(point)) all.push([point!.longitude, point!.latitude]);
    }
    all.push(...coordinates);
    fitCoordinates(map, all, 60, 700);
  }, [map, parkingLocation, schoolLocation, points, recordedTrack, vehiclePosition, coordinates]);

  useEffect(() => {
    if (!map) return;
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(map.getContainer());
    const onError = (event: MapErrorEvent) => {
      const status = (event.error as { status?: number }).status;
      if (status === 401 || status === 403) setMapError('Không thể tải bản đồ VietMap. Kiểm tra khóa và quyền truy cập.');
    };
    map.on('error', onError);
    return () => { observer.disconnect(); map.off('error', onError); };
  }, [map]);

  useEffect(() => {
    if (!map || !isLoaded || !hasCoordinates(focusPoint)) return;
    map.flyTo({ center: [focusPoint!.longitude, focusPoint!.latitude], zoom: focusPoint!.zoom || 15.5, essential: true, duration: 700 });
  }, [map, isLoaded, focusPoint]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    const changed = lastPolyline.current !== polylineGeometry;
    lastPolyline.current = polylineGeometry;
    const initial: [number, number][] = [];
    for (const point of [parkingLocation, schoolLocation, ...points]) {
      if (hasCoordinates(point)) initial.push([point!.longitude, point!.latitude]);
    }
    if (recordedTrack === undefined) initial.push(...coordinates);
    if (initial.length && (!fitted.current || changed)) {
      fitted.current = true;
      fitCoordinates(map, initial, 50, 800);
    }
  }, [map, isLoaded, parkingLocation, schoolLocation, points, polylineGeometry, coordinates, recordedTrack]);

  const focusLocation = (longitude: number, latitude: number) => map?.flyTo({ center: [longitude, latitude], zoom: 15.5, duration: 600 });
  return <>
    {recordedTrack === undefined && coordinates.length >= 2 && <MapRoute id="planned-route" coordinates={coordinates} color="#2563eb" width={5} opacity={0.85} interactive={false} />}
    {/* Preserve recorded run/gap boundaries. Never connect separate parts. */}
    {recordedTrack?.map((part, index) => part.length >= 2
      ? <MapRoute key={index} id={`recorded-${index}`} coordinates={part.map(point => [point.longitude, point.latitude])} color="#059669" width={5} opacity={1} interactive={false} />
      : part.length === 1 ? <MapMarker key={index} longitude={part[0].longitude} latitude={part[0].latitude}>
        <MarkerContent><span className="rts-track-point" aria-label="Điểm hành trình đã ghi" /></MarkerContent>
      </MapMarker> : null)}

    {parkingLocation && hasCoordinates(parkingLocation) && <MapMarker longitude={parkingLocation.longitude} latitude={parkingLocation.latitude} onClick={() => focusLocation(parkingLocation.longitude, parkingLocation.latitude)}>
      <MarkerContent><button type="button" className="rts-map-marker rts-map-depot" aria-label="Bãi xe trung tâm"><Warehouse size={19} /></button></MarkerContent>
      <MarkerTooltip className="rts-map-tooltip">Bãi xe trung tâm</MarkerTooltip>
      <MarkerPopup className="rts-map-popup" closeButton><strong>Bãi xe trung tâm</strong><p>{parkingLocation.addressText}</p></MarkerPopup>
    </MapMarker>}

    {schoolLocation && hasCoordinates(schoolLocation) && <MapMarker longitude={schoolLocation.longitude} latitude={schoolLocation.latitude} onClick={() => focusLocation(schoolLocation.longitude, schoolLocation.latitude)}>
      <MarkerContent><button type="button" className="rts-map-marker rts-map-school" aria-label={schoolLocation.name || 'Trường học'}><Building2 size={20} /></button></MarkerContent>
      <MarkerTooltip className="rts-map-tooltip">{schoolLocation.name || 'Trường học'}</MarkerTooltip>
      <MarkerPopup className="rts-map-popup" closeButton><strong>Trường học</strong><p>{schoolLocation.name}</p></MarkerPopup>
    </MapMarker>}

    {points.filter(hasCoordinates).map(point => <MapMarker key={`${point.id}:${typeof point.order === 'number' ? 'route' : 'student'}`} longitude={point.longitude} latitude={point.latitude}
      anchor={typeof point.order === 'number' ? 'bottom' : 'center'}
      onMouseEnter={() => setHoveredPointId(point.id)} onMouseLeave={() => setHoveredPointId(null)}
      onClick={() => { setInspectedPoint({ id: point.id, focusPoint }); onPointClick?.(point); }}>
      <MarkerContent><button type="button" className={`rts-map-stop ${typeof point.order === 'number' ? 'rts-map-pin' : 'rts-map-student'} ${activePointId === point.id ? 'rts-map-stop-active' : ''}`}
        aria-label={typeof point.order === 'number' ? `${point.order}. ${point.title}` : point.title}
        onFocus={() => setInspectedPoint({ id: point.id, focusPoint })}>
        {typeof point.order === 'number' ? <>
          <svg className="rts-map-pin-shape" viewBox="0 0 32 40" aria-hidden="true"><path d="M16 1C7.7 1 1 7.7 1 16c0 10.5 15 23 15 23s15-12.5 15-23C31 7.7 24.3 1 16 1Z" /></svg>
          <span className="rts-map-pin-number">{point.order}</span>
        </> : <span className="rts-map-student-icon"><UserRound size={14} aria-hidden="true" /></span>}
      </button></MarkerContent>
      <MarkerTooltip className="rts-map-tooltip">{point.title}</MarkerTooltip>
      <MarkerPopup className="rts-map-popup" closeButton>
        <strong>{point.title}</strong>{point.eta && <p className="rts-map-eta">Dự kiến: {point.eta}</p>}{point.subtitle && <p>{point.subtitle}</p>}
      </MarkerPopup>
    </MapMarker>)}

    {vehiclePosition && hasCoordinates(vehiclePosition) && <MapMarker longitude={vehiclePosition.longitude} latitude={vehiclePosition.latitude}>
      <MarkerContent><button type="button" className="rts-map-marker rts-map-vehicle" aria-label="Vị trí xe"><BusFront size={23} /></button></MarkerContent>
      <MarkerTooltip className="rts-map-tooltip">Vị trí xe</MarkerTooltip>
    </MapMarker>}

    <MapControls position="top-right" showCompass showFullscreen className="rts-map-controls" />
    {isLoaded && <>
      <div className="rts-map-toolbar">
        <button type="button" onClick={fitAll}><Maximize2 size={15} />Xem toàn cảnh</button>
        {vehiclePosition && <button type="button" onClick={() => map?.flyTo({ center: [vehiclePosition.longitude, vehiclePosition.latitude], duration: 500 })}><LocateFixed size={15} />Theo xe</button>}
      </div>
      <div className="rts-map-legend" aria-label="Chú giải bản đồ">
        <span><i className="rts-legend-depot" />Bãi xe</span><span><i className="rts-legend-school" />Trường học</span><span><i className="rts-legend-stop" />Học sinh</span>
      </div>
    </>}
    {mapError && <MapMessage>{mapError}</MapMessage>}
  </>;
}

function fitCoordinates(map: NonNullable<ReturnType<typeof useMap>['map']>, coordinates: [number, number][], padding: number, duration: number) {
  if (!coordinates.length) return;
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
  for (const [longitude, latitude] of coordinates) {
    west = Math.min(west, longitude); east = Math.max(east, longitude);
    south = Math.min(south, latitude); north = Math.max(north, latitude);
  }
  try { map.fitBounds([[west, south], [east, north]], { padding, maxZoom: 15, duration }); } catch { /* Single point/hidden map: retry via overview control. */ }
}
