import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import * as authApi from '@/api/authApi';
import type { User } from '@/api/authApi';

/**
 * 重构后的认证状态管理Hook
 * 解决时序问题，提供可靠的认证状态管理
 */
export const useAuth = () => {
  const {
    token,
    user,
    isLoading,
    isInitialized,
    login: storeLogin,
    logout: storeLogout,
    setLoading,
    setInitialized,
    isAuthenticated: checkAuthenticated,
    clearAuth
  } = useAuthStore();

  // 计算认证状态
  const isAuthenticated = checkAuthenticated();

  // 应用初始化：尝试从localStorage恢复认证状态
  useEffect(() => {
    const initializeAuth = async () => {
      if (isInitialized) {
        return; // 已经初始化过了
      }

      console.log('🔄 开始认证初始化...');
      setLoading(true);

      try {
        const savedToken = localStorage.getItem('auth_token');
        const savedUserStr = localStorage.getItem('auth_user');

        if (!savedToken || !savedUserStr) {
          console.log('📂 localStorage中无认证信息');
          setInitialized(true);
          setLoading(false);
          return;
        }

        // 验证保存的数据格式
        let savedUser;
        try {
          savedUser = JSON.parse(savedUserStr);
          if (!savedUser.id || !savedUser.username) {
            throw new Error('用户数据格式无效');
          }
        } catch (error) {
          console.error('❌ localStorage用户数据格式错误:', error);
          clearAuth();
          setInitialized(true);
          setLoading(false);
          return;
        }

        console.log('📂 找到localStorage认证信息，验证token有效性...');

        // 验证token是否仍然有效
        try {
          // 先设置token以便API调用
          useAuthStore.getState().setAuthData(savedToken, savedUser);
          
          // 调用API验证token
          const currentUser = await authApi.getCurrentUser();
          
          // 如果API调用成功，说明token有效，更新用户信息
          console.log('✅ Token验证成功，用户信息已更新');
          storeLogin(savedToken, currentUser);
          
        } catch (error: any) {
          console.log('❌ Token验证失败，清除认证信息:', error.message);
          clearAuth();
        }

      } catch (error) {
        console.error('❌ 认证初始化异常:', error);
        clearAuth();
      } finally {
        setInitialized(true);
        setLoading(false);
        console.log('✅ 认证初始化完成');
      }
    };

    initializeAuth();
  }, [isInitialized, storeLogin, clearAuth, setLoading, setInitialized]);

  // 简化的登录函数
  const login = async (username: string, password: string): Promise<void> => {
    console.log('🔐 开始登录:', username);
    setLoading(true);

    try {
      // 调用登录API
      const loginResponse = await authApi.login({ username, password });
      console.log('📡 登录API调用成功');

      const token = loginResponse.token;

      // 先保存 token，避免后续 /users/me 请求缺少 Authorization 头部导致 401
      // 使用一个最小占位用户对象，补齐必要字段，待会儿用真实数据覆盖
      useAuthStore.getState().setAuthData(token, {
        id: -1,
        uuid: '',
        username,
        role: 'STUDENT',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as unknown as User);

      // 获取用户信息
      const userInfo = await authApi.getCurrentUser();
      console.log('👤 用户信息获取成功:', userInfo.username);

      // 原子性设置认证状态（覆盖占位用户）
      storeLogin(token, userInfo);
      
      console.log('✅ 登录完成');
    } catch (error: any) {
      console.error('❌ 登录失败:', error);
      clearAuth();
      throw error; // 向上抛出错误，让调用方处理
    } finally {
      setLoading(false);
    }
  };

  // 简化的登出函数
  const logout = async (): Promise<void> => {
    console.log('👋 开始登出');
    setLoading(true);

    try {
      // 如果有token，调用登出API
      if (token) {
        try {
          await authApi.logout();
          console.log('📡 登出API调用成功');
        } catch (error) {
          console.warn('⚠️ 登出API调用失败，继续清理本地状态:', error);
        }
      }
    } finally {
      // 无论API调用是否成功，都清理本地状态
      storeLogout();
      setLoading(false);
      console.log('✅ 登出完成');
    }
  };

  return {
    // 状态
    user,
    token,
    isAuthenticated,
    isLoading,
    isInitialized,

    // 方法
    login,
    logout
  };
}; 