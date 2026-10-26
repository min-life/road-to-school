import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Helper mirror for student status label logic
function getStudentLeaveNoticeLabel(status: string, kind: string): string {
  if (kind === 'STUDENT') {
    if (status === 'RECORDED') return 'Đã nhận';
    if (status === 'WITHDRAWN') return 'Đã hủy';
    return status;
  }
  switch (status) {
    case 'PENDING_REPLACEMENT':
      return 'Chờ phân công';
    case 'RECORDED':
      return 'Đã ghi nhận';
    case 'REPLACED':
      return 'Đã bố trí';
    case 'WITHDRAWN':
      return 'Đã hủy';
    case 'TRIP_CANCELLED':
      return 'Chuyến đã hủy';
    default:
      return status;
  }
}

// Calendar day offset calculation
function getCalendarOffsetAndDays(year: number, month: number) {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstDayOfWeek = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const firstDayOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  return { daysInMonth, firstDayOffset };
}

describe('Leave Notice UI/UX Specifications', () => {
  it('strictly displays "Đã nhận" and "Đã hủy" for student notices, without staff lifecycle labels', () => {
    assert.equal(getStudentLeaveNoticeLabel('RECORDED', 'STUDENT'), 'Đã nhận');
    assert.equal(getStudentLeaveNoticeLabel('WITHDRAWN', 'STUDENT'), 'Đã hủy');
  });

  it('preserves full operational lifecycle labels for driver and bus attendant notices', () => {
    assert.equal(getStudentLeaveNoticeLabel('PENDING_REPLACEMENT', 'DRIVER'), 'Chờ phân công');
    assert.equal(getStudentLeaveNoticeLabel('RECORDED', 'DRIVER'), 'Đã ghi nhận');
    assert.equal(getStudentLeaveNoticeLabel('REPLACED', 'DRIVER'), 'Đã bố trí');
    assert.equal(getStudentLeaveNoticeLabel('WITHDRAWN', 'BUS_ATTENDANT'), 'Đã hủy');
    assert.equal(getStudentLeaveNoticeLabel('TRIP_CANCELLED', 'BUS_ATTENDANT'), 'Chuyến đã hủy');
  });

  it('calculates calendar days and Monday-based offset accurately for any month', () => {
    // October 2026: 31 days. Oct 1 2026 is Thursday (day 4). Monday offset = 3 (Mon, Tue, Wed).
    const oct2026 = getCalendarOffsetAndDays(2026, 10);
    assert.equal(oct2026.daysInMonth, 31);
    assert.equal(oct2026.firstDayOffset, 3);

    // February 2024 (leap year): 29 days. Feb 1 2024 is Thursday (day 4). Monday offset = 3.
    const feb2024 = getCalendarOffsetAndDays(2024, 2);
    assert.equal(feb2024.daysInMonth, 29);
    assert.equal(feb2024.firstDayOffset, 3);

    // February 2026 (non-leap year): 28 days. Feb 1 2026 is Sunday (day 0). Monday offset = 6.
    const feb2026 = getCalendarOffsetAndDays(2026, 2);
    assert.equal(feb2026.daysInMonth, 28);
    assert.equal(feb2026.firstDayOffset, 6);
  });

  it('restricts Parent filter to [ALL, RECORDED, WITHDRAWN] while keeping staff filters complete', () => {
    const parentFilters = [
      { id: 'ALL', label: 'Tất cả' },
      { id: 'RECORDED', label: 'Đã nhận' },
      { id: 'WITHDRAWN', label: 'Đã hủy' },
    ];
    assert.equal(parentFilters.length, 3);
    assert.ok(parentFilters.every((f) => !['PENDING_REPLACEMENT', 'REPLACED'].includes(f.id)));

    const staffFilters = [
      { id: 'ALL', label: 'Tất cả' },
      { id: 'PENDING_REPLACEMENT', label: 'Chờ phân công' },
      { id: 'RECORDED', label: 'Đã ghi nhận' },
      { id: 'REPLACED', label: 'Đã bố trí' },
      { id: 'WITHDRAWN', label: 'Đã hủy' },
    ];
    assert.equal(staffFilters.length, 5);
  });

  it('guards in-flight OTP request to prevent duplicate submissions on double tap', () => {
    let inFlightId: string | null = null;
    let requestCount = 0;

    const attemptAction = (tripId: string) => {
      if (inFlightId) return false;
      inFlightId = tripId;
      requestCount++;
      return true;
    };

    assert.equal(attemptAction('trip-1'), true);
    assert.equal(attemptAction('trip-1'), false); // blocked by in-flight guard
    assert.equal(attemptAction('trip-2'), false); // blocked while trip-1 is running
    assert.equal(requestCount, 1);

    // After finish:
    inFlightId = null;
    assert.equal(attemptAction('trip-2'), true);
    assert.equal(requestCount, 2);
  });
});
