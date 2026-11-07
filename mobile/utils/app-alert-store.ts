import type { AlertButton, AlertOptions } from 'react-native';

export type AppAlertRequest = {
  id: number;
  title: string;
  message?: string;
  buttons: readonly AlertButton[];
  options: AlertOptions;
};

/** Presentation queue only. Dismissing never confirms an action. */
export function createAppAlertStore() {
  let nextId = 0;
  let snapshot: { queue: readonly AppAlertRequest[]; hosts: readonly string[] } = { queue: [], hosts: [] };
  const listeners = new Set<() => void>();
  const publish = (next: typeof snapshot) => {
    snapshot = next;
    listeners.forEach(listener => listener());
  };
  const current = (id: number) => snapshot.queue[0]?.id === id ? snapshot.queue[0] : undefined;
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
      // Camera/polling callbacks may repeat the same alert before it is acknowledged.
      if (snapshot.queue.some(item => item.title === title && item.message === message
        && item.options.onDismiss === options?.onDismiss && item.options.cancelable === options?.cancelable
        && item.buttons.length === (buttons?.length || 1)
        && item.buttons.every((button, index) => buttons?.length
          ? button.text === buttons[index].text && button.style === buttons[index].style && button.onPress === buttons[index].onPress
          : button.text === 'Đã hiểu' && !button.onPress))) return;
      const request: AppAlertRequest = { id: ++nextId, title, message,
        buttons: buttons?.length ? buttons.map(button => ({ ...button })) : [{ text: 'Đã hiểu' }],
        options: { ...options } };
      publish({ ...snapshot, queue: [...snapshot.queue, request] });
    },
    press(id: number, index: number) {
      const request = current(id), button = request?.buttons[index];
      if (!request || !button) return;
      publish({ ...snapshot, queue: snapshot.queue.slice(1) });
      button.onPress?.();
    },
    dismiss(id: number) {
      const request = current(id);
      if (!request || request.options.cancelable !== true) return;
      publish({ ...snapshot, queue: snapshot.queue.slice(1) });
      request.options.onDismiss?.();
    },
    registerHost(id: string) {
      publish({ ...snapshot, hosts: [...snapshot.hosts, id] });
      return () => publish({ ...snapshot, hosts: snapshot.hosts.filter(host => host !== id) });
    },
  };
}

export type AppAlertTone = 'info' | 'success' | 'danger' | 'warning';

/** Chooses decoration only; no title, message, callback or business state is changed. */
export function appAlertTone(title: string, destructive: boolean): AppAlertTone {
  if (destructive) return 'warning';
  if (/thành công|đã gửi|đã hoàn tất|đã hủy/iu.test(title)) return 'success';
  if (/lỗi|không|thất bại|hết hạn/iu.test(title)) return 'danger';
  if (/lưu ý|bắt buộc|quá lớn/iu.test(title)) return 'warning';
  return 'info';
}
