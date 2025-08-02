import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeState = {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
};

// 检查用户系统偏好
const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: prefersDarkMode ? 'dark' : 'light',
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'app-theme-storage', // localStorage 中的 key
    }
  )
); 