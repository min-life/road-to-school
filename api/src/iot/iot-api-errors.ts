import { applyDecorators, ServiceUnavailableException } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

export function ApiIotErrors(...statuses: number[]) {
  const descriptions: Record<number, string> = {
    400: 'Dữ liệu không hợp lệ', 401: 'Thiếu hoặc sai thông tin xác thực',
    403: 'Sai vai trò, phạm vi quản lý hoặc phân công', 404: 'Không tìm thấy dữ liệu trong phạm vi quản lý',
    409: 'Xung đột gán xe/CAS, chuyến frozen, xe inactive, token hoặc scanId không hợp lệ',
    503: 'PostgreSQL, MongoDB, khóa cấu hình hoặc firmware chưa sẵn sàng',
    410: 'Phiên đăng ký hoặc lượt chờ xác nhận đã hết hạn',
    500: 'Lỗi nội bộ ngoài dự kiến',
  };
  return applyDecorators(...statuses.map((status) => ApiResponse({ status, description: descriptions[status] })));
}

export function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

export function iotStorageUnavailable(): never {
  // Never expose driver errors, MongoDB URLs, query contents or credentials.
  throw new ServiceUnavailableException('Kho dữ liệu IoT chưa sẵn sàng');
}
