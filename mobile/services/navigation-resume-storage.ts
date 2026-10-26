import * as SecureStore from 'expo-secure-store';

// A launch hint only. Session, enabled flag and target are always revalidated by the server.
const key = (userId: string) => `rts.navigation.trip.${userId}`;
export const navigationResumeStorage = {
  get: (userId: string) => SecureStore.getItemAsync(key(userId)),
  remember: (userId: string, tripId: string) => SecureStore.setItemAsync(key(userId), tripId),
  clear: (userId: string) => SecureStore.deleteItemAsync(key(userId)),
};
