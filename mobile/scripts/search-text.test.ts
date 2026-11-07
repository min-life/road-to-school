import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { matchesSearchText } from '../utils/search-text.ts';

// Display text only; no student fixtures, API responses or database operations.
describe('display field search', () => {
  it('keeps all results for blank search', () => {
    assert.equal(matchesSearchText('  ', []), true);
  });
  it('ignores Vietnamese accents, đ and letter case', () => {
    assert.equal(matchesSearchText('DUONG', ['Đường']), true);
    assert.equal(matchesSearchText('đƯỜNG', ['duong']), true);
    assert.equal(matchesSearchText('á', ['a\u0301']), true);
  });
  it('matches parts of codes without changing leading zeroes', () => {
    assert.equal(matchesSearchText('001', ['HS-0012']), true);
  });
  it('matches the requested partial Vietnamese text, including a single character', () => {
    for (const query of ['ăn', 'ĂN', 'an', 'vĂn', 'n', '  văn   a ']) {
      assert.equal(matchesSearchText(query, ['Nguyễn Văn A']), true, query);
    }
  });
  it('requires the entire substring, without scattered letters or a typo fallback', () => {
    for (const query of ['ăx', 'zzzz', 'nguyen a', 'van nguyen', 'xxx văn']) {
      assert.equal(matchesSearchText(query, ['Nguyễn Văn A']), false, query);
    }
  });
  it('checks each field separately instead of joining words across fields', () => {
    assert.equal(matchesSearchText('binh 001', ['Hòa Bình', 'HS-0012']), false);
    assert.equal(matchesSearchText('binh hs', ['Hòa Bình', 'HS-0012']), false);
    assert.equal(matchesSearchText('hoa binh', ['HS-0012', 'Hòa Bình']), true);
  });
  it('ignores surrounding and repeated whitespace in a phrase', () => {
    assert.equal(matchesSearchText('  hoa\tbinh  ', ['Hòa   Bình']), true);
  });
  it('does not treat a query consisting only of combining marks as a blank search', () => {
    assert.equal(matchesSearchText('\u0301', ['Nguyễn Văn A']), false);
  });
  it('accepts missing fields and treats punctuation literally', () => {
    assert.equal(matchesSearchText('[', [null, undefined, '']), false);
    assert.equal(matchesSearchText('.*', ['Hòa Bình']), false);
    assert.equal(matchesSearchText('hs-00', [undefined, 'HS-0012']), true);
  });
});
