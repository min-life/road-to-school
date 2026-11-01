import { createAppAlertStore } from '@/utils/app-alert-store';

export const appAlertStore = createAppAlertStore();
/** Explicit replacement for app-owned Alert.alert calls; native APIs are never patched. */
export const AppAlert = { alert: appAlertStore.alert };
