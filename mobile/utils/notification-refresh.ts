const listeners = new Set<() => void>();
export function invalidateNotifications() { listeners.forEach(listener => listener()); }
export function subscribeNotificationRefresh(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
