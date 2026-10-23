/**
 * VietMap REST API Client for Mobile (React Native / Expo)
 * Direct client-side calls to VietMap REST endpoints.
 * Sourced strictly from environment variables without hardcoded fallback keys.
 */

const VIETMAP_BASE_URL = 'https://maps.vietmap.vn/api';

function getVietmapServicesKey(): string {
  return (
    process.env.EXPO_PUBLIC_VIETMAP_API_KEY ||
    process.env.EXPO_PUBLIC_VIETMAP_SERVICES_KEY ||
    ''
  );
}

export interface MobileVietmapSuggestion {
  refId: string;
  name: string;
  address: string;
  display: string;
}

export interface MobileVietmapPlaceDetail {
  latitude: number;
  longitude: number;
  addressText: string;
  display: string;
  name?: string;
}

export interface MobileVietmapReverseResult {
  latitude: number;
  longitude: number;
  addressText: string;
  display: string;
  name?: string;
}

export class MobileVietmapService {
  private baseUrl: string;

  constructor(baseUrl = VIETMAP_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private getApiKey(): string {
    const key = getVietmapServicesKey();
    if (!key) {
      console.warn('VietMap Services API Key is not configured in environment.');
    }
    return key;
  }

  /**
   * Autocomplete search suggestions (minimum 2 characters)
   */
  async autocomplete(text: string): Promise<MobileVietmapSuggestion[]> {
    if (!text || text.trim().length < 2) return [];

    const apiKey = this.getApiKey();
    if (!apiKey) return [];

    const query = text.trim();
    const url = `${this.baseUrl}/autocomplete/v4?apikey=${encodeURIComponent(
      apiKey
    )}&text=${encodeURIComponent(query)}&display_type=5`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      if (!Array.isArray(data)) return [];

      return data.map((item: any) => ({
        refId: String(item.ref_id || ''),
        display: String(item.display || ''),
        name: String(item.name || ''),
        address: String(item.address || item.display || item.name || ''),
      }));
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('VietMap mobile autocomplete error:', err?.message || err);
      }
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch Place Details from refId to get latitude and longitude
   */
  async getPlaceDetail(refId: string): Promise<MobileVietmapPlaceDetail | null> {
    if (!refId || !refId.trim()) return null;

    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    const url = `${this.baseUrl}/place/v4?apikey=${encodeURIComponent(
      apiKey
    )}&refid=${encodeURIComponent(refId.trim())}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) return null;

      const data = await response.json();
      if (!data || typeof data !== 'object') return null;

      const lat = typeof data.lat === 'number' ? data.lat : parseFloat(data.lat);
      const lng = typeof data.lng === 'number' ? data.lng : parseFloat(data.lng);

      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return null;
      }

      return {
        latitude: lat,
        longitude: lng,
        addressText: String(data.address || data.display || data.name || ''),
        display: String(data.display || ''),
        name: data.name ? String(data.name) : undefined,
      };
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('VietMap mobile place detail error:', err?.message || err);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Reverse Geocoding from coordinates (lat, lng) to address text
   */
  async reverseGeocode(lat: number, lng: number): Promise<MobileVietmapReverseResult[]> {
    if (
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return [];
    }

    const apiKey = this.getApiKey();
    if (!apiKey) return [];

    const url = `${this.baseUrl}/reverse/v4?apikey=${encodeURIComponent(
      apiKey
    )}&lat=${lat}&lng=${lng}&display_type=5`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) return [];

      const data = await response.json();
      if (!Array.isArray(data)) return [];

      return data.map((item: any) => ({
        latitude: lat,
        longitude: lng,
        addressText: String(item.display || item.address || item.name || ''),
        display: String(item.display || ''),
        name: item.name ? String(item.name) : undefined,
      }));
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('VietMap mobile reverse geocode error:', err?.message || err);
      }
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const mobileVietmapService = new MobileVietmapService();
