import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import {
  VIETMAP_STYLES,
  VietMapStyleKey,
  DEFAULT_VIETMAP_STYLE,
} from '@/constants/vietmap-styles';

interface VietMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
  disabled?: boolean;
  height?: number;
}

// Tọa độ mặc định viewport (TP. Hồ Chí Minh) nếu chưa có tọa độ
const DEFAULT_CENTER_LAT = 10.776889;
const DEFAULT_CENTER_LNG = 106.700806;

export function VietMapPicker({
  latitude,
  longitude,
  onLocationSelect,
  disabled = false,
  height = 280,
}: VietMapPickerProps) {
  const webViewRef = useRef<WebView | null>(null);

  const [currentStyle, setCurrentStyle] = useState<VietMapStyleKey>(DEFAULT_VIETMAP_STYLE);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isTilesLoaded, setIsTilesLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const tileApiKey =
    process.env.EXPO_PUBLIC_VIETMAP_TILE_API_KEY ||
    process.env.EXPO_PUBLIC_VIETMAP_TILEMAP_KEY ||
    '';

  const initialLat = latitude ?? DEFAULT_CENTER_LAT;
  const initialLng = longitude ?? DEFAULT_CENTER_LNG;
  const hasCoords = latitude !== null && longitude !== null;

  // Cập nhật marker trên Map khi tọa độ thay đổi từ bên ngoài (ví dụ: người dùng chọn từ gợi ý tìm kiếm)
  useEffect(() => {
    if (isMapReady && latitude !== null && longitude !== null && webViewRef.current) {
      const script = `if (window.updateMapLocation) { window.updateMapLocation(${latitude}, ${longitude}); } true;`;
      webViewRef.current.injectJavaScript(script);
    }
  }, [latitude, longitude, isMapReady]);

  // Đổi Map Style trực tiếp trong Map instance hiện có
  const handleChangeStyle = (styleKey: VietMapStyleKey) => {
    if (styleKey === currentStyle) return;
    setCurrentStyle(styleKey);

    const targetUrl = VIETMAP_STYLES[styleKey].url;
    if (isMapReady && webViewRef.current) {
      const script = `if (window.changeMapStyle) { window.changeMapStyle("${targetUrl}"); } true;`;
      webViewRef.current.injectJavaScript(script);
    }
  };

  // Xử lý các tin nhắn từ WebView Bridge
  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const rawData = event.nativeEvent.data;
        if (!rawData) return;
        const data = JSON.parse(rawData);

        switch (data.type) {
          case 'MAP_READY':
            setIsMapReady(true);
            setMapError(null);
            break;

          case 'TILES_LOADED':
            setIsTilesLoaded(true);
            setMapError(null);
            break;

          case 'LOCATION_SELECTED': {
            const lat = Number(data.latitude);
            const lng = Number(data.longitude);
            if (
              !isNaN(lat) &&
              !isNaN(lng) &&
              lat >= -90 &&
              lat <= 90 &&
              lng >= -180 &&
              lng <= 180
            ) {
              onLocationSelect(lat, lng);
            }
            break;
          }

          case 'MAP_ERROR':
            setMapError(data.message || 'Lỗi tải bản đồ VietMap.');
            break;

          default:
            break;
        }
      } catch (err: any) {
        console.warn('WebView postMessage error:', err);
      }
    },
    [onLocationSelect]
  );

  if (!tileApiKey) {
    return (
      <View style={[styles.container, { height }, styles.errorContainer]}>
        <Ionicons name="warning-outline" size={32} color="#DC2626" />
        <Text style={styles.errorTitle}>Chưa cấu hình VietMap Tile Key</Text>
        <Text style={styles.errorSubtext}>
          Vui lòng thêm EXPO_PUBLIC_VIETMAP_TILE_API_KEY vào tệp .env.local để hiển thị bản đồ.
        </Text>
      </View>
    );
  }

  const initialStyleUrl = VIETMAP_STYLES[currentStyle].url;

  // HTML Template nhúng MapLibre GL JS kèm bộ giải mã Vector Tile VietMap
  const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: #F8FAFC;
    }
    #map {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      width: 100%;
      height: 100%;
    }
    .maplibregl-ctrl-attrib {
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    (function() {
      var tileKey = ${JSON.stringify(tileApiKey)};
      var initialStyle = ${JSON.stringify(initialStyleUrl)};
      var initialLng = ${initialLng};
      var initialLat = ${initialLat};
      var hasMarker = ${hasCoords ? 'true' : 'false'};
      var disabled = ${disabled ? 'true' : 'false'};

      function sendToApp(payload) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }

      function buildStyleUrl(url) {
        var sep = url.indexOf('?') !== -1 ? '&' : '?';
        return url + sep + 'apikey=' + encodeURIComponent(tileKey);
      }

      // Khởi tạo Custom MapLibre Worker giải mã Vector Tile VietMap (XOR Key 32-byte)
      try {
        var workerBootstrap = [
          'var XOR_KEY = [1, 2, 3, 5, 7, 9, 15, 60, 45, 95, 45, 69, 78, 42, 66, 54, 99, 57, 54, 33, 22, 11, 66, 99, 99, 77, 55, 23, 45, 65, 72, 35];',
          'function unmaskBuffer(buf) {',
          '  if (!buf) return buf;',
          '  var u = new Uint8Array(buf);',
          '  if (u.length >= 3 && u[0] === 1 && u[1] === 1 && u[2] === 1) {',
          '    var out = new Uint8Array(buf.byteLength - 3);',
          '    for (var i = 3; i < u.length; i++) {',
          '      out[i - 3] = u[i] ^ XOR_KEY[(i - 3) % 32];',
          '    }',
          '    return out.buffer;',
          '  }',
          '  return buf;',
          '}',
          'if (typeof self.fetch === "function") {',
          '  var _origFetch = self.fetch;',
          '  self.fetch = function(input, init) {',
          '    return _origFetch(input, init).then(function(res) {',
          '      var _origArrayBuffer = res.arrayBuffer.bind(res);',
          '      res.arrayBuffer = function() {',
          '        return _origArrayBuffer().then(function(buf) {',
          '          return unmaskBuffer(buf);',
          '        });',
          '      };',
          '      return res;',
          '    });',
          '  };',
          '}',
          'if (typeof self.XMLHttpRequest !== "undefined") {',
          '  var _OrigXHR = self.XMLHttpRequest;',
          '  self.XMLHttpRequest = function() {',
          '    var xhr = new _OrigXHR();',
          '    var _send = xhr.send.bind(xhr);',
          '    xhr.send = function() {',
          '      xhr.addEventListener("readystatechange", function() {',
          '        if (xhr.readyState === 4 && xhr.response && xhr.response instanceof ArrayBuffer) {',
          '          try {',
          '            var decoded = unmaskBuffer(xhr.response);',
          '            Object.defineProperty(xhr, "response", { value: decoded, configurable: true });',
          '          } catch(e) {}',
          '        }',
          '      });',
          '      return _send.apply(xhr, arguments);',
          '    };',
          '    return xhr;',
          '  };',
          '}',
          'try {',
          '  importScripts("https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl-csp-worker.js");',
          '} catch(e1) {',
          '  try {',
          '    importScripts("https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl-csp-worker.js");',
          '  } catch(e2) {',
          '    console.error("Worker load failed:", e2);',
          '  }',
          '}'
        ].join('\\n');

        var workerBlob = new Blob([workerBootstrap], { type: 'application/javascript' });
        var workerBlobUrl = URL.createObjectURL(workerBlob);
        maplibregl.setWorkerUrl(workerBlobUrl);
      } catch (err) {
        console.warn('Worker bootstrap warning:', err);
      }

      var map;
      var marker;

      try {
        map = new maplibregl.Map({
          container: 'map',
          style: buildStyleUrl(initialStyle),
          center: [initialLng, initialLat],
          zoom: hasMarker ? 15 : 12,
          transformRequest: function(url, resourceType) {
            if (url.indexOf('vietmap.vn') !== -1 && url.indexOf('apikey=') === -1) {
              var sep = url.indexOf('?') !== -1 ? '&' : '?';
              return { url: url + sep + 'apikey=' + encodeURIComponent(tileKey) };
            }
            return { url: url };
          }
        });

        marker = new maplibregl.Marker({
          color: '#FFCB56',
          draggable: !disabled
        });

        if (hasMarker) {
          marker.setLngLat([initialLng, initialLat]).addTo(map);
        }

        map.on('load', function() {
          map.resize();
          setTimeout(function() { map.resize(); }, 120);
          sendToApp({ type: 'MAP_READY' });
        });

        // Xác nhận dữ liệu vector tile (openmaptiles) đã nạp thành công
        map.on('sourcedata', function(e) {
          if (e.sourceId === 'openmaptiles' && e.isSourceLoaded) {
            sendToApp({ type: 'TILES_LOADED' });
          }
        });

        map.on('error', function(e) {
          if (e && e.error && (e.error.status === 401 || e.error.status === 403)) {
            sendToApp({ type: 'MAP_ERROR', message: 'Khóa VietMap Tile Key không hợp lệ hoặc không có quyền nạp tile' });
          }
        });

        if (!disabled) {
          // Click chọn vị trí
          map.on('click', function(e) {
            var lng = e.lngLat.lng;
            var lat = e.lngLat.lat;
            marker.setLngLat([lng, lat]).addTo(map);
            sendToApp({
              type: 'LOCATION_SELECTED',
              latitude: lat,
              longitude: lng
            });
          });

          // Kéo thả marker
          marker.on('dragend', function() {
            var lngLat = marker.getLngLat();
            sendToApp({
              type: 'LOCATION_SELECTED',
              latitude: lngLat.lat,
              longitude: lngLat.lng
            });
          });
        }

        // Exposed global functions for React Native calls
        window.updateMapLocation = function(lat, lng) {
          if (!map) return;
          marker.setLngLat([lng, lat]).addTo(map);
          map.flyTo({ center: [lng, lat], zoom: 15 });
        };

        window.changeMapStyle = function(newStyleUrl) {
          if (!map) return;
          map.setStyle(buildStyleUrl(newStyleUrl), { diff: true });
        };

      } catch (err) {
        sendToApp({ type: 'MAP_ERROR', message: err.message || 'Không thể khởi tạo bản đồ' });
      }
    })();
  </script>
</body>
</html>
  `;

  const RWebView: any = WebView;

  return (
    <View style={[styles.container, { height }]}>
      {/* WebView Map Instance */}
      <RWebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{
          html: mapHtml,
          baseUrl: 'https://maps.vietmap.vn',
        }}
        style={styles.webView}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        allowUniversalAccessFromFileURLs={true}
        androidHardwareAccelerationDisabled={false}
        androidLayerType="hardware"
        mixedContentMode="always"
        onMessage={handleMessage}
      />

      {/* Loading overlay */}
      {!isMapReady && !mapError && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#1E293B" />
          <Text style={styles.loadingText}>Đang tải bản đồ VietMap...</Text>
        </View>
      )}

      {/* Map Error Overlay */}
      {mapError && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color="#DC2626" />
          <Text style={styles.errorBannerText}>{mapError}</Text>
        </View>
      )}

      {/* Map Style Selector Overlay (Góc trên bên phải) */}
      <View style={styles.styleSelectorOverlay}>
        {(Object.keys(VIETMAP_STYLES) as VietMapStyleKey[]).map((key) => {
          const isSelected = currentStyle === key;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.styleOptionButton,
                isSelected && styles.styleOptionButtonActive,
              ]}
              onPress={() => handleChangeStyle(key)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.styleOptionText,
                  isSelected && styles.styleOptionTextActive,
                ]}
              >
                {VIETMAP_STYLES[key].label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Map Tap Guide Tip */}
      <View style={styles.guideBadge}>
        <Ionicons name="finger-print-outline" size={12} color="#475569" />
        <Text style={styles.guideText}>Chạm hoặc kéo ghim để chọn vị trí</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(248, 250, 252, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FEF2F2',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: 8,
  },
  errorSubtext: {
    fontSize: 12,
    color: '#991B1B',
    textAlign: 'center',
    marginTop: 4,
  },
  errorBanner: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    zIndex: 20,
    gap: 6,
  },
  errorBannerText: {
    fontSize: 11,
    color: '#991B1B',
    flex: 1,
  },
  styleSelectorOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 20,
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 15,
  },
  styleOptionButton: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 16,
  },
  styleOptionButtonActive: {
    backgroundColor: colors.primary,
  },
  styleOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  styleOptionTextActive: {
    color: '#1E293B',
    fontWeight: '700',
  },
  guideBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    zIndex: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  guideText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
});
