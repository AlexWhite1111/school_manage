// src/stores/authStore.ts: 使用Zustand管理全局用户认证信息、Token和用户资料
import { create } from 'zustand';
import type { User } from '@/api/authApi';

interface AuthState {
  token: string | null;
  user: User | null;
  // 状态标识
  isLoading: boolean;
  isInitialized: boolean;

  setToken: (token: string) => void;
  setUser: (user: AuthState['user']) => void;
  // 原子性设置认证数据
  setAuthData: (token: string, user: AuthState['user']) => void;
  clearAuth: () => void;
  // 加载/初始化状态更新
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  // 添加原子性的登录方法
  login: (token: string, user: AuthState['user']) => void;
  logout: () => void;
  // 便捷检查函数
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoading: false,
  isInitialized: false,
  setToken: (token) => set({ token }),
  setUser: (user) => set({ user }),
  setAuthData: (token, user) => {
    // 同时更新内存状态和localStorage
    set({ token, user });
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  },
  clearAuth: () => {
    set({ token: null, user: null });
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  },
  setLoading: (isLoading) => set({ isLoading }),
  setInitialized: (isInitialized) => set({ isInitialized }),
  // 原子性地同时设置token和user
  login: (token, user) => {
    get().setAuthData(token, user);
  },
  logout: () => {
    get().clearAuth();
  },
  isAuthenticated: () => {
    const { token, user } = get();
    return !!(token && user);
  },
})); 