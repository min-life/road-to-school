import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import {
  isValidCalendarDate,
  validateWeeklySchedule,
} from './schedule.validator.js';

describe('ScheduleValidator', () => {
  describe('isValidCalendarDate', () => {
    it('chấp nhận ngày lịch hợp lệ định dạng YYYY-MM-DD', () => {
      expect(isValidCalendarDate('2026-09-01')).toBe(true);
      expect(isValidCalendarDate('2026-12-31')).toBe(true);
      expect(isValidCalendarDate('2024-02-29')).toBe(true); // Năm nhuận 2024
    });

    it('từ chối ngày không có thật trong lịch (ví dụ 30/2, 31/4)', () => {
      expect(isValidCalendarDate('2026-02-30')).toBe(false);
      expect(isValidCalendarDate('2026-02-29')).toBe(false); // Năm không nhuận
      expect(isValidCalendarDate('2026-04-31')).toBe(false);
    });

    it('từ chối định dạng ngày sai (không phải YYYY-MM-DD)', () => {
      expect(isValidCalendarDate('01-09-2026')).toBe(false);
      expect(isValidCalendarDate('2026/09/01')).toBe(false);
      expect(isValidCalendarDate('2026-9-1')).toBe(false);
      expect(isValidCalendarDate('invalid')).toBe(false);
      expect(isValidCalendarDate('')).toBe(false);
    });
  });

  describe('validateWeeklySchedule', () => {
    it('chấp nhận chuỗi JSON lịch học tuần hợp lệ với 1 hoặc nhiều ngày', () => {
      const validJson = JSON.stringify({
        monday: { start: '07:00', end: '17:30' },
        friday: { start: '07:30', end: '16:45' },
      });

      const result = validateWeeklySchedule(validJson);
      expect(result).toEqual({
        monday: { start: '07:00', end: '17:30' },
        friday: { start: '07:30', end: '16:45' },
      });
    });

    it('chấp nhận object lịch học tuần hợp lệ trực tiếp', () => {
      const validObj = {
        monday: { start: '07:00', end: '17:30' },
      };

      const result = validateWeeklySchedule(validObj);
      expect(result).toEqual(validObj);
    });

    it('ném lỗi nếu chuỗi JSON không đúng cú pháp', () => {
      expect(() => validateWeeklySchedule('invalid-json')).toThrow(
        new BadRequestException('Lịch học tuần không đúng định dạng JSON hợp lệ'),
      );
    });

    it('ném lỗi nếu JSON là mảng hoặc không phải object', () => {
      expect(() => validateWeeklySchedule('[]')).toThrow(
        new BadRequestException('Lịch học tuần phải là một JSON Object'),
      );
      expect(() => validateWeeklySchedule(null)).toThrow(
        new BadRequestException('Lịch học tuần phải là một JSON Object'),
      );
      expect(() => validateWeeklySchedule('123')).toThrow(
        new BadRequestException('Lịch học tuần phải là một JSON Object'),
      );
    });

    it('ném lỗi nếu lịch học rỗng (0 ngày học)', () => {
      expect(() => validateWeeklySchedule('{}')).toThrow(
        new BadRequestException('Lịch học tuần phải có ít nhất một ngày học'),
      );
    });

    it('ném lỗi nếu có khóa ngày không hợp lệ (ngoài monday..sunday)', () => {
      const invalidDay = JSON.stringify({
        monday: { start: '07:00', end: '17:30' },
        funday: { start: '07:00', end: '17:30' },
      });

      expect(() => validateWeeklySchedule(invalidDay)).toThrow(
        new BadRequestException(
          'Ngày học không hợp lệ: "funday". Chỉ chấp nhận các ngày từ monday đến sunday',
        ),
      );
    });

    it('ném lỗi nếu cấu hình ngày học không phải object', () => {
      const invalidConfig = JSON.stringify({
        monday: 'all-day',
      });

      expect(() => validateWeeklySchedule(invalidConfig)).toThrow(
        new BadRequestException('Cấu hình lịch học cho ngày "monday" không hợp lệ'),
      );
    });

    it('ném lỗi nếu giờ bắt đầu sai định dạng 24h HH:mm', () => {
      const invalidStart = JSON.stringify({
        monday: { start: '7:00', end: '17:30' },
      });

      expect(() => validateWeeklySchedule(invalidStart)).toThrow(
        new BadRequestException(
          'Giờ bắt đầu học cho ngày "monday" phải có định dạng HH:mm 24 giờ (ví dụ: 07:00)',
        ),
      );
    });

    it('ném lỗi nếu giờ kết thúc sai định dạng 24h HH:mm', () => {
      const invalidEnd = JSON.stringify({
        monday: { start: '07:00', end: '25:00' },
      });

      expect(() => validateWeeklySchedule(invalidEnd)).toThrow(
        new BadRequestException(
          'Giờ kết thúc học cho ngày "monday" phải có định dạng HH:mm 24 giờ (ví dụ: 17:30)',
        ),
      );
    });

    it('ném lỗi nếu giờ kết thúc nhỏ hơn hoặc bằng giờ bắt đầu (start >= end)', () => {
      const startEqualsEnd = JSON.stringify({
        monday: { start: '07:00', end: '07:00' },
      });
      expect(() => validateWeeklySchedule(startEqualsEnd)).toThrow(
        new BadRequestException(
          'Giờ kết thúc học (07:00) phải lớn hơn giờ bắt đầu học (07:00) cho ngày "monday"',
        ),
      );

      const overnight = JSON.stringify({
        monday: { start: '17:30', end: '07:00' },
      });
      expect(() => validateWeeklySchedule(overnight)).toThrow(
        new BadRequestException(
          'Giờ kết thúc học (07:00) phải lớn hơn giờ bắt đầu học (17:30) cho ngày "monday"',
        ),
      );
    });
  });
});
