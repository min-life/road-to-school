'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import { User, Role } from '@/lib/types';
import { authStorage } from '@/lib/auth-storage';
import { apiClient } from '@/lib/api-client';
import { RoleSplash } from './role-splash';
import { toast } from '@/stores/toast-store';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [splashRole, setSplashRole] = useState<Role | null>(null);
  const router = useRouter();

  // Khôi phục phiên làm việc khi người dùng mở hoặc tải lại trang
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      // 1. Kiểm tra cặp token trong localStorage
      if (!authStorage.hasTokens()) {
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      // 2. Sử dụng cached user nếu có để tránh giật giao diện
      const cachedUser = authStorage.getUser();
      if (cachedUser && isMounted) {
        setUser(cachedUser);
      }

      // 3. Xác thực phiên làm việc trực tiếp với Backend
      try {
        const currentUser = await apiClient.getMe();
        if (isMounted) {
          setUser(currentUser);
          authStorage.setUser(currentUser);
        }
      } catch {
        // Nếu lỗi 401 hoặc token không còn hợp lệ, apiClient đã tự động dọn dẹp storage
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    // Đăng ký listener xử lý sự kiện hết hạn phiên
    const unsubscribe = apiClient.onUnauthorized(() => {
      if (isMounted) {
        toast.dismissAll();
        setUser(null);
        router.push('/login');
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [router]);

  const login = useCallback(
    async (identifier: string, password: string): Promise<User> => {
      const response = await apiClient.loginWeb({ identifier, password });

      // Lưu trữ token và thông tin người dùng an toàn vào localStorage
      authStorage.setTokens(response.accessToken, response.refreshToken);
      authStorage.setUser(response.user);
      setUser(response.user);

      // Kích hoạt Role Splash sau khi đăng nhập thủ công thành công
      setSplashRole(response.user.role);

      return response.user;
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiClient.logout();
    } catch {
      // Bỏ qua lỗi mạng khi logout, luôn bảo đảm dọn dẹp client state
      authStorage.clear();
    } finally {
      toast.dismissAll();
      setUser(null);
      router.push('/login');
    }
  }, [router]);

  const handleSplashFinish = useCallback(() => {
    setSplashRole(null);
    router.push('/admin');
  }, [router]);

  const value = {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    login,
    logout,
    setUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {splashRole && (
        <RoleSplash role={splashRole} onFinish={handleSplashFinish} />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
