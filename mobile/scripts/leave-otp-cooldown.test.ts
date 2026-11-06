import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseLeaveOtpWaitSeconds, otpCooldownDeadline, otpCooldownSecondsLeft } from '../utils/leave-otp-cooldown.ts';

// Text, numbers and clocks only; no business DTOs, API mocks, OTP requests or DB.
describe('Leave OTP wait message', () => {
  it('uses the exact server wait, including values longer than 60 seconds', () => {
    assert.equal(parseLeaveOtpWaitSeconds('Vui lòng chờ 287 giây trước khi yêu cầu mã xác thực mới'), 287);
    assert.equal(parseLeaveOtpWaitSeconds('Vui lòng chờ 1 giây trước khi yêu cầu mã xác thực mới'), 1);
  });
  it('tolerates surrounding whitespace, case and final punctuation', () => {
    assert.equal(parseLeaveOtpWaitSeconds('  VUI LÒNG CHỜ 42 giây trước khi yêu cầu mã xác thực mới. '), 42);
  });
  it('does not mistake validation or network errors for a resend wait', () => {
    for (const text of ['Chuyến xe không còn ở trạng thái chờ vận hành (SCHEDULED)',
      'Bạn còn 3 lần thử.', 'Lỗi kết nối máy chủ (400)', 'Chờ 60 giây', '']) {
      assert.equal(parseLeaveOtpWaitSeconds(text), null);
    }
  });
  it('rejects absent, zero, negative, fractional and unsafe durations', () => {
    for (const value of [null, undefined, 60]) assert.equal(parseLeaveOtpWaitSeconds(value), null);
    for (const value of ['0', '-1', '1.5', '999999999999999999999']) {
      assert.equal(parseLeaveOtpWaitSeconds(`Vui lòng chờ ${value} giây trước khi yêu cầu mã xác thực mới`), null);
    }
  });
});

describe('deadline-based countdown', () => {
  it('creates a deadline from the actual wait instead of a fixed TTL', () => {
    assert.equal(otpCooldownDeadline(287, 1000), 288000);
  });
  it('rounds up so the button cannot unlock before a whole waiting interval has elapsed', () => {
    assert.equal(otpCooldownSecondsLeft(11000, 1000), 10);
    assert.equal(otpCooldownSecondsLeft(11000, 1001), 10);
    assert.equal(otpCooldownSecondsLeft(11000, 10999), 1);
  });
  it('recomputes after background time or delayed timer ticks', () => {
    const deadline = otpCooldownDeadline(300, 0)!;
    assert.equal(otpCooldownSecondsLeft(deadline, 240000), 60);
    assert.equal(otpCooldownSecondsLeft(deadline, 299999), 1);
  });
  it('unlocks at expiry and never displays negative seconds', () => {
    assert.equal(otpCooldownSecondsLeft(1000, 1000), 0);
    assert.equal(otpCooldownSecondsLeft(1000, 9000), 0);
    assert.equal(otpCooldownSecondsLeft(0, 9000), 0);
  });
  it('rejects invalid deadline inputs', () => {
    for (const seconds of [0, -1, 0.1, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
      assert.equal(otpCooldownDeadline(seconds, 1000), null);
    }
    assert.equal(otpCooldownDeadline(60, NaN), null);
    assert.equal(otpCooldownDeadline(60, Number.MAX_SAFE_INTEGER), null);
    assert.equal(otpCooldownSecondsLeft(NaN, 1000), 0);
    assert.equal(otpCooldownSecondsLeft(1000, Infinity), 0);
  });
});
