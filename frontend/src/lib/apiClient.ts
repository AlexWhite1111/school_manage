import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuthStore } from '@/stores/authStore';

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 自动添加认证头部
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    console.log('🔍 apiClient请求拦截器 - URL:', config.url, 'Token存在:', !!token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ 已添加Authorization头部');
    } else {
      console.log('⚠️ 没有token，跳过Authorization头部');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 统一错误处理
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    // 处理401未授权错误
    if (error.response?.status === 401) {
      // 清除认证信息并跳转到登录页
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    
    // 处理网络错误
    if (!error.response) {
      console.error('Network Error:', error.message);
      return Promise.reject({
        message: '网络连接异常，请检查您的网络并稍后重试',
        code: 'NETWORK_ERROR'
      });
    }
    
    // 处理服务器错误
    const { status, data } = error.response;
    let errorMessage = '服务异常，请稍后重试';
    
    switch (status) {
      case 400:
        errorMessage = data?.message || '请求参数错误';
        break;
      case 403:
        errorMessage = '权限不足';
        break;
      case 404:
        errorMessage = '请求的资源不存在';
        break;
      case 500:
        errorMessage = '服务器内部错误';
        break;
      default:
        errorMessage = data?.message || `请求失败 (${status})`;
    }
    
    return Promise.reject({
      message: errorMessage,
      code: status,
      data: data
    });
  }
);

// 通用API响应类型
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success?: boolean;
}

// 通用API错误类型
export interface ApiError {
  message: string;
  code: string | number;
  data?: any;
}

export default apiClient; 