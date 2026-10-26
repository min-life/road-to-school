'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { decodePolyline } from '@/lib/polyline';
import { SpinnerIcon } from '@/components/icons';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { VehiclePosition } from '@/lib/trip-location';
import type { Marker } from 'maplibre-gl';

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

export function RouteMap({
  schoolLocation,
  parkingLocation,
  points = [],
  polylineGeometry,
  height = '480px',
  focusPoint,
  onPointClick,
  className = '',
  vehiclePosition,
  recordedTrack,
}: RouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const vehicleMarkerRef = useRef<Marker | null>(null);
  const hasFitInitialBoundsRef = useRef(false);
  const lastPolylineRef = useRef<string | null | undefined>(undefined);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const tilemapKey = process.env.NEXT_PUBLIC_VIETMAP_TILEMAP_KEY || '';

  // Fit All Bounds helper
  const handleFitAll = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    import('maplibre-gl').then((maplibreModule) => {
      const maplibregl: any = (maplibreModule as any).default || maplibreModule;
      const bounds = new maplibregl.LngLatBounds();
      let hasCoords = false;

      if (parkingLocation?.latitude && parkingLocation?.longitude) {
        bounds.extend([parkingLocation.longitude, parkingLocation.latitude]);
        hasCoords = true;
      }

      if (schoolLocation?.latitude && schoolLocation?.longitude) {
        bounds.extend([schoolLocation.longitude, schoolLocation.latitude]);
        hasCoords = true;
      }

      points.forEach((pt) => {
        if (pt.latitude && pt.longitude) {
          bounds.extend([pt.longitude, pt.latitude]);
          hasCoords = true;
        }
      });
      recordedTrack?.flat().forEach(pt => { bounds.extend([pt.longitude, pt.latitude]); hasCoords = true; });
      if (vehiclePosition) { bounds.extend([vehiclePosition.longitude, vehiclePosition.latitude]); hasCoords = true; }

      if (polylineGeometry) {
        const coords = decodePolyline(polylineGeometry);
        coords.forEach((c) => bounds.extend(c));
        hasCoords = true;
      }

      if (hasCoords) {
        try {
          map.fitBounds(bounds, {
            padding: { top: 60, bottom: 60, left: 60, right: 60 },
            maxZoom: 15,
            duration: 700,
          });
        } catch {
          // ignore single point fit bounds
        }
      }
    });
  }, [parkingLocation, schoolLocation, points, polylineGeometry, recordedTrack, vehiclePosition]);

  // Initialize Map
  useEffect(() => {
    let isMounted = true;
    let resizeObserver: ResizeObserver | null = null;

    async function initMap() {
      if (!mapContainerRef.current) return;
      if (!tilemapKey) {
        setMapError('Chưa cấu hình NEXT_PUBLIC_VIETMAP_TILEMAP_KEY');
        return;
      }

      try {
        const maplibreModule = await import('maplibre-gl');
        const maplibregl: any = (maplibreModule as any).default || maplibreModule;

        if (typeof maplibregl.setWorkerUrl === 'function') {
          maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
        }

        const officialStyleUrl = `https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=${tilemapKey}`;

        const initialCenter: [number, number] = schoolLocation
          ? [schoolLocation.longitude, schoolLocation.latitude]
          : [106.700806, 10.776889];

        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: officialStyleUrl,
          center: initialCenter,
          zoom: 12,
          transformRequest: (url: string) => {
            if (url.includes('vietmap.vn') && !url.includes('apikey=')) {
              const separator = url.includes('?') ? '&' : '?';
              return { url: `${url}${separator}apikey=${tilemapKey}` };
            }
            return { url };
          },
        });

        map.addControl(new maplibregl.NavigationControl(), 'top-right');

        map.on('load', () => {
          if (!isMounted) return;
          mapInstanceRef.current = map;
          setMapLoaded(true);
        });

        map.on('error', (e: any) => {
          console.warn('MapLibre error:', e);
        });

        if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
          resizeObserver = new ResizeObserver(() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.resize();
            }
          });
          resizeObserver.observe(mapContainerRef.current);
        }
      } catch (err: any) {
        if (isMounted) {
          setMapError(err?.message || 'Không thể khởi tạo bản đồ');
        }
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (resizeObserver) resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        vehicleMarkerRef.current = null;
      }
    };
  }, [tilemapKey]);

  // Click-to-focus camera
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded || !focusPoint) return;
    if (!focusPoint.latitude || !focusPoint.longitude) return;

    map.flyTo({
      center: [focusPoint.longitude, focusPoint.latitude],
      zoom: focusPoint.zoom || 15.5,
      essential: true,
      duration: 700,
    });
  }, [focusPoint, mapLoaded]);

  // Update Markers and Polyline (Static Markers, No Animations - RM-003)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    // 1. Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    import('maplibre-gl').then((maplibreModule) => {
      const maplibregl: any = (maplibreModule as any).default || maplibreModule;
      const bounds = new maplibregl.LngLatBounds();
      let hasCoordinates = false;

      // 2. Add Depot Marker (Static, no scale animation)
      if (parkingLocation && parkingLocation.latitude && parkingLocation.longitude) {
        const depotEl = document.createElement('div');
        depotEl.className =
          'w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md border-2 border-white text-xs font-bold cursor-pointer select-none';
        depotEl.innerHTML = 'P';
        depotEl.title = parkingLocation.addressText || 'Bãi xe trung tâm';

        const popup = new maplibregl.Popup({
          offset: 14,
          closeButton: false,
          className: 'pointer-events-none',
        }).setHTML(
          `<div class="p-1.5 text-xs pointer-events-none"><strong class="text-blue-700">Bãi xe trung tâm</strong><br/><span class="text-slate-500">${parkingLocation.addressText || ''}</span></div>`,
        );

        depotEl.addEventListener('mouseenter', () => popup.addTo(map));
        depotEl.addEventListener('mouseleave', () => popup.remove());
        depotEl.addEventListener('click', (e) => {
          e.stopPropagation();
          map.flyTo({ center: [parkingLocation.longitude, parkingLocation.latitude], zoom: 15.5, duration: 600 });
        });

        const marker = new maplibregl.Marker({ element: depotEl })
          .setLngLat([parkingLocation.longitude, parkingLocation.latitude])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
        bounds.extend([parkingLocation.longitude, parkingLocation.latitude]);
        hasCoordinates = true;
      }

      // 3. Add School Marker (Static, no scale animation)
      if (schoolLocation && schoolLocation.latitude && schoolLocation.longitude) {
        const schoolEl = document.createElement('div');
        schoolEl.className =
          'w-8 h-8 rounded-full bg-[#FFCB56] text-[#1E293B] flex items-center justify-center shadow-md border-2 border-white text-xs font-black cursor-pointer select-none';
        schoolEl.innerHTML = '🏫';
        schoolEl.title = schoolLocation.name || 'Trường học';

        const popup = new maplibregl.Popup({
          offset: 16,
          closeButton: false,
          className: 'pointer-events-none',
        }).setHTML(
          `<div class="p-1.5 text-xs pointer-events-none"><strong class="text-amber-800">Trường học</strong><br/><span class="text-slate-700">${schoolLocation.name || ''}</span></div>`,
        );

        schoolEl.addEventListener('mouseenter', () => popup.addTo(map));
        schoolEl.addEventListener('mouseleave', () => popup.remove());
        schoolEl.addEventListener('click', (e) => {
          e.stopPropagation();
          map.flyTo({ center: [schoolLocation.longitude, schoolLocation.latitude], zoom: 15.5, duration: 600 });
        });

        const marker = new maplibregl.Marker({ element: schoolEl })
          .setLngLat([schoolLocation.longitude, schoolLocation.latitude])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
        bounds.extend([schoolLocation.longitude, schoolLocation.latitude]);
        hasCoordinates = true;
      }

      // 4. Add Student Points (Static Markers, Selected Only)
      points.forEach((pt) => {
        if (!pt.latitude || !pt.longitude) return;

        const isNumbered = typeof pt.order === 'number';
        const el = document.createElement('div');
        el.className = isNumbered
          ? 'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-xs cursor-pointer select-none bg-emerald-600 text-white'
          : 'w-4 h-4 rounded-full bg-emerald-600 border-2 border-white shadow-xs cursor-pointer select-none';

        if (isNumbered) {
          el.innerText = String(pt.order);
        }

        const tooltipContent = `
          <div class="p-2 text-xs font-sans min-w-[140px] pointer-events-none">
            <p class="font-bold text-slate-900">${pt.title}</p>
            ${pt.eta ? `<p class="text-emerald-600 font-semibold mt-0.5">Dự kiến: ${pt.eta}</p>` : ''}
            ${pt.subtitle ? `<p class="text-slate-500 text-[11px] mt-0.5 truncate max-w-[200px]">${pt.subtitle}</p>` : ''}
          </div>
        `;

        const popup = new maplibregl.Popup({
          offset: 12,
          closeButton: false,
          className: 'pointer-events-none',
        }).setHTML(tooltipContent);

        el.addEventListener('mouseenter', () => popup.addTo(map));
        el.addEventListener('mouseleave', () => popup.remove());
        if (onPointClick) {
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            onPointClick(pt);
          });
        }

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([pt.longitude, pt.latitude])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
        bounds.extend([pt.longitude, pt.latitude]);
        hasCoordinates = true;
      });

      // 5. Add or Update Polyline Layer (Real Road Geometry)
      const polylineSourceId = 'route-polyline-source';
      const polylineLayerId = 'route-polyline-layer';

      if (polylineGeometry && recordedTrack === undefined) {
        const coordinates = decodePolyline(polylineGeometry);
        coordinates.forEach((coord) => bounds.extend(coord));
        hasCoordinates = true;

        const geojsonData: any = {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates,
          },
        };

        if (map.getSource(polylineSourceId)) {
          map.getSource(polylineSourceId).setData(geojsonData);
        } else {
          map.addSource(polylineSourceId, {
            type: 'geojson',
            data: geojsonData,
          });

          map.addLayer({
            id: polylineLayerId,
            type: 'line',
            source: polylineSourceId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#2563EB',
              'line-width': 5,
              'line-opacity': 0.85,
            },
          });
        }
      } else {
        if (map.getLayer(polylineLayerId)) {
          map.removeLayer(polylineLayerId);
        }
        if (map.getSource(polylineSourceId)) {
          map.removeSource(polylineSourceId);
        }
      }

      // 6. Only fitBounds automatically on first load or when polylineGeometry changes
      const polylineChanged = lastPolylineRef.current !== polylineGeometry;
      lastPolylineRef.current = polylineGeometry;

      if (hasCoordinates && (!hasFitInitialBoundsRef.current || polylineChanged)) {
        hasFitInitialBoundsRef.current = true;
        try {
          map.fitBounds(bounds, {
            padding: { top: 50, bottom: 50, left: 50, right: 50 },
            maxZoom: 15,
            duration: 800,
          });
        } catch {
          // ignore single point fit bounds
        }
      }
    });
  }, [schoolLocation, parkingLocation, points, polylineGeometry, mapLoaded, onPointClick, recordedTrack]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;
    let cancelled = false;
    if (!vehiclePosition) { vehicleMarkerRef.current?.remove(); vehicleMarkerRef.current = null; return; }
    void import('maplibre-gl').then(module => {
      if (cancelled) return;
      const maplibre = (module as typeof module & { default?: typeof module }).default ?? module;
      if (!vehicleMarkerRef.current) {
        const el = document.createElement('div');
        el.textContent = '🚌'; el.title = 'Vị trí xe';
        el.className = 'rounded-full bg-white border-2 border-amber-400 p-1 text-xl shadow-md';
        vehicleMarkerRef.current = new maplibre.Marker({ element: el }).setLngLat([vehiclePosition.longitude, vehiclePosition.latitude]).addTo(map);
      } else vehicleMarkerRef.current.setLngLat([vehiclePosition.longitude, vehiclePosition.latitude]);
    });
    return () => { cancelled = true; };
  }, [vehiclePosition, mapLoaded]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;
    const id = 'trip-recorded-history';
    const data = { type: 'FeatureCollection', features: (recordedTrack ?? []).filter(p => p.length).map(part => ({
      type: 'Feature', properties: {}, geometry: part.length === 1
        ? { type: 'Point', coordinates: [part[0].longitude, part[0].latitude] }
        : { type: 'LineString', coordinates: part.map(p => [p.longitude, p.latitude]) },
    })) };
    if (map.getSource(id)) map.getSource(id).setData(data);
    else {
      map.addSource(id, { type: 'geojson', data });
      map.addLayer({ id, source: id, type: 'line', filter: ['==', '$type', 'LineString'], paint: { 'line-color': '#059669', 'line-width': 5 } });
      map.addLayer({ id: id + '-points', source: id, type: 'circle', filter: ['==', '$type', 'Point'], paint: { 'circle-color': '#059669', 'circle-radius': 5 } });
    }
  }, [recordedTrack, mapLoaded]);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 ${className}`}>
      <div ref={mapContainerRef} style={{ width: '100%', height }} />
      {mapLoaded && vehiclePosition && <button type="button" className="absolute top-14 left-3 bg-white rounded-xl px-3 py-2 text-xs shadow-md"
        onClick={() => mapInstanceRef.current?.flyTo({ center: [vehiclePosition.longitude, vehiclePosition.latitude], duration: 500 })}>Theo xe</button>}

      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 bg-slate-100/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
          <SpinnerIcon className="w-6 h-6 animate-spin text-[#FFCB56]" />
          <span>Đang tải bản đồ VietMap...</span>
        </div>
      )}

      {mapError && (
        <div className="absolute inset-0 bg-rose-50/90 flex flex-col items-center justify-center p-4 text-center">
          <p className="text-xs text-rose-700 font-semibold">{mapError}</p>
        </div>
      )}

      {/* Fit All Button */}
      {mapLoaded && (
        <button
          onClick={handleFitAll}
          type="button"
          title="Xem toàn bộ các điểm trên bản đồ"
          className="absolute top-3 left-3 bg-white/95 hover:bg-white text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl shadow-md border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span>🎯</span>
          <span>Xem toàn cảnh</span>
        </button>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs rounded-xl shadow-md border border-slate-200 p-2 text-[11px] text-slate-700 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
          <span>Bãi xe</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FFCB56] border border-amber-500 inline-block"></span>
          <span>Trường học</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
          <span>Học sinh</span>
        </div>
      </div>
    </div>
  );
}
