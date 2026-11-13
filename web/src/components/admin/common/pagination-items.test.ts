import assert from 'node:assert/strict';
import test from 'node:test';
import { getPaginationItems } from './pagination-items.ts';

test('single and short page lists have no ellipsis', () => {
  assert.deepEqual(getPaginationItems(1, 0), [1]);
  assert.deepEqual(getPaginationItems(1, 1), [1]);
  assert.deepEqual(getPaginationItems(2, 4), [1, 2, 3, 4]);
});

test('first, middle and last windows retain both boundaries', () => {
  assert.deepEqual(getPaginationItems(1, 20), [1, 2, 3, 4, 5, 'ellipsis-end', 20]);
  assert.deepEqual(getPaginationItems(10, 20), [1, 'ellipsis-start', 8, 9, 10, 11, 12, 'ellipsis-end', 20]);
  assert.deepEqual(getPaginationItems(20, 20), [1, 'ellipsis-start', 16, 17, 18, 19, 20]);
});

test('mobile keeps current and boundary pages in a compact list', () => {
  assert.deepEqual(getPaginationItems(10, 20, 1), [1, 'ellipsis-start', 10, 'ellipsis-end', 20]);
  assert.deepEqual(getPaginationItems(2, 3, 1), [1, 2, 3]);
});

test('large page counts stay bounded and ordered without duplicate pages', () => {
  for (const count of [1, 2, 5, 6, 7, 20, 1_000_000]) {
    for (const page of [1, 2, Math.ceil(count / 2), count - 1, count]) {
      const items = getPaginationItems(page, count);
      const numbers = items.filter((item): item is number => typeof item === 'number');
      assert.ok(items.length <= 9);
      assert.equal(numbers[0], 1);
      assert.equal(numbers.at(-1), count);
      assert.equal(new Set(numbers).size, numbers.length);
      assert.deepEqual(numbers, [...numbers].sort((a, b) => a - b));
      assert.ok(numbers.includes(Math.min(count, Math.max(1, page))));
    }
  }
});
