import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isRfidPending,
  rfidOutcome,
  rfidResultUnknown,
} from '../utils/rfid-attendance.ts';
import type { RfidAttendanceEvent } from '../services/rfid-attendance.ts';
// Pure UI/protocol states only. No Student records, HTTP calls or DB writes.
describe('RFID UI state safety', () => {
  it('asks for a fresh scan for a legacy unprocessed event', () => {
    const waiting = {
      state: 'WAITING_CONFIRMATION',
      phase: 'BOARDING',
      studentId: 'identity-scope',
      expiresAt: new Date(2000).toISOString(),
    } as RfidAttendanceEvent;
    assert.equal(isRfidPending(waiting.state), false);
    assert.match(rfidOutcome(waiting), /quẹt lại/);
  });
  it('does not describe a historical/manual-overridden receipt as a fresh boarding success', () => {
    assert.match(
      rfidOutcome({
        state: 'APPLIED',
        phase: 'BOARDING',
        current: false,
      } as RfidAttendanceEvent),
      /hiện tại đã thay đổi/,
    );
    assert.match(
      rfidOutcome({
        state: 'ALREADY_RECORDED',
        current: false,
      } as RfidAttendanceEvent),
      /xem điểm danh hiện tại/,
    );
    assert.match(
      rfidOutcome({
        state: 'APPLIED',
        phase: 'ALIGHTING',
        current: true,
      } as RfidAttendanceEvent),
      /xuống xe/,
    );
  });
  it('keeps uncertain transport outcomes separate from known local/authorization rejection', () => {
    assert.equal(rfidResultUnknown({ statusCode: 0 }), true);
    assert.equal(rfidResultUnknown({ statusCode: 503 }), true);
    assert.equal(rfidResultUnknown({ statusCode: 401 }), false);
    assert.equal(
      rfidResultUnknown(new Error('Đang xử lý thao tác trước')),
      false,
    );
    assert.equal(isRfidPending('COMMITTING'), true);
    assert.equal(isRfidPending('APPLIED'), false);
  });
});
