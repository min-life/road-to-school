import type {
  VietmapSuggestion,
  VietmapPlaceDetail,
  VietmapReverseResult,
  VietmapAutocompleteOptions,
  VietmapRequestOptions,
} from './types.ts';
import { VietmapApiError } from './types.ts';

const VIETMAP_BASE_URL = 'https://maps.vietmap.vn/api';
const DEFAULT_TIMEOUT_MS = 5000;

export interface VietmapConfig {
  servicesApiKey?: string;
  baseUrl?: string;
}

export class VietmapService {
  private servicesApiKey: string;
  private baseUrl: string;

  constructor(config?: VietmapConfig) {
    this.servicesApiKey =
      config?.servicesApiKey ??
      process.env.NEXT_PUBLIC_VIETMAP_SERVICES_KEY ??
      '';
    this.baseUrl = config?.baseUrl ?? VIETMAP_BASE_URL;
  }

  /**
   * Cập nhật API Key khi cấu hình thay đổi trong ứng dụng
   */
  setApiKey(key: string): void {
    this.servicesApiKey = key;
  }

  /**
   * Lấy API Key hiện tại
   */
  getApiKey(): string {
    return this.servicesApiKey;
  }

  /**
   * Đảm bảo API Key đã được cấu hình trước khi thực hiện request
   */
  private ensureApiKey(): string {
    if (!this.servicesApiKey || !this.servicesApiKey.trim()) {
      throw new VietmapApiError(
        'MISSING_API_KEY',
        'Dịch vụ tìm kiếm bản đồ VietMap chưa được cấu hình khóa truy cập (NEXT_PUBLIC_VIETMAP_SERVICES_KEY).',
      );
    }
    return this.servicesApiKey.trim();
  }

  /**
   * Helper thực hiện fetch với timeout và xử lý lỗi mạng / CORS
   */
  private async executeFetch(
    url: string,
    options?: VietmapRequestOptions,
  ): Promise<Response> {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // Lắng nghe signal bên ngoài nếu có
    if (options?.signal) {
      if (options.signal.aborted) {
        controller.abort();
      } else {
        options.signal.addEventListener('abort', () => controller.abort(), {
          once: true,
        });
      }
    }

    timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      return response;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        if (options?.signal?.aborted) {
          throw err; // Bị hủy bởi caller (chuyển sang gõ phím mới)
        }
        throw new VietmapApiError(
          'NETWORK_TIMEOUT',
          `Yêu cầu kết nối đến VietMap đã hết thời gian chờ (${timeoutMs}ms).`,
        );
      }
      throw new VietmapApiError(
        'NETWORK_ERROR',
        'Không thể kết nối đến máy chủ VietMap hoặc bị chặn bởi chính sách CORS trình duyệt.',
      );
    } finally {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Gợi ý địa chỉ Autocomplete v4 theo thời gian thực khi người dùng gõ
   * - Tối thiểu 2 ký tự mới gọi API.
   * - Hỗ trợ focus tọa độ người dùng để ưu tiên kết quả gần.
   * - Giữ nguyên ref_id nguyên vẹn để dùng cho Place v4.
   */
  async autocomplete(
    text: string,
    options?: VietmapAutocompleteOptions,
  ): Promise<VietmapSuggestion[]> {
    if (!text || text.trim().length < 2) {
      return [];
    }

    const apiKey = this.ensureApiKey();
    const query = text.trim();
    const displayType = options?.displayType ?? 5;

    let url = `${this.baseUrl}/autocomplete/v4?apikey=${encodeURIComponent(apiKey)}&text=${encodeURIComponent(query)}&display_type=${displayType}`;

    if (options?.focus) {
      url += `&focus=${options.focus.lat},${options.focus.lng}`;
    }

    const res = await this.executeFetch(url, options);

    if (res.status === 401) {
      throw new VietmapApiError(
        'UNAUTHORIZED',
        'Khóa truy cập VietMap không hợp lệ hoặc đã hết hạn.',
        401,
      );
    }

    if (res.status === 423 || res.status === 429) {
      throw new VietmapApiError(
        'RATE_LIMITED',
        'Đã vượt quá giới hạn lượt truy vấn VietMap hoặc tài khoản tạm khóa.',
        res.status,
      );
    }

    if (!res.ok) {
      throw new VietmapApiError(
        'UPSTREAM_ERROR',
        `Dịch vụ bản đồ VietMap phản hồi lỗi (HTTP ${res.status}).`,
        res.status,
      );
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .filter((item: any) => item && typeof item.ref_id === 'string' && item.ref_id.trim().length > 0)
      .map((item: any): VietmapSuggestion => ({
        refId: item.ref_id,
        display: item.display || item.name || item.address || '',
        name: item.name || '',
        address: item.address || '',
        distance: typeof item.distance === 'number' ? item.distance : undefined,
      }));
  }

  /**
   * Lấy tọa độ và chi tiết địa điểm Place v4 từ ref_id của Autocomplete v4
   * - Bắt buộc giữ nguyên ref_id đầy đủ có prefix auto: hoặc geocode:.
   * - Kiểm tra nghiêm ngặt kiểu số và giới hạn hợp lệ của Latitude / Longitude.
   */
  async getPlaceDetail(
    refId: string,
    options?: VietmapRequestOptions,
  ): Promise<VietmapPlaceDetail> {
    if (!refId || !refId.trim()) {
      throw new VietmapApiError(
        'INVALID_INPUT',
        'Mã tham chiếu địa điểm (ref_id) không được để trống.',
      );
    }

    const apiKey = this.ensureApiKey();
    const cleanRefId = refId.trim();
    const url = `${this.baseUrl}/place/v4?apikey=${encodeURIComponent(apiKey)}&refid=${encodeURIComponent(cleanRefId)}`;

    const res = await this.executeFetch(url, options);

    if (res.status === 401) {
      throw new VietmapApiError(
        'UNAUTHORIZED',
        'Khóa truy cập VietMap không hợp lệ hoặc đã hết hạn.',
        401,
      );
    }

    if (res.status === 423 || res.status === 429) {
      throw new VietmapApiError(
        'RATE_LIMITED',
        'Đã vượt quá giới hạn lượt truy vấn VietMap hoặc tài khoản tạm khóa.',
        res.status,
      );
    }

    if (!res.ok) {
      throw new VietmapApiError(
        'UPSTREAM_ERROR',
        `Dịch vụ bản đồ VietMap phản hồi lỗi (HTTP ${res.status}).`,
        res.status,
      );
    }

    const data = await res.json();
    if (!data || typeof data !== 'object') {
      throw new VietmapApiError(
        'INVALID_RESPONSE',
        'Dữ liệu phản hồi từ VietMap không hợp lệ.',
      );
    }

    const lat = Number(data.lat);
    const lng = Number(data.lng);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new VietmapApiError(
        'INVALID_RESPONSE',
        'Tọa độ kinh độ hoặc vĩ độ trả về từ VietMap không hợp lệ.',
      );
    }

    return {
      latitude: lat,
      longitude: lng,
      addressText: data.display || data.address || '',
      display: data.display || '',
      name: data.name || undefined,
      hsNum: data.hs_num || undefined,
      street: data.street || undefined,
      ward: data.ward || undefined,
      district: data.district || undefined,
      city: data.city || undefined,
    };
  }

  /**
   * Tra cứu địa chỉ từ tọa độ Reverse Geocoding v4
   * - Giữ nguyên tọa độ gốc do người dùng chọn trên bản đồ.
   * - Trả về danh sách địa chỉ gợi ý gần nhất.
   */
  async reverseGeocode(
    lat: number,
    lng: number,
    options?: VietmapRequestOptions,
  ): Promise<VietmapReverseResult[]> {
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
      throw new VietmapApiError(
        'INVALID_INPUT',
        'Tọa độ kinh độ hoặc vĩ độ không hợp lệ (Latitude [-90, 90], Longitude [-180, 180]).',
      );
    }

    const apiKey = this.ensureApiKey();
    const url = `${this.baseUrl}/reverse/v4?apikey=${encodeURIComponent(apiKey)}&lat=${lat}&lng=${lng}&display_type=5`;

    const res = await this.executeFetch(url, options);

    if (res.status === 401) {
      throw new VietmapApiError(
        'UNAUTHORIZED',
        'Khóa truy cập VietMap không hợp lệ hoặc đã hết hạn.',
        401,
      );
    }

    if (res.status === 423 || res.status === 429) {
      throw new VietmapApiError(
        'RATE_LIMITED',
        'Đã vượt quá giới hạn lượt truy vấn VietMap hoặc tài khoản tạm khóa.',
        res.status,
      );
    }

    if (!res.ok) {
      throw new VietmapApiError(
        'UPSTREAM_ERROR',
        `Dịch vụ bản đồ VietMap phản hồi lỗi (HTTP ${res.status}).`,
        res.status,
      );
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      return [];
    }

    // Luôn giữ tọa độ gốc lat/lng do người dùng truyền vào
    return data.map((item: any): VietmapReverseResult => ({
      latitude: lat,
      longitude: lng,
      addressText: item.display || item.address || item.name || '',
      display: item.display || '',
      name: item.name || '',
      distance: typeof item.distance === 'number' ? item.distance : undefined,
    }));
  }
}

// Export singleton instance for direct frontend use
export const vietmapService = new VietmapService();
