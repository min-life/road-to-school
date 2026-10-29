import assert from 'node:assert/strict';
import test from 'node:test';
import { createToastStore, toast, toastStore } from './toast-store.ts';

test('ignores empty messages and normalizes message/title before deduplication', () => {
  const store = createToastStore();
  assert.equal(store.getState().show('  ', 'success'), undefined);
  const id = store.getState().show(' Saved ', 'success', { title: ' Done ' });
  assert.equal(store.getState().show('Saved', 'success', { title: 'Done' }), id);
  assert.equal(store.getState().items.length, 1);
  assert.equal(store.getState().items[0].message, 'Saved');
  assert.equal(store.getState().items[0].title, 'Done');
});

test('keeps different tones and titles distinct', () => {
  const store = createToastStore();
  store.getState().show('Message', 'success');
  store.getState().show('Message', 'error');
  store.getState().show('Message', 'success', { title: 'Another result' });
  assert.equal(store.getState().items.length, 3);
});

test('bounds the queue at three and does not reuse IDs after clearing', () => {
  const store = createToastStore();
  for (let i = 0; i < 5; i++) store.getState().show(`Notice ${i}`, 'info');
  assert.deepEqual(store.getState().items.map(item => item.message), ['Notice 2', 'Notice 3', 'Notice 4']);
  const lastId = store.getState().items.at(-1)!.id;
  store.getState().clear();
  assert.equal(store.getState().items.length, 0);
  assert.ok(store.getState().show('Next', 'info')! > lastId);
});

test('uses tone durations and preserves an explicit duration', () => {
  const store = createToastStore();
  for (const [tone, duration] of [['success', 4000], ['error', 7000], ['warning', Infinity], ['info', 4000]] as const) {
    store.getState().show(tone, tone);
    assert.equal(store.getState().items.at(-1)!.duration, duration);
  }
  store.getState().show('Custom', 'success', { duration: 6000 });
  assert.equal(store.getState().items.at(-1)!.duration, 6000);
});

test('dismissing one notice preserves the others and store instances are independent', () => {
  const store = createToastStore();
  const other = createToastStore();
  const first = store.getState().show('First', 'info')!;
  const second = store.getState().show('Second', 'info')!;
  store.getState().dismiss(first);
  assert.deepEqual(store.getState().items.map(item => item.id), [second]);
  assert.equal(other.getState().items.length, 0);
});

test('public toast API does not enqueue during server rendering', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(toast.success('Server-side message'), undefined);
  assert.equal(toastStore.getState().items.length, 0);
});
