import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import * as SecureStore from 'expo-secure-store';
import { useRootNavigationState, useRouter, useSegments, type Href } from 'expo-router';
import { useAuth } from './auth-context';
import { notificationApi, type NotificationSummary } from '../services/notifications';
import { createRefreshLoop } from '../utils/refresh-loop';
import { subscribeNotificationRefresh } from '../utils/notification-refresh';

type PushModule = typeof import('expo-notifications');

// As of Expo SDK 53+, expo-notifications push tokens & native subscription modules
// are not supported in Expo Go and will throw "Cannot find native module 'ExpoTopicSubscriptionModule'".
// We detect Expo Go defensively and disable native push integration to prevent runtime crashes.
const inExpoGo = (() => {
  try {
    return (
      isRunningInExpoGo() ||
      Constants.appOwnership === 'expo' ||
      Constants.executionEnvironment === 'storeClient'
    );
  } catch {
    return true;
  }
})();

const nativePush = Platform.OS !== 'web' && !inExpoGo;

interface ContextValue {
  summary: NotificationSummary | null;
  refresh: () => void;
  enablePush: () => Promise<void>;
  disablePush: () => Promise<void>;
  pushStatus: string;
  open: (id: string) => Promise<void>;
  navigationPending: boolean;
}

const Context = createContext<ContextValue | null>(null);
const preferenceKey = (userId: string) => `rts_push_disabled_${userId}`;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user, isLoading, splashRole } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const root = useRootNavigationState();
  const identity = `${user?.id ?? ''}:${user?.role ?? ''}`;
  const identityRef = useRef(identity);
  identityRef.current = identity;

  const [stored, setStored] = useState<{ identity: string; value: NotificationSummary } | null>(null);
  const [pushStatus, setPushStatus] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pushInitialized, setPushInitialized] = useState(!nativePush);
  const sdk = useRef<PushModule | null>(null);
  const loop = useRef<ReturnType<typeof createRefreshLoop> | null>(null);
  const opening = useRef(false);
  const pendingAttempt = useRef<string | null>(null);
  const registration = useRef<Promise<void> | null>(null);
  const projectId =
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId ??
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

  const refresh = useCallback(() => loop.current?.refresh(), []);

  useEffect(() => {
    if (!user) return;
    const poll = createRefreshLoop(async ({ isCurrent }) => {
      try {
        const value = await notificationApi.summary();
        if (isCurrent()) setStored({ identity, value });
      } catch {
        if (isCurrent()) setStored(null);
      }
    }, 15000);
    loop.current = poll;
    poll.setActive(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', state => poll.setActive(state === 'active'));
    const unsubscribe = subscribeNotificationRefresh(() => {
      if (AppState.currentState === 'active') poll.refresh();
    });
    return () => {
      unsubscribe();
      subscription.remove();
      poll.stop();
      if (loop.current === poll) loop.current = null;
    };
  }, [identity, user?.id]);

  const registerToken = useCallback(
    async (module: PushModule, scope: string, userId: string) => {
      if (!projectId || typeof projectId !== 'string') {
        setPushStatus('Chưa cấu hình thông báo đẩy');
        return;
      }
      if ((await SecureStore.getItemAsync(preferenceKey(userId))) === '1') return;
      if (Platform.OS === 'android' && typeof module.setNotificationChannelAsync === 'function') {
        try {
          await module.setNotificationChannelAsync('operations', {
            name: 'Vận hành chuyến xe',
            importance: module.AndroidImportance?.DEFAULT ?? 3,
          });
        } catch {}
      }
      if (typeof module.getExpoPushTokenAsync !== 'function') return;
      const token = await module.getExpoPushTokenAsync({ projectId });
      if (identityRef.current !== scope || (await SecureStore.getItemAsync(preferenceKey(userId))) === '1') return;
      const task = notificationApi.register(token.data, userId).then(() => {
        if (identityRef.current === scope) setPushStatus('Đã bật thông báo đẩy');
      });
      registration.current = task;
      try {
        await task;
      } finally {
        if (registration.current === task) registration.current = null;
      }
    },
    [projectId]
  );

  useEffect(() => {
    if (!nativePush) {
      setPushInitialized(true);
      return;
    }
    let cancelled = false;
    const subscriptions: { remove: () => void }[] = [];
    void import('expo-notifications')
      .then(async module => {
        if (cancelled || !module) return;
        sdk.current = module;
        if (typeof module.setNotificationHandler === 'function') {
          module.setNotificationHandler({
            handleNotification: async () => ({
              shouldShowBanner: false,
              shouldShowList: true,
              shouldPlaySound: false,
              shouldSetBadge: false,
            }),
          });
        }
        const receive = (response: any) => {
          const id = response?.notification?.request?.content?.data?.notificationId;
          if (typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)) setPendingId(id);
        };
        if (typeof module.addNotificationReceivedListener === 'function') {
          subscriptions.push(module.addNotificationReceivedListener(refresh));
        }
        if (typeof module.addNotificationResponseReceivedListener === 'function') {
          subscriptions.push(module.addNotificationResponseReceivedListener(receive));
        }
        if (typeof module.getLastNotificationResponseAsync === 'function') {
          const last = await module.getLastNotificationResponseAsync();
          if (!cancelled && last) receive(last);
        }
      })
      .catch(() => {
        if (!cancelled) setPushStatus('Chưa cấu hình thông báo đẩy');
      })
      .finally(() => {
        if (!cancelled) setPushInitialized(true);
      });
    return () => {
      cancelled = true;
      subscriptions.forEach(subscription => {
        try {
          subscription?.remove?.();
        } catch {}
      });
    };
  }, [refresh]);

  useEffect(() => {
    if (!user || !nativePush || !pushInitialized || !sdk.current) return;
    const module = sdk.current;
    const scope = identity;
    const userId = user.id;
    let cancelled = false;

    const register = async () => {
      try {
        if (typeof module.getPermissionsAsync === 'function') {
          const perm = await module.getPermissionsAsync();
          if (perm?.granted && !cancelled) await registerToken(module, scope, userId);
        }
      } catch {
        if (!cancelled) setPushStatus('Chưa thể bật thông báo đẩy');
      }
    };
    void register();

    let subscription: { remove: () => void } | undefined;
    if (typeof module.addPushTokenListener === 'function') {
      try {
        subscription = module.addPushTokenListener(() => {
          void register();
        });
      } catch {}
    }

    return () => {
      cancelled = true;
      try {
        subscription?.remove?.();
      } catch {}
    };
  }, [identity, user?.id, pushInitialized, registerToken]);

  const open = useCallback(
    async (id: string) => {
      if (opening.current || !user || isLoading || splashRole) return;
      const scope = identity;
      opening.current = true;
      try {
        const target = await notificationApi.target(id);
        if (identityRef.current !== scope) return;
        await notificationApi.read(id);
        refresh();
        if (identityRef.current !== scope) return;
        if (
          !target.available ||
          !target.mobilePath ||
          !/^\/(trip|incidents|leave-notices|parent|\(tabs\))\//.test(target.mobilePath)
        ) {
          Alert.alert('Thông báo', 'Nội dung không còn khả dụng');
          return;
        }
        router.push(target.mobilePath as Href);
      } catch (cause) {
        if (identityRef.current === scope)
          Alert.alert('Thông báo', cause instanceof Error ? cause.message : 'Không thể mở thông báo');
      } finally {
        opening.current = false;
      }
    },
    [user?.id, isLoading, splashRole, identity, refresh, router]
  );

  useEffect(() => {
    if (
      !pendingId ||
      pendingAttempt.current === pendingId ||
      !pushInitialized ||
      !root?.key ||
      !user ||
      isLoading ||
      splashRole ||
      segments[0] === '(auth)' ||
      opening.current
    )
      return;
    const id = pendingId;
    pendingAttempt.current = id;
    void open(id).finally(() => {
      setPendingId(current => (current === id ? null : current));
      pendingAttempt.current = null;
      if (typeof sdk.current?.clearLastNotificationResponseAsync === 'function') {
        void sdk.current.clearLastNotificationResponseAsync().catch(() => {});
      }
    });
  }, [pendingId, pushInitialized, root?.key, user?.id, isLoading, splashRole, segments[0], open]);

  const enablePush = useCallback(async () => {
    if (!user) return;
    if (!nativePush || !sdk.current) {
      Alert.alert(
        'Thông báo',
        inExpoGo
          ? 'Tính năng thông báo đẩy yêu cầu bản cài đặt riêng (Development Build/APK), không hỗ trợ trên ứng dụng Expo Go. Bạn vẫn nhận được thông báo mới nhất qua đồng bộ trong ứng dụng.'
          : 'Cần bản ứng dụng có hỗ trợ thông báo đẩy.'
      );
      return;
    }
    try {
      if (Platform.OS === 'android' && typeof sdk.current.setNotificationChannelAsync === 'function') {
        await sdk.current.setNotificationChannelAsync('operations', {
          name: 'Vận hành chuyến xe',
          importance: sdk.current.AndroidImportance?.DEFAULT ?? 3,
        });
      }
      if (typeof sdk.current.requestPermissionsAsync !== 'function') return;
      const permission = await sdk.current.requestPermissionsAsync();
      if (!permission.granted) {
        setPushStatus('Chưa cho phép thông báo đẩy');
        return;
      }
      await SecureStore.deleteItemAsync(preferenceKey(user.id));
      await registerToken(sdk.current, identity, user.id);
    } catch {
      setPushStatus('Chưa thể bật thông báo đẩy');
    }
  }, [user?.id, identity, registerToken]);

  const disablePush = useCallback(async () => {
    if (!user) return;
    await SecureStore.setItemAsync(preferenceKey(user.id), '1');
    await registration.current?.catch(() => {});
    await notificationApi.unregister();
    setPushStatus('Đã tắt thông báo đẩy trên thiết bị');
  }, [user?.id]);

  return (
    <Context.Provider
      value={{
        summary: stored?.identity === identity ? stored.value : null,
        refresh,
        enablePush,
        disablePush,
        pushStatus,
        open,
        navigationPending: !pushInitialized || !!pendingId,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useNotifications() {
  const value = useContext(Context);
  if (!value) throw new Error('Missing NotificationsProvider');
  return value;
}
