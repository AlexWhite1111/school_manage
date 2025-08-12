import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { ensureDecidedApiBaseUrl, getDecidedApiBaseUrlSync, clearDecidedApiBaseUrlCache } from '@/lib/apiDiscovery';

// 创建axios实例（初始用同步可得的baseURL，占位，随后在请求拦截器里确保发现）
const apiClient: AxiosInstance = axios.create({
  baseURL: getDecidedApiBaseUrlSync() || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 自动添加认证头部
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // 确保首个请求也使用已探测的可用后端
    let decided = getDecidedApiBaseUrlSync();
    if (!decided) {
      decided = await ensureDecidedApiBaseUrl();
    }
    if (decided) {
      apiClient.defaults.baseURL = decided;
      if (!config.baseURL) config.baseURL = decided;
    }

    // 附加认证头
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
  async (error) => {
    // 若是网络异常或瞬时错误，尝试自动故障切换一次
    const probeStatus: number | undefined = error?.response?.status;
    const code: string | undefined = error?.code;
    const isNetworkOrTransient = !error.response || code === 'ECONNABORTED' || (probeStatus !== undefined && [502, 503, 504].includes(probeStatus));
    const originalConfig = (error?.config || {}) as InternalAxiosRequestConfig & { _retriedWithFallback?: boolean };

    if (isNetworkOrTransient && !originalConfig._retriedWithFallback) {
      try {
        clearDecidedApiBaseUrlCache();
        const newBase = await ensureDecidedApiBaseUrl();
        apiClient.defaults.baseURL = newBase;
        originalConfig.baseURL = newBase;
        originalConfig._retriedWithFallback = true;
        return apiClient.request(originalConfig);
      } catch (_) {
        // 忽略，继续走统一错误处理
      }
    }

    // 处理401未授权错误（登录/注册等认证接口不触发整页跳转，避免闪屏）
    if (error.response?.status === 401) {
      const requestUrl: string = error.config?.url ?? '';
      const isAuthEndpoint =
        requestUrl.startsWith('/auth/login') ||
        requestUrl.startsWith('/auth/register') ||
        requestUrl.startsWith('/auth/forgot-password') ||
        requestUrl.startsWith('/auth/reset-password');

      if (!isAuthEndpoint) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }
      // 对登录/注册接口，直接把错误抛给调用方处理（在页面内提示，不重定向）
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
    const { status: responseStatus, data } = error.response;
    let errorMessage = '服务异常，请稍后重试';
    
    switch (responseStatus) {
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
        errorMessage = data?.message || `请求失败 (${responseStatus})`;
    }
    
    return Promise.reject({
      message: errorMessage,
      code: responseStatus,
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