import { describe, it, expect } from 'vitest';
import {
  generateStudentCode,
  normalizeStudentCode,
  isValidStudentCode,
  STUDENT_CODE_REGEX,
} from './student-code.generator.js';

describe('StudentCodeGenerator', () => {
  it('sinh mã học sinh đúng cấu trúc: tiền tố STU, đúng 11 ký tự, có ít nhất 1 chữ cái và 1 chữ số', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateStudentCode();
      expect(code).toHaveLength(11);
      expect(code.startsWith('STU')).toBe(true);
      expect(STUDENT_CODE_REGEX.test(code)).toBe(true);

      const randomPart = code.slice(3);
      expect(randomPart).toHaveLength(8);
      expect(/[A-Z]/.test(randomPart)).toBe(true);
      expect(/[0-9]/.test(randomPart)).toBe(true);
    }
  });

  it('sinh các mã ngẫu nhiên phân tán, không trùng lặp trong 100 lần sinh liên tiếp', () => {
    const set = new Set<string>();
    for (let i = 0; i < 100; i++) {
      set.add(generateStudentCode());
    }
    expect(set.size).toBe(100);
  });

  it('chuẩn hóa mã học sinh: trim khoảng trắng và chuyển thành chữ in hoa', () => {
    expect(normalizeStudentCode('  stu8k4m2p7q  ')).toBe('STU8K4M2P7Q');
    expect(normalizeStudentCode('stu4f8g2h6j')).toBe('STU4F8G2H6J');
    expect(normalizeStudentCode('')).toBe('');
  });

  it('xác thực đúng các ví dụ hợp lệ từ tài liệu Product Owner', () => {
    expect(isValidStudentCode('STUA7B3C9D2')).toBe(true);
    expect(isValidStudentCode('STU8K4M2P7Q')).toBe(true);
    expect(isValidStudentCode('STU4F8G2H6J')).toBe(true);
    // Hỗ trợ input chữ thường sau khi chuẩn hóa
    expect(isValidStudentCode('stua7b3c9d2')).toBe(true);
  });

  it('từ chối các mã không hợp lệ theo quy tắc', () => {
    // Không có số
    expect(isValidStudentCode('STUABCDEFGH')).toBe(false);
    // Không có chữ
    expect(isValidStudentCode('STU12345678')).toBe(false);
    // Thiếu ký tự (dưới 11 ký tự)
    expect(isValidStudentCode('STUA1B2')).toBe(false);
    // Thừa ký tự (quá 11 ký tự)
    expect(isValidStudentCode('STUA1B2C3D4E5')).toBe(false);
    // Sai tiền tố
    expect(isValidStudentCode('SCHA7B3C9D2')).toBe(false);
    // Ký tự đặc biệt
    expect(isValidStudentCode('STUA7B3-9D2')).toBe(false);
    expect(isValidStudentCode('')).toBe(false);
  });
});
