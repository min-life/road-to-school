import { ServiceUnavailableException } from '@nestjs/common';

// Operator-owned configuration only. Never derive credential destinations from HTTP headers.
export function advertisedIotUrl(value: string | undefined): string {
  const fail = () => new ServiceUnavailableException(
    'Quản trị máy chủ cần cấu hình IOT_ADVERTISED_API_URL bằng địa chỉ mạng của API, kết thúc /api/v1',
  );
  if (!value || value.length > 512 || /[\s@?#\\]/.test(value)) throw fail();
  let url: URL;
  try { url = new URL(value); } catch { throw fail(); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
    || ['localhost', '0.0.0.0', '[::1]', '[::]'].includes(url.hostname)
    || url.hostname.startsWith('127.') || url.pathname.replace(/\/$/, '') !== '/api/v1') throw fail();
  return url.toString().replace(/\/$/, '');
}
