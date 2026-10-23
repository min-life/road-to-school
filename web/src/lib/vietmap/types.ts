/**
 * VietMap API v4 Type Definitions for Browser Direct Integration
 */

export interface VietmapSuggestion {
  /**
   * Mã định danh tham chiếu opaque do VietMap cung cấp (bắt đầu bằng auto: hoặc geocode:)
   * Bắt buộc giữ nguyên vẹn toàn bộ prefix và string để truyền vào Place v4.
   */
  refId: string;

  /**
   * Chuỗi hiển thị địa chỉ và tên địa điểm hoàn chỉnh
   */
  display: string;

  /**
   * Tên địa điểm hoặc số nhà/tên đường
   */
  name: string;

  /**
   * Địa chỉ hành chính (Phường/Xã, Quận/Huyện, Tỉnh/TP)
   */
  address: string;

  /**
   * Khoảng cách từ điểm focus (nếu có tính toán)
   */
  distance?: number;
}

export interface VietmapPlaceDetail {
  /**
   * Tọa độ vĩ độ (Latitude, chuẩn WGS-84, -90 đến 90)
   */
  latitude: number;

  /**
   * Tọa độ kinh độ (Longitude, chuẩn WGS-84, -180 đến 180)
   */
  longitude: number;

  /**
   * Chuỗi địa chỉ hoàn chỉnh chuẩn hóa
   */
  addressText: string;

  /**
   * Chuỗi hiển thị gốc từ VietMap
   */
  display: string;

  /**
   * Tên địa điểm (nếu là POI)
   */
  name?: string;

  /**
   * Số nhà
   */
  hsNum?: string;

  /**
   * Tên đường
   */
  street?: string;

  /**
   * Phường / Xã
   */
  ward?: string;

  /**
   * Quận / Huyện (đối với mô hình hành chính cũ 3 cấp; rỗng với mô hình mới 2 cấp)
   */
  district?: string;

  /**
   * Tỉnh / Thành phố
   */
  city?: string;
}

export interface VietmapReverseResult {
  /**
   * Tọa độ vĩ độ gốc được người dùng chọn
   */
  latitude: number;

  /**
   * Tọa độ kinh độ gốc được người dùng chọn
   */
  longitude: number;

  /**
   * Chuỗi địa chỉ gợi ý từ điểm gần nhất
   */
  addressText: string;

  /**
   * Chuỗi hiển thị đầy đủ từ VietMap
   */
  display: string;

  /**
   * Tên địa điểm hoặc số nhà/tên đường gần nhất
   */
  name: string;

  /**
   * Khoảng cách từ điểm đã chọn đến đối tượng bản đồ gần nhất (mét)
   */
  distance?: number;
}

export interface VietmapAutocompleteOptions {
  /**
   * Tọa độ trọng tâm (focus) của người dùng để ưu tiên kết quả gần vị trí này
   */
  focus?: { lat: number; lng: number };

  /**
   * Kiểu hiển thị phân cấp hành chính (mặc định 5: định dạng mới 2 cấp kèm dữ liệu cũ trong data_old)
   */
  displayType?: number;

  /**
   * AbortSignal để hủy request cũ khi người dùng tiếp tục gõ phím
   */
  signal?: AbortSignal;

  /**
   * Thời gian chờ tối đa (milliseconds, mặc định 5000ms)
   */
  timeoutMs?: number;
}

export interface VietmapRequestOptions {
  /**
   * AbortSignal để hủy request
   */
  signal?: AbortSignal;

  /**
   * Thời gian chờ tối đa (milliseconds, mặc định 5000ms)
   */
  timeoutMs?: number;
}

export type VietmapErrorCode =
  | 'MISSING_API_KEY'
  | 'INVALID_INPUT'
  | 'INVALID_RESPONSE'
  | 'NETWORK_TIMEOUT'
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'UPSTREAM_ERROR';

export class VietmapApiError extends Error {
  code: VietmapErrorCode;
  statusCode?: number;

  constructor(code: VietmapErrorCode, message: string, statusCode?: number) {
    super(message);
    this.name = 'VietmapApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}
