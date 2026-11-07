import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { appAlertTone, createAppAlertStore } from '../utils/app-alert-store';

describe('app alert presentation queue (no API or business records)', () => {
  it('provides a Vietnamese acknowledgement without changing explicit buttons', () => {
    const store = createAppAlertStore();
    store.alert('Thông báo', 'Nội dung');
    assert.equal(store.getSnapshot().queue[0].buttons[0].text, 'Đã hiểu');
    store.press(store.getSnapshot().queue[0].id, 0);
    const buttons = [{ text: 'Giữ nguyên' }];
    store.alert('Tiêu đề', 'Nội dung', buttons);
    buttons[0].text = 'Đã thay ở caller';
    assert.equal(store.getSnapshot().queue[0].buttons[0].text, 'Giữ nguyên');
  });

  it('keeps distinct dialogs in FIFO order', () => {
    const store = createAppAlertStore();
    store.alert('Một'); store.alert('Hai');
    assert.deepEqual(store.getSnapshot().queue.map(item => item.title), ['Một', 'Hai']);
    store.press(store.getSnapshot().queue[0].id, 0);
    assert.equal(store.getSnapshot().queue[0].title, 'Hai');
  });

  it('removes a dialog before a callback opens another dialog', () => {
    const store = createAppAlertStore();
    store.alert('Xác nhận', '', [{ text: 'Tiếp tục', onPress: () => store.alert('Kết quả') }]);
    store.press(store.getSnapshot().queue[0].id, 0);
    assert.equal(store.getSnapshot().queue.length, 1);
    assert.equal(store.getSnapshot().queue[0].title, 'Kết quả');
  });

  it('executes a destructive callback once despite duplicate or stale presses', () => {
    const store = createAppAlertStore(); let count = 0;
    store.alert('Xác nhận', '', [{ text: 'Hủy', style: 'cancel' },
      { text: 'Xác nhận', style: 'destructive', onPress: () => { count++; } }]);
    const id = store.getSnapshot().queue[0].id;
    store.press(id, 1); store.press(id, 1);
    store.alert('Tiếp theo', '', [{ text: 'Đồng ý', onPress: () => { count += 10; } }]);
    store.press(id, 0);
    assert.equal(count, 1);
    assert.equal(store.getSnapshot().queue[0].title, 'Tiếp theo');
  });

  it('cancel button invokes only its own callback, never confirmation or onDismiss', () => {
    const store = createAppAlertStore(); let cancel = 0, confirm = 0, dismiss = 0;
    store.alert('Xác nhận', '', [{ text: 'Hủy', style: 'cancel', onPress: () => { cancel++; } },
      { text: 'Đồng ý', onPress: () => { confirm++; } }], { onDismiss: () => { dismiss++; } });
    store.press(store.getSnapshot().queue[0].id, 0);
    assert.deepEqual([cancel, confirm, dismiss], [1, 0, 0]);
  });

  it('backdrop/back/escape cannot dismiss a noncancelable request', () => {
    for (const options of [undefined, { cancelable: false }]) {
      const store = createAppAlertStore(); store.alert('Bắt buộc', '', undefined, options);
      store.dismiss(store.getSnapshot().queue[0].id);
      assert.equal(store.getSnapshot().queue.length, 1);
    }
  });

  it('explicit dismissal calls onDismiss exactly once and never a button', () => {
    const store = createAppAlertStore(); let dismissed = 0, pressed = 0;
    store.alert('Thông báo', '', [{ text: 'Đồng ý', onPress: () => { pressed++; } }],
      { cancelable: true, onDismiss: () => { dismissed++; } });
    const id = store.getSnapshot().queue[0].id;
    store.dismiss(id); store.dismiss(id);
    assert.deepEqual([dismissed, pressed, store.getSnapshot().queue.length], [1, 0, 0]);
  });

  it('does not accumulate identical informational alerts from repeated events', () => {
    const store = createAppAlertStore();
    store.alert('Thông báo', 'Nội dung'); store.alert('Thông báo', 'Nội dung');
    assert.equal(store.getSnapshot().queue.length, 1);
    store.alert('Thông báo', 'Nội dung khác');
    assert.equal(store.getSnapshot().queue.length, 2);
  });

  it('preserves separate callbacks even when visible copy matches', () => {
    const store = createAppAlertStore();
    store.alert('Thông báo', '', [{ text: 'OK', onPress: () => {} }]);
    store.alert('Thông báo', '', [{ text: 'OK', onPress: () => {} }]);
    assert.equal(store.getSnapshot().queue.length, 2);
  });

  it('hands pending content between modal hosts and root without losing it', () => {
    const store = createAppAlertStore(); store.alert('Nội dung đang mở');
    const request = store.getSnapshot().queue[0];
    const closeForm = store.registerHost('form'), closePicker = store.registerHost('picker');
    assert.equal(store.getSnapshot().hosts.at(-1), 'picker');
    closePicker(); assert.equal(store.getSnapshot().hosts.at(-1), 'form');
    closeForm(); assert.equal(store.getSnapshot().hosts.at(-1), undefined);
    assert.equal(store.getSnapshot().queue[0], request);
  });

  it('can unsubscribe and keeps snapshots stable until a real change', () => {
    const store = createAppAlertStore(); let events = 0;
    const before = store.getSnapshot(), unsubscribe = store.subscribe(() => { events++; });
    assert.equal(store.getSnapshot(), before);
    store.alert('Thông báo'); unsubscribe(); store.alert('Khác');
    assert.equal(events, 1);
  });

  it('cannot keep a closed confirmation alive when its callback throws', () => {
    const store = createAppAlertStore();
    store.alert('Thông báo', '', [{ text: 'OK', onPress: () => { throw new Error('callback'); } }]);
    assert.throws(() => store.press(store.getSnapshot().queue[0].id, 0), /callback/);
    assert.equal(store.getSnapshot().queue.length, 0);
  });

  it('infers decorative tones without adding a business status', () => {
    assert.equal(appAlertTone('Thành công', false), 'success');
    assert.equal(appAlertTone('Không có số điện thoại', false), 'danger');
    assert.equal(appAlertTone('Thông báo', false), 'info');
    assert.equal(appAlertTone('Xác nhận', true), 'warning');
  });
});
