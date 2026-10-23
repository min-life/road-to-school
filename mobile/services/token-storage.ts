import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_PAIR_KEY = 'r2s_mobile_token_pair';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Quản lý lưu trữ bảo mật cặp Token (Access Token và Refresh Token)
 * trên iOS Keychain và Android Keystore/EncryptedSharedPreferences.
 */
class TokenStorage {
  private memoryTokens: TokenPair | null = null;

  /**
   * Lưu trữ cặp Token nguyên tử vào SecureStore
   */
  async setTokenPair(tokens: TokenPair): Promise<void> {
    this.memoryTokens = tokens;
    const serialized = JSON.stringify(tokens);

    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          localStorage.setItem(TOKEN_PAIR_KEY, serialized);
        }
        return;
      }

      await SecureStore.setItemAsync(TOKEN_PAIR_KEY, serialized, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    } catch {
      // Giữ bản sao trong bộ nhớ nếu thiết bị gặp lỗi I/O
    }
  }

  /**
   * Đọc cặp Token từ SecureStore
   */
  async getTokenPair(): Promise<TokenPair | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem(TOKEN_PAIR_KEY);
          return raw ? (JSON.parse(raw) as TokenPair) : null;
        }
        return this.memoryTokens;
      }

      const raw = await SecureStore.getItemAsync(TOKEN_PAIR_KEY);
      if (!raw) return this.memoryTokens;

      const parsed = JSON.parse(raw) as TokenPair;
      if (parsed.accessToken && parsed.refreshToken) {
        this.memoryTokens = parsed;
        return parsed;
      }
      return null;
    } catch {
      return this.memoryTokens;
    }
  }

  /**
   * Xóa sạch cặp Token khỏi SecureStore khi đăng xuất hoặc hết hạn phiên
   */
  async clearTokenPair(): Promise<void> {
    this.memoryTokens = null;

    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(TOKEN_PAIR_KEY);
        }
        return;
      }

      await SecureStore.deleteItemAsync(TOKEN_PAIR_KEY);
    } catch {
      // Bỏ qua lỗi xóa nếu khóa không tồn tại
    }
  }

  /**
   * Kiểm tra xem có Token Pair hợp lệ hay không
   */
  async hasTokenPair(): Promise<boolean> {
    const pair = await this.getTokenPair();
    return Boolean(pair?.accessToken && pair?.refreshToken);
  }
}

export const tokenStorage = new TokenStorage();
