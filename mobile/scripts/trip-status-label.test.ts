import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getScheduleStatusLabel } from '../utils/trip-status-label.ts';

describe('Mobile schedule TripStatus labels', () => {
  for (const [status, label] of [
    ['SCHEDULED', 'Lập lịch'],
    ['IN_PROGRESS', 'Đang chạy'],
    ['COMPLETED', 'Đã hoàn thành'],
    ['CANCELLED', 'Đã hủy'],
  ]) {
    it(`renders persisted ${status} as ${label}`, () => {
      assert.equal(getScheduleStatusLabel(status, false), label);
    });
  }

  it('keeps virtual NOT_CREATED occurrences distinct from persisted trips', () => {
    assert.equal(getScheduleStatusLabel('NOT_CREATED', true), 'Dự kiến');
    assert.equal(getScheduleStatusLabel('SCHEDULED', true), 'Dự kiến');
  });

  it('does not mislabel unknown or missing statuses as scheduled', () => {
    assert.equal(getScheduleStatusLabel('UNKNOWN', false), 'Không xác định');
    assert.equal(getScheduleStatusLabel('', false), 'Không xác định');
  });

  it('changes the label when refreshed data transitions to completed', () => {
    let status = 'SCHEDULED';
    assert.equal(getScheduleStatusLabel(status, false), 'Lập lịch');
    status = 'COMPLETED';
    assert.equal(getScheduleStatusLabel(status, false), 'Đã hoàn thành');
  });
});
