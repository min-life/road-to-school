import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { phoneDialUrl } from '../utils/phone-link.ts';

// Phone text primitives only; no User/Trip fixtures, device dialer, or actual calls.
describe('phone app URL', () => {
  it('rejects missing numbers', () => {
    for (const value of [undefined, null, '', '   ', 123]) assert.equal(phoneDialUrl(value), null);
  });
  it('preserves a leading zero', () => {
    assert.equal(phoneDialUrl('0123456789'), 'tel:0123456789');
  });
  it('preserves the supplied international prefix without inventing a country code', () => {
    assert.equal(phoneDialUrl('+123456789'), 'tel:+123456789');
  });
  it('removes only ordinary display separators', () => {
    assert.equal(phoneDialUrl('  +1 (234) 567-89.0  '), 'tel:+1234567890');
    assert.equal(phoneDialUrl('(0123) 456-789'), 'tel:0123456789');
  });
  it('rejects empty punctuation and misplaced plus signs', () => {
    for (const value of ['()', '--', '.', '+', '12+34', '++123']) assert.equal(phoneDialUrl(value), null);
  });
  it('does not strip arbitrary text into a different phone number', () => {
    for (const value of ['abc123', '123abc', 'tel:123', 'https://example.invalid/123']) assert.equal(phoneDialUrl(value), null);
  });
  it('rejects command/extension/query characters', () => {
    for (const value of ['*123#', '123,456', '123;456', '123?x=1', '123&x=1', '123%20']) assert.equal(phoneDialUrl(value), null);
  });
});
