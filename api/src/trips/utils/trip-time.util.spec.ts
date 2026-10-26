import {
  getDayOfWeekKey,
  getDayOfWeekVietnamese,
  formatDateToVnYmd,
  combineDateAndTimeUtc,
  secondsToTimeStr,
  timeStrToSeconds,
  isTimeIntervalOverlapping,
} from './trip-time.util.js';

describe('TripTimeUtil', () => {
  describe('getDayOfWeekKey', () => {
    it('should correctly identify Monday for 2026-10-26', () => {
      expect(getDayOfWeekKey('2026-10-26')).toBe('monday');
    });

    it('should correctly identify Sunday for 2026-11-01', () => {
      expect(getDayOfWeekKey('2026-11-01')).toBe('sunday');
    });

    it('should handle Date object in VN timezone', () => {
      // 2026-10-26T00:00:00Z is 07:00 in VN on Monday
      const dt = new Date('2026-10-26T00:00:00Z');
      expect(getDayOfWeekKey(dt)).toBe('monday');
    });
  });

  describe('getDayOfWeekVietnamese', () => {
    it('should return Vietnamese label for monday', () => {
      expect(getDayOfWeekVietnamese('monday')).toBe('Thứ 2');
      expect(getDayOfWeekVietnamese('sunday')).toBe('Chủ nhật');
      expect(getDayOfWeekVietnamese('saturday')).toBe('Thứ 7');
    });
  });

  describe('combineDateAndTimeUtc', () => {
    it('should convert VN local time (UTC+7) to UTC correctly', () => {
      // 06:15 local time in VN -> 23:15 UTC previous day
      const utcDate = combineDateAndTimeUtc('2026-10-26', '06:15');
      expect(utcDate.toISOString()).toBe('2026-10-25T23:15:00.000Z');

      // 16:30 local time in VN -> 09:30 UTC same day
      const afternoonUtc = combineDateAndTimeUtc('2026-10-26', '16:30');
      expect(afternoonUtc.toISOString()).toBe('2026-10-26T09:30:00.000Z');
    });
  });

  describe('secondsToTimeStr and timeStrToSeconds', () => {
    it('should convert seconds to HH:mm string', () => {
      expect(secondsToTimeStr(22500)).toBe('06:15');
      expect(secondsToTimeStr(59400)).toBe('16:30');
    });

    it('should convert HH:mm string to seconds', () => {
      expect(timeStrToSeconds('06:15')).toBe(22500);
      expect(timeStrToSeconds('16:30')).toBe(59400);
    });
  });

  describe('isTimeIntervalOverlapping', () => {
    const t0 = new Date('2026-10-26T06:00:00Z');
    const t1 = new Date('2026-10-26T07:00:00Z');
    const t2 = new Date('2026-10-26T08:00:00Z');
    const t3 = new Date('2026-10-26T09:00:00Z');

    it('should return true for overlapping intervals', () => {
      // [t0, t2) overlaps with [t1, t3)
      expect(isTimeIntervalOverlapping(t0, t2, t1, t3)).toBe(true);
      // [t1, t3) overlaps with [t0, t2)
      expect(isTimeIntervalOverlapping(t1, t3, t0, t2)).toBe(true);
    });

    it('should return false for adjacent intervals (endA === startB)', () => {
      // [t0, t1) does NOT overlap with [t1, t2)
      expect(isTimeIntervalOverlapping(t0, t1, t1, t2)).toBe(false);
    });

    it('should return false for completely disjoint intervals', () => {
      // [t0, t1) and [t2, t3)
      expect(isTimeIntervalOverlapping(t0, t1, t2, t3)).toBe(false);
    });
  });
});
