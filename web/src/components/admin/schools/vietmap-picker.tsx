'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { vietmapService } from '@/lib/vietmap/vietmap.service';
import { MapPinIcon, SpinnerIcon, AlertIcon, CheckIcon } from '@/components/icons';
import { Tooltip } from './tooltip';
import 'maplibre-gl/dist/maplibre-gl.css';

interface VietMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChangeCoordinates: (lat: number, lng: number) => void;
  onAddressSelect?: (address: string) => void;
  disabled?: boolean;
}

// Tọa độ mặc định viewport (TP. Hồ Chí Minh) - chỉ dùng làm tâm ban đầu cho khung nhìn bản đồ
const DEFAULT_VIEW_LAT = 10.776889;
const DEFAULT_VIEW_LNG = 106.700806;

type MapStatus = 'INITIALIZING' | 'LOADING' | 'READY' | 'ERROR';

export function VietMapPicker({
  latitude,
  longitude,
  onChangeCoordinates,
  onAddressSelect,
  disabled = false,
}: VietMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [mapStatus, setMapStatus] = useState<MapStatus>('INITIALIZING');
  const [mapError, setMapError] = useState<string | null>(null);
  const [isReversing, setIsReversing] = useState(false);
  const [retryCounter, setRetryCounter] = useState(0);

  const tilemapKey = process.env.NEXT_PUBLIC_VIETMAP_TILEMAP_KEY || '';

  // Reverse geocode khi di chuyển marker hoặc click map
  const handleReverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      if (!onAddressSelect) return;
      try {
        setIsReversing(true);
        const results = await vietmapService.reverseGeocode(lat, lng);
        if (results && results.length > 0 && results[0].addressText) {
          onAddressSelect(results[0].addressText);
        }
      } catch (err: any) {
        console.warn('Reverse geocode warning:', err?.message);
      } finally {
        setIsReversing(false);
      }
    },
    [onAddressSelect],
  );

  // Khởi tạo MapLibre GL
  useEffect(() => {
    let isMounted = true;
    let loadTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let resizeObserver: ResizeObserver | null = null;

    async function initMap() {
      if (!mapContainerRef.current) return;

      try {
        setMapStatus('LOADING');
        setMapError(null);

        if (!tilemapKey) {
          setMapStatus('ERROR');
          setMapError('Chưa cấu hình NEXT_PUBLIC_VIETMAP_TILEMAP_KEY.');
          return;
        }

        const maplibreModule = await import('maplibre-gl');
        const maplibregl: any = (maplibreModule as any).default || maplibreModule;

        // Cấu hình Worker URL chính thức cho Next.js / Turbopack
        if (typeof maplibregl.setWorkerUrl === 'function') {
          maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
        }

        const centerLng = longitude ?? DEFAULT_VIEW_LNG;
        const centerLat = latitude ?? DEFAULT_VIEW_LAT;

        // Vector Default Street Style chính thức của VietMap (tm)
        const officialStyleUrl = `https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=${tilemapKey}`;

        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: officialStyleUrl,
          center: [centerLng, centerLat],
          zoom: latitude !== null && longitude !== null ? 15 : 12,
          transformRequest: (url: string) => {
            if (url.includes('vietmap.vn') && !url.includes('apikey=')) {
              const separator = url.includes('?') ? '&' : '?';
              return { url: `${url}${separator}apikey=${tilemapKey}` };
            }
            return { url };
          },
        });

        // Tự động resize khi modal hoặc container thay đổi kích thước DOM
        if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
          resizeObserver = new ResizeObserver(() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.resize();
            }
          });
          resizeObserver.observe(mapContainerRef.current);
        }

        // Navigation controls
        map.addControl(new maplibregl.NavigationControl(), 'top-right');

        // Tạo marker nếu đã có tọa độ hoặc khi người dùng click
        const hasCoords = latitude !== null && longitude !== null;
        const marker = new maplibregl.Marker({
          color: '#FFCB56',
          draggable: !disabled,
        });

        if (hasCoords) {
          marker.setLngLat([centerLng, centerLat]).addTo(map);
        }

        // Marker Drag End event
        marker.on('dragend', () => {
          const lngLat = marker.getLngLat();
          const newLat = Number(lngLat.lat.toFixed(6));
          const newLng = Number(lngLat.lng.toFixed(6));
          onChangeCoordinates(newLat, newLng);
          handleReverseGeocode(newLat, newLng);
        });

        // Click trên bản đồ để đặt marker
        map.on('click', (e: any) => {
          if (disabled) return;
          const newLat = Number(e.lngLat.lat.toFixed(6));
          const newLng = Number(e.lngLat.lng.toFixed(6));

          // Đảm bảo marker đã được add vào map
          marker.setLngLat([newLng, newLat]);
          if (!marker.getElement().parentElement) {
            marker.addTo(map);
          }

          onChangeCoordinates(newLat, newLng);
          handleReverseGeocode(newLat, newLng);
        });

        // Xác thực Style JSON và các layers thực tế
        map.on('style.load', () => {
          if (!isMounted) return;
          const currentStyle = map.getStyle();
          if (!currentStyle || !currentStyle.layers || currentStyle.layers.length === 0) {
            setMapStatus('ERROR');
            setMapError('Style bản đồ VietMap không hợp lệ (không tìm thấy lớp dữ liệu hiển thị).');
          }
        });

        // Đánh dấu READY khi bản đồ và tiles tải thành công
        map.on('load', () => {
          if (isMounted) {
            if (loadTimeoutId) clearTimeout(loadTimeoutId);
            setMapStatus('READY');
            map.resize();
          }
        });

        map.on('error', (e: any) => {
          console.warn('MapLibre error:', e);
          if (isMounted && mapStatus !== 'READY') {
            if (e?.error?.status === 401 || e?.status === 401) {
              setMapStatus('ERROR');
              setMapError('Khóa bản đồ VietMap (NEXT_PUBLIC_VIETMAP_TILEMAP_KEY) không hợp lệ hoặc hết hạn.');
            } else if (e?.error?.status === 403 || e?.status === 403) {
              setMapStatus('ERROR');
              setMapError('Khóa bản đồ VietMap bị giới hạn domain hoặc quyền truy cập (403 Forbidden).');
            }
          }
        });

        // Timeout safeguard phòng ngừa trường hợp mạng bị treo vô hạn
        loadTimeoutId = setTimeout(() => {
          if (isMounted && mapStatus !== 'READY') {
            setMapStatus('ERROR');
            setMapError('Không thể tải bản đồ nền VietMap. Vui lòng kiểm tra kết nối mạng và bấm Thử lại.');
          }
        }, 15000);

        mapInstanceRef.current = map;
        markerRef.current = marker;
      } catch (err: any) {
        if (isMounted) {
          setMapStatus('ERROR');
          setMapError('Lỗi khởi tạo bản đồ: ' + (err?.message || 'Không xác định'));
        }
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (loadTimeoutId) clearTimeout(loadTimeoutId);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markerRef.current = null;
    };
  }, [retryCounter]); // Re-run only when retryCounter triggers

  // Đồng bộ vị trí Marker khi coordinates thay đổi từ ngoài (ví dụ từ Autocomplete)
  useEffect(() => {
    if (
      latitude !== null &&
      longitude !== null &&
      mapInstanceRef.current &&
      markerRef.current
    ) {
      markerRef.current.setLngLat([longitude, latitude]);
      if (!markerRef.current.getElement()?.parentElement) {
        markerRef.current.addTo(mapInstanceRef.current);
      }
      mapInstanceRef.current.flyTo({
        center: [longitude, latitude],
        zoom: 15,
        essential: true,
      });
      // Gọi resize đề phòng container vừa xuất hiện
      mapInstanceRef.current.resize();
    }
  }, [latitude, longitude]);

  const hasLocation = latitude !== null && longitude !== null;

  return (
    <div className="space-y-2">
      {/* Header bar: Label + Tooltip + Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <MapPinIcon className="w-3.5 h-3.5 text-amber-500" />
            <span>Vị trí trên bản đồ</span>
          </label>
          <Tooltip content="Nhấp vào bản đồ hoặc kéo ghim để chọn vị trí trường học chính xác." />
        </div>

        {/* Trạng thái vị trí (ẩn tọa độ số) */}
        <div className="flex items-center gap-2">
          {isReversing && (
            <span className="text-[11px] text-amber-600 flex items-center gap-1">
              <SpinnerIcon className="w-3 h-3 animate-spin" />
              <span>Đang tra địa chỉ...</span>
            </span>
          )}
          {hasLocation ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckIcon className="w-3 h-3 text-emerald-600" />
              <span>Đã xác định vị trí</span>
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 italic">
              Chưa chọn vị trí
            </span>
          )}
        </div>
      </div>

      {/* Error state with retry */}
      {mapError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between gap-2">
          <div className="flex items-start gap-2">
            <AlertIcon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{mapError}</span>
          </div>
          <button
            type="button"
            onClick={() => setRetryCounter((c) => c + 1)}
            className="px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-900 text-xs font-semibold cursor-pointer shrink-0"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Map container */}
      <div className="relative w-full h-56 sm:h-64 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Loading overlay */}
        {mapStatus === 'LOADING' && !mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 backdrop-blur-2xs z-10">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <SpinnerIcon className="w-4 h-4 animate-spin text-amber-500" />
              <span>Đang tải bản đồ VietMap...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
