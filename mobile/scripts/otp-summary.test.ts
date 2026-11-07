import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readSummaryObject, summaryCoordinates, summaryDate, summaryText, summaryTimeRange } from '../utils/otp-summary.ts';

// Pure text, JSON and numeric formatting only; no requests, challenges or business fixtures.
describe('OTP summary presentation', () => {
  it('only reads JSON objects and safely rejects broken or non-object JSON', () => {
    for (const value of [undefined, '', '{', 'null', '[]', '1', '"text"']) assert.equal(readSummaryObject(value), null);
    assert.deepEqual(readSummaryObject('{"text":"original","number":0}'), { text: 'original', number: 0 });
  });
  it('preserves entered text without coercing missing values or objects', () => {
    assert.equal(summaryText('  Nội dung\nxuống dòng  '), 'Nội dung\nxuống dòng');
    for (const value of [undefined, null, {}, 0, ' ']) assert.equal(summaryText(value), 'Chưa có thông tin');
    assert.equal(summaryText('', 'Không nhập'), 'Không nhập');
  });
  it('formats calendar dates without timezone shifts and rejects impossible dates', () => {
    assert.equal(summaryDate('2026-11-01'), '01/11/2026');
    assert.equal(summaryDate('2024-02-29'), '29/02/2024');
    for (const value of [undefined, '2026-02-29', '2026-13-01', '2026-11-31', '2026-11-01T00:00:00Z']) assert.equal(summaryDate(value), 'Chưa có thông tin');
  });
  it('keeps scheduled time ranges and represents missing or invalid times honestly', () => {
    assert.equal(summaryTimeRange('06:15', '07:00:00'), '06:15 – 07:00');
    assert.equal(summaryTimeRange('06:15'), '06:15 – Chưa có thông tin');
    assert.equal(summaryTimeRange(undefined, '07:00'), 'Chưa có thông tin – 07:00');
    assert.equal(summaryTimeRange('25:00', 'invalid'), 'Theo lịch');
  });
  it('formats selected coordinates to the same six decimals as the form, including zero', () => {
    assert.equal(summaryCoordinates(0, 0), '0.000000, 0.000000');
    assert.equal(summaryCoordinates(-90, 180), '-90.000000, 180.000000');
    assert.equal(summaryCoordinates(1.12345678, 2.12345678), '1.123457, 2.123457');
    for (const value of [null, '0', NaN, Infinity, 91]) assert.equal(summaryCoordinates(value, 0), 'Chưa có thông tin');
    assert.equal(summaryCoordinates(0, -181), 'Chưa có thông tin');
  });
});
