export interface UsbChip { deviceId: string; macAddress: string; chipModel: string }
export type SerialReply = { requestId: string; ok: boolean; data?: Record<string, unknown> };
export interface WifiNetwork { ssid: string; rssi: number; secure: boolean; supported: boolean }

const serialErrors: Record<string, string> = {
  DEVICE_NOT_CONFIGURED: 'Thiết bị chưa nhận cấu hình. Bấm Thiết lập lại rồi kết nối Wi-Fi.',
  INVALID_DEVICE_CONFIG: 'Cấu hình thiết bị không hợp lệ. Kiểm tra địa chỉ API; HTTPS cần chứng chỉ trong firmware.',
  INVALID_WIFI: 'Tên mạng hoặc mật khẩu Wi-Fi không đúng định dạng.',
  WIFI_BUSY: 'Thiết bị đang kết nối Wi-Fi. Chờ rồi thử lại.',
  DEVICE_BUSY: 'Thiết bị đang xử lý tác vụ khác. Chờ rồi thử lại.',
  WIFI_CONNECT_TIMEOUT: 'Chưa kết nối được Wi-Fi sau 12 giây. Kiểm tra mật khẩu, sóng và mạng 2.4 GHz.',
  WIFI_NETWORK_NOT_FOUND: 'ESP32 không tìm thấy mạng đã chọn. Quét lại hoặc kiểm tra sóng Wi-Fi 2.4 GHz.',
  WIFI_CONNECT_FAILED: 'Wi-Fi từ chối kết nối. Kiểm tra mật khẩu và cài đặt bảo mật của mạng.',
  NVS_WRITE_FAILED: 'ESP32 không lưu được cấu hình. Khởi động lại thiết bị rồi thử lại.',
  WIFI_SCAN_FAILED: 'ESP32 chưa quét được Wi-Fi. Chờ vài giây rồi bấm Quét lại.',
  UNKNOWN_COMMAND: 'Firmware chưa hỗ trợ thao tác này. Nạp firmware mới rồi kết nối lại.',
  INVALID_COMMAND: 'Lệnh USB không tương thích. Kiểm tra phiên bản firmware.',
};

export function serialErrorMessage(code: unknown): string {
  if (typeof code === 'string' && Object.hasOwn(serialErrors, code)) return `${serialErrors[code]} (${code})`;
  return 'ESP32 báo lỗi chưa xác định. Kết nối lại thiết bị rồi thử lại.';
}

export function parseWifiNetworks(data: Record<string, unknown> | undefined): WifiNetwork[] {
  const list = data?.networks;
  if (!Array.isArray(list) || list.length > 20) throw new Error('Danh sách Wi-Fi từ ESP32 không hợp lệ.');
  const seen = new Set<string>();
  return list.map((entry: unknown) => {
    if (!entry || typeof entry !== 'object') throw new Error('Thông tin mạng Wi-Fi không hợp lệ.');
    const item = entry as Record<string, unknown>;
    if (typeof item.ssid !== 'string' || !item.ssid || item.ssid.includes('\0')
      || new TextEncoder().encode(item.ssid).length > 32 || seen.has(item.ssid)
      || typeof item.rssi !== 'number' || !Number.isInteger(item.rssi) || item.rssi < -127 || item.rssi > 0
      || typeof item.secure !== 'boolean' || typeof item.supported !== 'boolean'
      || (item.supported && !item.secure)) throw new Error('Thông tin mạng Wi-Fi không hợp lệ.');
    seen.add(item.ssid);
    return { ssid: item.ssid, rssi: item.rssi, secure: item.secure, supported: item.supported };
  }).sort((a, b) => b.rssi - a.rssi);
}

export function parseSerialReply(line: string): SerialReply | null {
  if (line.length > 8192) return null;
  try {
    const value: unknown = JSON.parse(line);
    if (!value || typeof value !== 'object') return null;
    const reply = value as Record<string, unknown>;
    if (typeof reply.requestId !== 'string' || typeof reply.ok !== 'boolean') return null;
    return { requestId: reply.requestId, ok: reply.ok,
      data: reply.data && typeof reply.data === 'object' && !Array.isArray(reply.data)
        ? reply.data as Record<string, unknown> : undefined };
  } catch { return null; }
}

export function validateEsp32Image(bytes: Uint8Array): void {
  // POC contract: full merged ESP32 image based at 0x0, not an app-only binary.
  if (bytes.length <= 0x10018 || bytes.length > 4 * 1024 * 1024
    || bytes[0x1000] !== 0xe9 || bytes[0x8000] !== 0xaa || bytes[0x8001] !== 0x50
    || bytes[0x10000] !== 0xe9 || bytes[0x1000 + 12] !== 0 || bytes[0x1000 + 13] !== 0
    || bytes[0x10000 + 12] !== 0 || bytes[0x10000 + 13] !== 0) {
    throw new Error('Cần firmware ESP32 đầy đủ (merged, offset 0x0, tối đa 4 MB).');
  }
}

export function validateDeviceApiUrl(value: string): string {
  if (value.length > 512) throw new Error('URL API tối đa 512 ký tự.');
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('Nhập URL API mà ESP32 truy cập được.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash
    || ['localhost', '0.0.0.0', '[::1]'].includes(url.hostname) || url.hostname.startsWith('127.')
    || url.pathname.replace(/\/$/, '') !== '/api/v1') {
    throw new Error('Dùng địa chỉ mạng của API, kết thúc bằng /api/v1; không dùng localhost.');
  }
  return url.toString().replace(/\/$/, '');
}
