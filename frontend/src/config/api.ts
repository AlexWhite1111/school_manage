// API配置 - 支持运行时与环境变量覆盖
const runtimeConfigBase = (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__?.apiBaseUrl) as
  | string
  | undefined;
const injectedBase = (typeof window !== 'undefined' && (window as any).__APP_API_BASE__) as
  | string
  | undefined;
// 优先级：runtime-config.js > 预加载注入 > Vite环境变量 > 默认localhost
export const API_BASE_URL =
  runtimeConfigBase || injectedBase || (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const APP_CONFIG = {
  name: '自然教育',
  version: '1.0.0',
  apiBaseUrl: API_BASE_URL,
  timeout: 10000
};

// 统一返回（移动端/桌面端通过 VITE_API_BASE_URL 或运行时注入覆盖）
export const getApiBaseUrl = () => API_BASE_URL;