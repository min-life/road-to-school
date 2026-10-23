import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  mobileApiClient,
  User,
  Role,
  ApiError,
  AuthResponse,
  MessageResponse,
} from '../services/api-client';
import { tokenStorage } from '../services/token-storage';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isNetworkError: boolean;
  sessionExpiredMessage: string | null;
  splashRole: Role | null;
  login: (identifier: string, password: string) => Promise<User>;
  registerRequestOtp: (identifier: string) => Promise<MessageResponse>;
  registerVerify: (data: {
    identifier: string;
    otp: string;
    fullName: string;
    password: string;
    confirmPassword: string;
  }) => Promise<User>;
  forgotPasswordRequestOtp: (identifier: string) => Promise<MessageResponse>;
  resetPassword: (data: {
    identifier: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<MessageResponse>;
  logout: () => Promise<void>;
  retryConnection: () => Promise<void>;
  clearSessionExpired: () => void;
  onSplashFinish: () => void;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);
  const [splashRole, setSplashRole] = useState<Role | null>(null);

  /**
   * Khôi phục phiên làm việc khi khởi động ứng dụng (Application Startup)
   */
  const restoreSession = useCallback(async () => {
    setIsLoading(true);
    setIsNetworkError(false);

    try {
      const hasTokens = await tokenStorage.hasTokenPair();
      if (!hasTokens) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Xác thực phiên với Backend
      const currentUser = await mobileApiClient.getMe();
      setUser(currentUser);
      setIsNetworkError(false);
    } catch (err: any) {
      if (err instanceof ApiError && err.statusCode === 0) {
        // Lỗi mạng tạm thời: Giữ nguyên Token trong SecureStore, hiển thị trạng thái kết nối
        setIsNetworkError(true);
      } else {
        // Phiên bị thu hồi hoặc hết hạn
        await tokenStorage.clearTokenPair();
        setUser(null);
        setSessionExpiredMessage('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();

    // Lắng nghe thông báo khi phiên bị hết hạn trong quá trình sử dụng
    const unsubscribe = mobileApiClient.onUnauthorized(() => {
      setUser(null);
      setSessionExpiredMessage('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    });

    return () => {
      unsubscribe();
    };
  }, [restoreSession]);

  /**
   * Đăng nhập thủ công trên Mobile
   */
  const login = useCallback(
    async (identifier: string, password: string): Promise<User> => {
      const res: AuthResponse = await mobileApiClient.mobileLogin({
        identifier,
        password,
      });

      // Lưu Token Pair an toàn vào SecureStore
      await tokenStorage.setTokenPair({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
      });

      setUser(res.user);
      setIsNetworkError(false);
      setSessionExpiredMessage(null);

      // Kích hoạt Role Splash 1.2s cho đăng nhập thủ công
      setSplashRole(res.user.role);

      return res.user;
    },
    [],
  );

  /**
   * Yêu cầu mã OTP Đăng ký Phụ huynh
   */
  const registerRequestOtp = useCallback(
    async (identifier: string): Promise<MessageResponse> => {
      return mobileApiClient.registerRequestOtp({ identifier });
    },
    [],
  );

  /**
   * Xác thực OTP, tạo tài khoản Phụ huynh và Tự động đăng nhập
   */
  const registerVerify = useCallback(
    async (data: {
      identifier: string;
      otp: string;
      fullName: string;
      password: string;
      confirmPassword: string;
    }): Promise<User> => {
      const res: AuthResponse = await mobileApiClient.registerVerify(data);

      await tokenStorage.setTokenPair({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
      });

      setUser(res.user);
      setIsNetworkError(false);
      setSessionExpiredMessage(null);

      // Theo quy tắc Stage B/C5: Không hiển thị Role Splash sau khi tự động đăng nhập từ đăng ký
      setSplashRole(null);

      return res.user;
    },
    [],
  );

  /**
   * Yêu cầu mã OTP Quên mật khẩu
   */
  const forgotPasswordRequestOtp = useCallback(
    async (identifier: string): Promise<MessageResponse> => {
      return mobileApiClient.forgotPasswordRequestOtp({ identifier });
    },
    [],
  );

  /**
   * Đặt lại mật khẩu trực tiếp qua OTP
   */
  const resetPassword = useCallback(
    async (data: {
      identifier: string;
      otp: string;
      newPassword: string;
      confirmPassword: string;
    }): Promise<MessageResponse> => {
      return mobileApiClient.resetPassword(data);
    },
    [],
  );

  /**
   * Đăng xuất: Thu hồi phiên trên backend và xóa sạch SecureStore
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      await mobileApiClient.logout();
    } catch {
      await tokenStorage.clearTokenPair();
    } finally {
      setUser(null);
      setSplashRole(null);
    }
  }, []);

  const retryConnection = useCallback(async (): Promise<void> => {
    await restoreSession();
  }, [restoreSession]);

  const clearSessionExpired = useCallback(() => {
    setSessionExpiredMessage(null);
  }, []);

  const onSplashFinish = useCallback(() => {
    setSplashRole(null);
  }, []);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const updated = await mobileApiClient.getMe();
      setUser(updated);
      return updated;
    } catch {
      return null;
    }
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    isNetworkError,
    sessionExpiredMessage,
    splashRole,
    login,
    registerRequestOtp,
    registerVerify,
    forgotPasswordRequestOtp,
    resetPassword,
    logout,
    retryConnection,
    clearSessionExpired,
    onSplashFinish,
    setUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
