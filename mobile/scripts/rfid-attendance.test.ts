import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canConfirmRfid,
  isRfidPending,
  rfidOutcome,
  rfidResultUnknown,
} from '../utils/rfid-attendance.ts';
import type { RfidAttendanceEvent } from '../services/rfid-attendance.ts';
// Pure UI/protocol states only. No Student records, HTTP calls or DB writes.
describe('RFID UI state safety', () => {
  it('requires a current phase, identity and unexpired waiting state', () => {
    const waiting = {
      state: 'WAITING_CONFIRMATION',
      phase: 'BOARDING',
      studentId: 'identity-scope',
      expiresAt: new Date(2000).toISOString(),
    } as RfidAttendanceEvent;
    assert.equal(canConfirmRfid(waiting, 'BOARDING', 1000), true);
    assert.equal(canConfirmRfid(waiting, 'ALIGHTING', 1000), false);
    assert.equal(canConfirmRfid(waiting, 'BOARDING', 2000), false);
    assert.equal(
      canConfirmRfid({ ...waiting, studentId: null }, 'BOARDING', 1000),
      false,
    );
    assert.equal(
      canConfirmRfid({ ...waiting, state: 'RECONCILING' }, 'BOARDING', 1000),
      false,
    );
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
