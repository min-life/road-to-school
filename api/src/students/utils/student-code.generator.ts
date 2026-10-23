import * as crypto from 'node:crypto';

/**
 * Bảng ký tự an toàn gồm chữ in hoa A-Z và chữ số 0-9.
 */
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const ALPHANUMERIC = `${LETTERS}${DIGITS}`;

/**
 * Regex kiểm tra cấu trúc mã học sinh:
 * - Tiền tố: STU
 * - 8 ký tự tiếp theo là chữ in hoa hoặc số
 * - Phải có ít nhất 1 chữ cái và ít nhất 1 chữ số
 * - Tổng cộng đúng 11 ký tự
 */
export const STUDENT_CODE_REGEX = /^STU(?=.*[A-Z])(?=.*[0-9])[A-Z0-9]{8}$/;

/**
 * Sinh mã học sinh theo đúng quy chuẩn Product Owner:
 * - Prefix: STU
 * - Phần ngẫu nhiên: Đúng 8 ký tự [A-Z0-9]
 * - Bắt buộc có ít nhất 1 chữ cái và 1 chữ số
 * - Tổng chiều dài: Đúng 11 ký tự
 */
export function generateStudentCode(): string {
  while (true) {
    let randomPart = '';
    for (let i = 0; i < 8; i++) {
      const idx = crypto.randomInt(0, ALPHANUMERIC.length);
      randomPart += ALPHANUMERIC[idx];
    }

    const hasLetter = /[A-Z]/.test(randomPart);
    const hasDigit = /[0-9]/.test(randomPart);

    if (hasLetter && hasDigit) {
      return `STU${randomPart}`;
    }
  }
}

/**
 * Chuẩn hóa mã học sinh khi nhận từ người dùng:
 * - Cắt khoảng trắng 2 đầu
 * - Chuyển toàn bộ sang chữ in hoa
 */
export function normalizeStudentCode(input: string): string {
  if (!input) return '';
  return input.trim().toUpperCase();
}

/**
 * Kiểm tra định dạng mã học sinh có hợp lệ theo chuẩn không
 */
export function isValidStudentCode(input: string): boolean {
  if (!input) return false;
  const normalized = normalizeStudentCode(input);
  return STUDENT_CODE_REGEX.test(normalized);
}
